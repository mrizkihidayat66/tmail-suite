import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { pollAndProcess } from "@/lib/features/gmail/processor";

/**
 * @openapi
 * /api/v1/admin/sync-all:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Trigger Gmail sync for all accounts
 *     description: |
 *       Manually trigger Gmail synchronization for all active accounts.
 *       
 *       **Sync Process:**
 *       - Polls Gmail API for all active accounts
 *       - Fetches new emails since last sync
 *       - Updates email database
 *       - Updates account lastSyncedAt timestamp
 *       
 *       **Behavior:**
 *       - Runs asynchronously
 *       - Respects Gmail API rate limits
 *       - Skips inactive accounts
 *       - Handles errors gracefully per account
 *       
 *       **Use Cases:**
 *       - Manual sync trigger
 *       - Testing sync functionality
 *       - Recovery from sync failures
 *       - Immediate email fetch
 *       
 *       **Note:**
 *       - Does not wait for completion
 *       - Returns immediately with sync status
 *       - Check account stats for sync results
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
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
 *                 accountsProcessed:
 *                   type: integer
 *                   description: Number of accounts queued for sync
 *                 emailsFetched:
 *                   type: integer
 *                   description: Total emails fetched
 *                 errors:
 *                   type: integer
 *                   description: Number of accounts with errors
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const POST = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const result = await pollAndProcess();
    return ok({ message: "Sync triggered", ...result });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
