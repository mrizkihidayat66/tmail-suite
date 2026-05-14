import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { getEmailById, deleteEmail, markEmailRead } from "@/lib/features/emails/service";

const patchSchema = z.object({
  seen: z.boolean(),
});

/**
 * @openapi
 * /api/v1/accounts/{id}/emails/{emailId}:
 *   get:
 *     tags:
 *       - Emails
 *     summary: Get email by ID
 *     description: |
 *       Retrieve detailed information about a specific email.
 *       
 *       **Response:**
 *       - Returns complete email details
 *       - Includes full email body (HTML and plain text)
 *       - Shows all headers and metadata
 *       - Lists attachments if any
 *       
 *       **Note:**
 *       - Does not automatically mark email as read
 *       - Use PATCH endpoint to update read status
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
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email ID
 *     responses:
 *       200:
 *         description: Email details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 gmailMessageId:
 *                   type: string
 *                 subject:
 *                   type: string
 *                 from:
 *                   type: string
 *                 to:
 *                   type: string
 *                 cc:
 *                   type: string
 *                 bcc:
 *                   type: string
 *                 replyTo:
 *                   type: string
 *                 bodyHtml:
 *                   type: string
 *                   description: HTML email body
 *                 bodyText:
 *                   type: string
 *                   description: Plain text email body
 *                 snippet:
 *                   type: string
 *                 receivedAt:
 *                   type: string
 *                   format: date-time
 *                 seen:
 *                   type: boolean
 *                 hasAttachments:
 *                   type: boolean
 *                 attachments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       mimeType:
 *                         type: string
 *                       size:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    const email = await getEmailById(ctx.params.id, ctx.params.emailId);
    return ok(email);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });

/**
 * @openapi
 * /api/v1/accounts/{id}/emails/{emailId}:
 *   patch:
 *     tags:
 *       - Emails
 *     summary: Update email read status
 *     description: |
 *       Mark email as read or unread.
 *       
 *       **Behavior:**
 *       - Updates email's seen flag
 *       - Does not sync back to Gmail
 *       - Local status only
 *       
 *       **Use Cases:**
 *       - Mark email as read after viewing
 *       - Mark email as unread for follow-up
 *       - Bulk mark operations
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
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seen
 *             properties:
 *               seen:
 *                 type: boolean
 *                 description: Read status (true = read, false = unread)
 *     responses:
 *       200:
 *         description: Email status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());
    await markEmailRead(ctx.params.id, ctx.params.emailId, body.seen);
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });

/**
 * @openapi
 * /api/v1/accounts/{id}/emails/{emailId}:
 *   delete:
 *     tags:
 *       - Emails
 *     summary: Delete email
 *     description: |
 *       Permanently delete an email from the database.
 *       
 *       **Behavior:**
 *       - Hard delete (permanent removal)
 *       - Email data cannot be recovered
 *       - Does not delete from Gmail
 *       - Local deletion only
 *       
 *       **Note:**
 *       - This only removes email from TMail Suite database
 *       - Original email remains in Gmail inbox
 *       - Next sync will not re-fetch deleted emails
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
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email ID
 *     responses:
 *       204:
 *         description: Email deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const DELETE = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string; emailId: string }>): Promise<NextResponse> => {
  try {
    await deleteEmail(ctx.params.id, ctx.params.emailId);
    return noContent();
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
