import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getRecentEmails } from "@/lib/features/emails/service";

/**
 * @openapi
 * /api/v1/emails/recent:
 *   get:
 *     tags:
 *       - Emails
 *     summary: Get recent emails across all accounts
 *     description: |
 *       Retrieve most recent emails across all accounts.
 *       
 *       **Features:**
 *       - Returns emails from all accounts
 *       - Ordered by received date (newest first)
 *       - Configurable limit (max 100)
 *       - Useful for dashboard overview
 *       
 *       **Response:**
 *       - Returns list of recent emails
 *       - Includes account information
 *       - Shows email metadata and snippet
 *       
 *       **Use Cases:**
 *       - Dashboard recent activity
 *       - Quick overview of all accounts
 *       - Monitoring new emails
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of emails to return
 *     responses:
 *       200:
 *         description: List of recent emails
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
 *                       accountId:
 *                         type: string
 *                       accountEmail:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       from:
 *                         type: string
 *                       snippet:
 *                         type: string
 *                       receivedAt:
 *                         type: string
 *                         format: date-time
 *                       seen:
 *                         type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const emails = await getRecentEmails(session.sub, limit);
    return ok({ emails });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["emails:read"] });
