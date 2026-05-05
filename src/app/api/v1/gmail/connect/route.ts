import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthorizationUrl } from "@/lib/features/gmail/client";
import { verifySession } from "@/lib/core/auth";

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
