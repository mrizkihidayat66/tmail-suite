import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { NotFoundError } from "@/lib/core/errors";

const patchSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    const updated = await db.domain.update({ where: { id: ctx.params.id }, data: body });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    await db.domain.delete({ where: { id: ctx.params.id } });
    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
