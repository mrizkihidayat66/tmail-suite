import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { getAccountById, updateAccount, softDeleteAccount } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const updateSchema = z.object({
  displayName: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  ttlHours: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    return ok(account);
  } catch (e) {
    return handleError(e);
  }
});

export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const body = updateSchema.parse(await req.json());
    const account = await updateAccount(ctx.params.id, body);
    return ok(account);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    await softDeleteAccount(ctx.params.id);

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.delete",
      targetType: "account",
      targetId: ctx.params.id,
      targetName: account.email,
    });

    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
