import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { revokeApiKey } from "@/lib/features/api-keys/service";
import { NotFoundError } from "@/lib/core/errors";
import { writeAuditLog } from "@/lib/features/admin/service";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const key = await db.apiKey.findUnique({ where: { id: ctx.params.id } });
    if (!key) throw new NotFoundError("API key");

    const body = updateSchema.parse(await req.json());
    const updated = await db.apiKey.update({ where: { id: ctx.params.id }, data: body });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:write"] });

export const DELETE = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const key = await db.apiKey.findUnique({ where: { id: ctx.params.id } });
    if (!key) throw new NotFoundError("API key");

    await revokeApiKey(ctx.params.id);

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "api_key.revoke",
      targetType: "api_key",
      targetId: ctx.params.id,
      targetName: key.name,
    });

    return noContent();
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:write"] });
