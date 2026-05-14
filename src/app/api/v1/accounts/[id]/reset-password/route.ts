import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { resetAccountPassword } from "@/lib/features/accounts/service";

/**
 * @openapi
 * /api/v1/accounts/{id}/reset-password:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Reset account password
 *     description: |
 *       Generate and set a new random password for the account.
 *       
 *       **Behavior:**
 *       - Generates secure random password
 *       - Updates password hash in database
 *       - Returns new plain text password (only time it's visible)
 *       
 *       **Security:**
 *       - Password meets complexity requirements
 *       - Old password immediately invalidated
 *       - New password only returned once
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 password:
 *                   type: string
 *                   description: New plain text password
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const POST = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const { account, plainPassword } = await resetAccountPassword(ctx.params.id);
    return ok({ ...account, password: plainPassword });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
