import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { getEmailById, deleteEmail, markEmailRead } from "@/lib/features/emails/service";

const patchSchema = z.object({
  seen: z.boolean(),
});

export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    const email = await getEmailById(ctx.params.id, ctx.params.emailId);
    return ok(email);
  } catch (e) {
    return handleError(e);
  }
});

export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());
    await markEmailRead(ctx.params.id, ctx.params.emailId, body.seen);
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    await deleteEmail(ctx.params.id, ctx.params.emailId);
    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
