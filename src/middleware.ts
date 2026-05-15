import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/v1/auth/login",
  "/api/v1/gmail/callback",
  "/api/v1/domains",
  "/api/openapi",
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

/**
 * Check if request has authentication credentials (cookie OR Bearer token)
 * Middleware checks for PRESENCE, route handlers validate VALIDITY
 */
function hasAuthCredentials(req: NextRequest): boolean {
  // Check for session cookie
  if (req.cookies.get("token")?.value) {
    return true;
  }

  // Check for API key Bearer token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer tm_")) {
    return true;
  }

  return false;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"));
  if (isPublic) {
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
    return res;
  }

  // Check for authentication credentials (cookie OR Bearer token)
  if (!hasAuthCredentials(req)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
