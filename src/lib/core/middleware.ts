import { NextRequest, NextResponse } from "next/server";
import { verifySession, SessionPayload } from "./auth";
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

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>
) {
  return async (req: NextRequest, ctx: { params?: P } = {}): Promise<NextResponse> => {
    try {
      const token = req.cookies.get("token")?.value;
      if (!token) throw new UnauthorizedError();
      const session = await verifySession(token);
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
