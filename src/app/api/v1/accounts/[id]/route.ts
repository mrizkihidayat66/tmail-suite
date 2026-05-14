import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { getAccountById, updateAccount, softDeleteAccount } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const updateSchema = z.object({
  displayName: z.string().max(200, "Display name too long").nullable().optional(),
  label: z.string().max(100, "Label too long").nullable().optional(),
  notes: z.string().max(1000, "Notes too long").nullable().optional(),
  ttlHours: z.number().int().min(0).max(8760, "TTL too long (max 1 year)").optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/v1/accounts/{id}:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: Get account by ID
 *     description: |
 *       Retrieve detailed information about a specific temporary email account.
 *       
 *       **Response:**
 *       - Returns complete account details
 *       - Includes email statistics
 *       - Shows expiration status
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
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 label:
 *                   type: string
 *                 notes:
 *                   type: string
 *                 ttlHours:
 *                   type: integer
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 isActive:
 *                   type: boolean
 *                 emailCount:
 *                   type: integer
 *                 lastSyncedAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const GET = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    return ok(account);
  } catch (e) {
    return handleError(e);
  }
});

/**
 * @openapi
 * /api/v1/accounts/{id}:
 *   patch:
 *     tags:
 *       - Accounts
 *     summary: Update account
 *     description: |
 *       Update account settings and metadata.
 *       
 *       **Updatable Fields:**
 *       - Display name, label, notes
 *       - TTL (time-to-live) hours
 *       - Active status
 *       
 *       **Note:**
 *       - Cannot update email or username
 *       - TTL update recalculates expiration date
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 maxLength: 200
 *                 nullable: true
 *                 description: Display name
 *               label:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *                 description: Label for organization
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 description: Additional notes
 *               ttlHours:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 8760
 *                 description: Time-to-live in hours
 *               isActive:
 *                 type: boolean
 *                 description: Active status
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 label:
 *                   type: string
 *                 notes:
 *                   type: string
 *                 ttlHours:
 *                   type: integer
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 isActive:
 *                   type: boolean
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const body = updateSchema.parse(await req.json());
    const account = await updateAccount(ctx.params.id, body);
    return ok(account);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });

/**
 * @openapi
 * /api/v1/accounts/{id}:
 *   delete:
 *     tags:
 *       - Accounts
 *     summary: Delete account
 *     description: |
 *       Soft delete a temporary email account.
 *       
 *       **Behavior:**
 *       - Performs soft delete (sets deletedAt timestamp)
 *       - Account data retained for audit purposes
 *       - Account excluded from list queries
 *       - Creates audit log entry
 *       
 *       **Note:**
 *       - Associated emails are not deleted
 *       - Account can be restored by clearing deletedAt
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
 *       204:
 *         description: Account deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const DELETE = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const account = await getAccountById(ctx.params.id);
    await softDeleteAccount(ctx.params.id);

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.delete",
      targetType: "account",
      targetId: ctx.params.id,
      targetName: account.email,
    });

    return noContent();
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
