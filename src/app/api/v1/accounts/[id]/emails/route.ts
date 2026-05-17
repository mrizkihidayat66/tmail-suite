import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { listEmails } from "@/lib/features/emails/service";
import { getAccountById } from "@/lib/features/accounts/service";

export const GET = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    await getAccountById(ctx.params.id);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const unread = searchParams.get("unread") === "true" ? true : undefined;
    const subject = searchParams.get("subject") ?? undefined;
    const fromAddress = searchParams.get("from") ?? undefined;

    const result = await listEmails(ctx.params.id, { page, limit, unread, subject, fromAddress });
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });
