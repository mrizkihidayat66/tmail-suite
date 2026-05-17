import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { exchangeCodeForTokens, createOAuth2Client } from "@/lib/features/gmail/client";
import { db } from "@/lib/core/db";

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
