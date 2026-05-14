import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { revealApiKey } from "@/lib/features/api-keys/service";

/**
 * @openapi
 * /api/v1/api-keys/{id}/reveal:
 *   get:
 *     tags:
 *       - API Keys
 *     summary: Reveal API key value
 *     description: |
 *       Decrypt and return the full API key value.
 *       
 *       **Security Warning:**
 *       - Returns decrypted key value
 *       - Use only when absolutely necessary
 *       - Ensure secure transmission (HTTPS)
 *       - Consider rotating key after reveal
 *       
 *       **Use Cases:**
 *       - Key lost or forgotten
 *       - Verify key value
 *       - Emergency access recovery
 *       
 *       **Best Practices:**
 *       - Avoid revealing keys in production
 *       - Use rotate endpoint instead if compromised
 *       - Log and audit all reveal operations
 *       - Require additional authentication if possible
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
 *       200:
 *         description: API key value revealed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   description: Full decrypted API key value
 *                   example: tm_1234567890abcdef1234567890abcdef
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const rawKey = await revealApiKey(ctx.params.id);
    return ok({ key: rawKey });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:read"] });
