import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { created, handleError } from "@/lib/core/response";
import { rotateApiKey } from "@/lib/features/api-keys/service";
import { parseJsonSafe } from "@/lib/shared/utils";

/**
 * @openapi
 * /api/v1/api-keys/{id}/rotate:
 *   post:
 *     tags:
 *       - API Keys
 *     summary: Rotate API key
 *     description: |
 *       Generate new key value while preserving key metadata.
 *       
 *       **Behavior:**
 *       - Generates new random key value
 *       - Preserves name, description, scopes, expiration
 *       - Old key immediately invalidated
 *       - New key returned in response
 *       - Resets usage statistics
 *       
 *       **Use Cases:**
 *       - Key compromised or exposed
 *       - Regular security rotation
 *       - Key leaked in logs or code
 *       
 *       **Security:**
 *       - New key returned only once
 *       - Store new key securely
 *       - Update all systems using old key
 *       - Old key stops working immediately
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
 *       201:
 *         description: API key rotated successfully
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
 *                 keyPrefix:
 *                   type: string
 *                 scopes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 isActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 key:
 *                   type: string
 *                   description: New API key value (only returned once)
 *                   example: tm_1234567890abcdef1234567890abcdef
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const POST = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const { key, rawKey } = await rotateApiKey(ctx.params.id, session.sub);
    return created({
      ...key,
      scopes: parseJsonSafe<string[]>(key.scopes, ["*"]),
      key: rawKey,
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:write"] });
