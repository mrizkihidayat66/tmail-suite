import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAccountById } from "@/lib/features/accounts/service";
import { pollAndProcess } from "@/lib/features/gmail/processor";

export const POST = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    await getAccountById(ctx.params.id);
    const result = await pollAndProcess();
    return ok({ message: "Sync triggered", ...result });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
