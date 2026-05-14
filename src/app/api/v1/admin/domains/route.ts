import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

const createSchema = z.object({
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
    ),
  isActive: z.boolean().default(true),
});

/**
 * @openapi
 * /api/v1/admin/domains:
 *   get:
 *     tags:
 *       - Admin
 *       - Domains
 *     summary: List all domains (admin)
 *     description: |
 *       Retrieve list of all domains including inactive ones.
 *       
 *       **Admin Endpoint:**
 *       - Returns all domains (active and inactive)
 *       - Includes full domain metadata
 *       - No pagination (typically small list)
 *       
 *       **Difference from /api/v1/domains:**
 *       - Includes inactive domains
 *       - Requires admin:* scope
 *       - More detailed information
 *       
 *       **Use Cases:**
 *       - Domain management UI
 *       - Domain configuration
 *       - Audit and reporting
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of all domains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       domain:
 *                         type: string
 *                         example: example.com
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const domains = await db.domain.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok({ domains });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });

/**
 * @openapi
 * /api/v1/admin/domains:
 *   post:
 *     tags:
 *       - Admin
 *       - Domains
 *     summary: Create domain
 *     description: |
 *       Add a new domain to the system.
 *       
 *       **Domain Validation:**
 *       - Valid domain format (e.g., example.com)
 *       - Length: 3-253 characters
 *       - No consecutive dots or hyphens
 *       - Each label max 63 characters
 *       - Lowercase only
 *       
 *       **Validation Rules:**
 *       - Must be valid DNS domain format
 *       - Cannot start/end with dot or hyphen
 *       - Must have valid TLD (.com, .org, etc.)
 *       - Duplicate domains rejected
 *       
 *       **Use Cases:**
 *       - Add new email domain
 *       - Configure custom domains
 *       - Multi-tenant setup
 *       
 *       **Note:**
 *       - Domain automatically lowercased
 *       - Active by default
 *       - No DNS verification (manual setup)
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *             properties:
 *               domain:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 253
 *                 pattern: '^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[-a-z0-9]{1,63})*\.[a-z]{2,}$'
 *                 description: Domain name (lowercase)
 *                 example: example.com
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Domain active status
 *     responses:
 *       201:
 *         description: Domain created successfully
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
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const domain = await db.domain.create({ data: body });
    return created(domain);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
