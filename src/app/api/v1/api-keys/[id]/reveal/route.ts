import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { revealApiKey } from "@/lib/features/api-keys/service";

export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const rawKey = await revealApiKey(ctx.params.id);
    return ok({ key: rawKey });
  } catch (e) {
    return handleError(e);
  }
});
