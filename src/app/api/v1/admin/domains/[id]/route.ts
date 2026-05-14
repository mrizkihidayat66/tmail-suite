import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { NotFoundError } from "@/lib/core/errors";

const patchSchema = z.object({
  domain: z.string()
    .min(3, "Domain too short")
    .max(253, "Domain too long (max 253 characters)")
    .toLowerCase()
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/,
      "Invalid domain format. Must be a valid domain name (e.g., example.com)"
    )
    .refine(
      (val) => {
        // Prevent consecutive dots
        if (val.includes("..")) return false;
        // Prevent starting/ending with dot or hyphen
        if (val.startsWith(".") || val.endsWith(".")) return false;
        if (val.startsWith("-") || val.endsWith("-")) return false;
        // Each label must be <= 63 characters
        return val.split(".").every(label => label.length <= 63 && label.length > 0);
      },
      { message: "Invalid domain structure" }
    )
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/v1/admin/domains/{id}:
 *   patch:
 *     tags:
 *       - Admin
 *       - Domains
 *     summary: Update domain
 *     description: |
 *       Update domain configuration.
 *       
 *       **Updatable Fields:**
 *       - Domain name (with validation)
 *       - Active status (enable/disable)
 *       
 *       **Domain Validation:**
 *       - Same rules as domain creation
 *       - Valid domain format required
 *       - Length: 3-253 characters
 *       - Lowercase only
 *       
 *       **Use Cases:**
 *       - Fix domain typos
 *       - Enable/disable domains
 *       - Domain migration
 *       
 *       **Note:**
 *       - Changing domain affects all accounts
 *       - Disabling domain doesn't delete accounts
 *       - Accounts keep existing email addresses
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 253
 *                 pattern: '^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[-a-z0-9]{1,63})*\.[a-z]{2,}$'
 *                 description: New domain name
 *               isActive:
 *                 type: boolean
 *                 description: Enable/disable domain
 *     responses:
 *       200:
 *         description: Domain updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 domain:
 *                   type: string
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
    const body = patchSchema.parse(await req.json());
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    const updated = await db.domain.update({ where: { id: ctx.params.id }, data: body });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });

/**
 * @openapi
 * /api/v1/admin/domains/{id}:
 *   delete:
 *     tags:
 *       - Admin
 *       - Domains
 *     summary: Delete domain
 *     description: |
 *       Permanently delete a domain from the system.
 *       
 *       **Deletion Behavior:**
 *       - Hard delete (permanent removal)
 *       - Domain record removed from database
 *       - Cannot be undone
 *       
 *       **Impact:**
 *       - Accounts with this domain remain
 *       - Email addresses keep domain reference
 *       - May cause validation issues
 *       
 *       **Recommendation:**
 *       - Use PATCH to set isActive=false instead
 *       - Only delete if domain was added by mistake
 *       - Ensure no accounts use this domain
 *       
 *       **Use Cases:**
 *       - Remove test domains
 *       - Clean up typos
 *       - Remove unused domains
 *       
 *       **Warning:**
 *       - Check for dependent accounts first
 *       - Consider soft delete (isActive=false)
 *       - Backup before deletion
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain ID
 *     responses:
 *       204:
 *         description: Domain deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const DELETE = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    await db.domain.delete({ where: { id: ctx.params.id } });
    return noContent();
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
