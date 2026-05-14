import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { deactivateExpiredAccounts } from "@/lib/features/gmail/processor";

/**
 * @openapi
 * /api/v1/admin/cleanup:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Cleanup expired accounts
 *     description: |
 *       Deactivate accounts that have expired.
 *       
 *       **Cleanup Process:**
 *       - Finds accounts past expiration date
 *       - Sets isActive to false
 *       - Preserves account data for audit
 *       - Does not delete emails or history
 *       
 *       **Expiration Logic:**
 *       - Checks expiresAt field
 *       - Only affects active accounts
 *       - Skips already inactive accounts
 *       
 *       **Use Cases:**
 *       - Scheduled maintenance
 *       - Manual cleanup trigger
 *       - Compliance enforcement
 *       - Resource management
 *       
 *       **Note:**
 *       - Safe to run multiple times
 *       - Idempotent operation
 *       - Returns count of deactivated accounts
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deactivated:
 *                   type: integer
 *                   description: Number of accounts deactivated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const POST = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const count = await deactivateExpiredAccounts();
    return ok({ deactivated: count });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
