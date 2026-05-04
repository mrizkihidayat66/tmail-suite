import { NextRequest, NextResponse } from "next/server";
import { verifySession, SessionPayload } from "./auth";
import { verifyApiKey } from "@/lib/features/api-keys/service";
import { handleError } from "./response";
import { UnauthorizedError } from "./errors";

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: P;
};

type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  session: SessionPayload,
  ctx: RouteContext<P>
) => Promise<NextResponse>;

async function resolveAuth(req: NextRequest): Promise<SessionPayload> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer tm_")) {
    const rawKey = authHeader.slice(7);
    const key = await verifyApiKey(rawKey);
    if (!key) throw new UnauthorizedError("Invalid or expired API key");
    return { sub: key.createdById, username: `apikey:${key.keyPrefix}` };
  }

  const token = req.cookies.get("token")?.value;
  if (!token) throw new UnauthorizedError();
  return verifySession(token);
}

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>
) {
  return async (req: NextRequest, ctx: { params?: P } = {}): Promise<NextResponse> => {
    try {
      const session = await resolveAuth(req);
      return await handler(req, session, { params: ctx.params ?? ({} as P) });
    } catch (error) {
      return handleError(error);
    }
  };
}

export function withErrorHandler(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params?: Record<string, string> } = {}): Promise<NextResponse> => {
    try {
      return await handler(req, { params: ctx.params ?? {} });
    } catch (error) {
      return handleError(error);
    }
  };
}
