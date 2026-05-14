import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAccountEmailStats } from "@/lib/features/emails/service";
import { getAccountById } from "@/lib/features/accounts/service";

/**
 * @openapi
 * /api/v1/accounts/{id}/stats:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: Get account email statistics
 *     description: |
 *       Retrieve email statistics for a specific account.
 *       
 *       **Statistics Include:**
 *       - Total email count
 *       - Unread email count
 *       - Emails received in last 24 hours
 *       - Emails received in last 7 days
 *       - Last sync timestamp
 *       
 *       **Use Cases:**
 *       - Monitor account activity
 *       - Display email counts in UI
 *       - Track sync status
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
 *         description: Account email statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountId:
 *                   type: string
 *                 email:
 *                   type: string
 *                 lastSyncedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 totalEmails:
 *                   type: integer
 *                 unreadEmails:
 *                   type: integer
 *                 last24Hours:
 *                   type: integer
 *                 last7Days:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    const stats = await getAccountEmailStats(ctx.params.id);
    return ok({ accountId: ctx.params.id, email: account.email, lastSyncedAt: account.lastSyncedAt, ...stats });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });
