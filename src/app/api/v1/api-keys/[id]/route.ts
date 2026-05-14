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

/**
 * @openapi
 * /api/v1/api-keys/{id}:
 *   patch:
 *     tags:
 *       - API Keys
 *     summary: Update API key
 *     description: |
 *       Update API key metadata and settings.
 *       
 *       **Updatable Fields:**
 *       - Name and description
 *       - Active status (enable/disable)
 *       
 *       **Note:**
 *       - Cannot update scopes or expiration
 *       - Cannot update revoked keys
 *       - Key value cannot be changed (use rotate)
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: New name
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: New description
 *               isActive:
 *                 type: boolean
 *                 description: Enable/disable key
 *     responses:
 *       200:
 *         description: API key updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @openapi
 * /api/v1/api-keys/{id}:
 *   delete:
 *     tags:
 *       - API Keys
 *     summary: Revoke API key
 *     description: |
 *       Revoke (permanently disable) an API key.
 *       
 *       **Behavior:**
 *       - Sets revokedAt timestamp
 *       - Key immediately stops working
 *       - Cannot be un-revoked
 *       - Key excluded from list queries
 *       - Creates audit log entry
 *       
 *       **Security:**
 *       - Revoked keys cannot authenticate
 *       - All active sessions invalidated
 *       - Key data retained for audit
 *       
 *       **Note:**
 *       - This is permanent - create new key if needed
 *       - Use isActive=false for temporary disable
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     responses:
 *       204:
 *         description: API key revoked successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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
