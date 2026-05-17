import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAccountEmailStats } from "@/lib/features/emails/service";
import { getAccountById } from "@/lib/features/accounts/service";

export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    const stats = await getAccountEmailStats(ctx.params.id);
    return ok({ accountId: ctx.params.id, email: account.email, lastSyncedAt: account.lastSyncedAt, ...stats });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });
