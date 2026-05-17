import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { resetAccountPassword } from "@/lib/features/accounts/service";

export const POST = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const { account, plainPassword } = await resetAccountPassword(ctx.params.id);
    return ok({ ...account, password: plainPassword });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
