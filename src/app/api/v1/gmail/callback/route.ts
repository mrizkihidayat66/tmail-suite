import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { exchangeCodeForTokens, createOAuth2Client } from "@/lib/features/gmail/client";
import { db } from "@/lib/core/db";

/**
 * @openapi
 * /api/v1/gmail/callback:
 *   get:
 *     tags:
 *       - Gmail
 *     summary: Gmail OAuth callback handler
 *     description: |
 *       Handle OAuth 2.0 callback from Google.
 *       
 *       **Callback Flow:**
 *       1. Validates state token (CSRF protection)
 *       2. Exchanges authorization code for tokens
 *       3. Retrieves user email from Google
 *       4. Stores tokens in database
 *       5. Sets catchall email configuration
 *       6. Redirects to settings page
 *       
 *       **Token Storage:**
 *       - Access token (short-lived)
 *       - Refresh token (long-lived)
 *       - Token expiration timestamp
 *       - OAuth scopes granted
 *       
 *       **Security:**
 *       - State parameter validation
 *       - CSRF protection via cookie
 *       - Secure token storage
 *       - httpOnly cookies
 *       
 *       **Error Handling:**
 *       - Invalid state: redirects with error
 *       - Missing code: redirects with error
 *       - Token exchange failure: redirects with error
 *       - All errors logged to console
 *       
 *       **Note:**
 *       - This is a redirect endpoint (302)
 *       - Called by Google OAuth service
 *       - Not meant for direct API calls
 *       - Clears oauth_state cookie after use
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State token for CSRF validation
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if user denied access
 *     responses:
 *       302:
 *         description: Redirect to settings page
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /dashboard/settings?gmail_connected=1
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: Clears oauth_state cookie
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqUrl = new URL(req.url);
  const hostHeader = req.headers.get("host");
  const base = hostHeader
    ? `${reqUrl.protocol}//${hostHeader}`
    : reqUrl.origin;

  const code = reqUrl.searchParams.get("code");
  const error = reqUrl.searchParams.get("error");
  const stateParam = reqUrl.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${base}/dashboard/settings?gmail_error=${encodeURIComponent(error)}`);
  }

  const storedState = req.cookies.get("oauth_state")?.value;
  if (!stateParam || !storedState || stateParam !== storedState) {
    return NextResponse.redirect(`${base}/dashboard/settings?gmail_error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${base}/dashboard/settings?gmail_error=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Incomplete token response from Google");
    }

    const client = await createOAuth2Client();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      throw new Error("Could not retrieve email from Google");
    }

    await db.gmailToken.upsert({
      where: { userEmail: userInfo.email },
      create: {
        userEmail: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
        scope: tokens.scope ?? "",
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
        scope: tokens.scope ?? "",
      },
    });

    await db.appConfig.upsert({
      where: { key: "gmail_catchall_email" },
      create: { key: "gmail_catchall_email", value: userInfo.email },
      update: { value: userInfo.email },
    });

    const res = NextResponse.redirect(`${base}/dashboard/settings?gmail_connected=1`);
    res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.redirect(`${base}/dashboard/settings?gmail_error=${encodeURIComponent(msg)}`);
  }
}
