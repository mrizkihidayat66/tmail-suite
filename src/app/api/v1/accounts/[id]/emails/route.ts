import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { listEmails } from "@/lib/features/emails/service";
import { getAccountById } from "@/lib/features/accounts/service";

/**
 * @openapi
 * /api/v1/accounts/{id}/emails:
 *   get:
 *     tags:
 *       - Emails
 *     summary: List emails for account
 *     description: |
 *       Retrieve paginated list of emails for a specific account.
 *       
 *       **Query Parameters:**
 *       - `page`: Page number (default: 1)
 *       - `limit`: Items per page (default: 20, max: 100)
 *       - `unread`: Filter unread emails only (true/false)
 *       - `subject`: Filter by subject (partial match)
 *       - `from`: Filter by sender email address
 *       
 *       **Response:**
 *       - Returns paginated list of emails
 *       - Includes email metadata (subject, from, to, date)
 *       - Shows read/unread status
 *       - Ordered by received date (newest first)
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: Filter unread emails only
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject (partial match)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter by sender email address
 *     responses:
 *       200:
 *         description: List of emails with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       gmailMessageId:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       from:
 *                         type: string
 *                       to:
 *                         type: string
 *                       snippet:
 *                         type: string
 *                       receivedAt:
 *                         type: string
 *                         format: date-time
 *                       seen:
 *                         type: boolean
 *                       hasAttachments:
 *                         type: boolean
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const GET = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    await getAccountById(ctx.params.id);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const unread = searchParams.get("unread") === "true" ? true : undefined;
    const subject = searchParams.get("subject") ?? undefined;
    const fromAddress = searchParams.get("from") ?? undefined;

    const result = await listEmails(ctx.params.id, { page, limit, unread, subject, fromAddress });
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });
