import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAccountById } from "@/lib/features/accounts/service";
import { pollAndProcess } from "@/lib/features/gmail/processor";

/**
 * @openapi
 * /api/v1/accounts/{id}/sync:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Trigger email sync for account
 *     description: |
 *       Manually trigger Gmail sync to fetch new emails for the account.
 *       
 *       **Behavior:**
 *       - Validates account exists
 *       - Triggers Gmail polling and processing
 *       - Fetches new emails from Gmail
 *       - Updates account's lastSyncedAt timestamp
 *       
 *       **Response:**
 *       - Returns sync result with statistics
 *       - Includes number of emails processed
 *       - Shows any errors encountered
 *       
 *       **Note:**
 *       - Requires Gmail integration to be configured
 *       - May take several seconds to complete
 *       - Rate limited by Gmail API quotas
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
 *         description: Sync triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sync triggered
 *                 processed:
 *                   type: integer
 *                   description: Number of emails processed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Any errors encountered
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const POST = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    await getAccountById(ctx.params.id);
    const result = await pollAndProcess();
    return ok({ message: "Sync triggered", ...result });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
