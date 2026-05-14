import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthorizationUrl } from "@/lib/features/gmail/client";
import { verifySession } from "@/lib/core/auth";

/**
 * @openapi
 * /api/v1/gmail/connect:
 *   get:
 *     tags:
 *       - Gmail
 *     summary: Initiate Gmail OAuth connection
 *     description: |
 *       Start Gmail OAuth 2.0 authorization flow.
 *       
 *       **OAuth Flow:**
 *       1. Generates random state token for CSRF protection
 *       2. Redirects to Google OAuth consent screen
 *       3. User grants Gmail API permissions
 *       4. Google redirects to callback endpoint
 *       
 *       **Required Permissions:**
 *       - Gmail API read access
 *       - User email address
 *       - Offline access (refresh token)
 *       
 *       **Session Required:**
 *       - Must be authenticated with valid session
 *       - Redirects to /login if not authenticated
 *       
 *       **State Management:**
 *       - State token stored in httpOnly cookie
 *       - Expires in 10 minutes
 *       - Validated in callback endpoint
 *       
 *       **Error Handling:**
 *       - Missing config: redirects to settings with error
 *       - Invalid session: redirects to login
 *       
 *       **Note:**
 *       - This is a redirect endpoint (302)
 *       - Not a JSON API endpoint
 *       - Use in browser context only
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: https://accounts.google.com/o/oauth2/v2/auth?...
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: oauth_state cookie for CSRF protection
 *       401:
 *         description: Not authenticated - redirect to login
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await verifySession(token);
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const state = crypto.randomBytes(24).toString("base64url");
    const url = await getAuthorizationUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "config_missing";
    return NextResponse.redirect(new URL(`/dashboard/settings?gmail_error=${encodeURIComponent(msg)}`, req.url));
  }
}
