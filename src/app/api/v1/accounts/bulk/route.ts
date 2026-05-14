import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { bulkCreateAccounts } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const schema = z.object({
  count: z.number().int().min(1).max(100, "Cannot create more than 100 accounts at once").default(1),
  ttlHours: z.number().int().min(0).max(8760, "TTL too long (max 1 year)").default(24),
  label: z.string().max(100, "Label too long").optional(),
  domain: z.string().max(253, "Domain too long").optional(),
  usernamePattern: z.enum([
    "random", "en", "id", "zh", "ja",
  ]).default("random"),
  fixedPassword: z.string().min(8).max(128, "Password too long").optional(),
  passwordOptions: z.object({
    length: z.number().int().min(8).max(64).default(16),
    includeSymbols: z.boolean().default(true),
    includeNumbers: z.boolean().default(true),
    includeUppercase: z.boolean().default(true),
  }).optional(),
});

/**
 * @openapi
 * /api/v1/accounts/bulk:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Bulk create accounts
 *     description: |
 *       Create multiple temporary email accounts in a single request.
 *       
 *       **Features:**
 *       - Create up to 100 accounts at once
 *       - All accounts share same settings (TTL, label, domain)
 *       - Option for fixed password or auto-generated per account
 *       - Configurable password generation options
 *       - Returns both successful and failed creations
 *       
 *       **Audit:**
 *       - Creates single audit log entry with bulk statistics
 *       - Records requested count, created count, and failed count
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 1
 *                 description: Number of accounts to create
 *               ttlHours:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 8760
 *                 default: 24
 *                 description: Time-to-live in hours for all accounts
 *               label:
 *                 type: string
 *                 maxLength: 100
 *                 description: Label for all accounts
 *               domain:
 *                 type: string
 *                 maxLength: 253
 *                 description: Domain for all accounts
 *               usernamePattern:
 *                 type: string
 *                 enum: [random, en, id, zh, ja]
 *                 default: random
 *                 description: Username generation pattern
 *               fixedPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Use same password for all accounts
 *               passwordOptions:
 *                 type: object
 *                 description: Password generation options (if fixedPassword not provided)
 *                 properties:
 *                   length:
 *                     type: integer
 *                     minimum: 8
 *                     maximum: 64
 *                     default: 16
 *                   includeSymbols:
 *                     type: boolean
 *                     default: true
 *                   includeNumbers:
 *                     type: boolean
 *                     default: true
 *                   includeUppercase:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       201:
 *         description: Accounts created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       username:
 *                         type: string
 *                       password:
 *                         type: string
 *                       label:
 *                         type: string
 *                       ttlHours:
 *                         type: integer
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   description: Number of accounts created
 *                 failures:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                       error:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const POST = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const body = schema.parse(await req.json());
    const { results, failures } = await bulkCreateAccounts(body.count, {
      ttlHours: body.ttlHours,
      label: body.label,
      usernamePattern: body.usernamePattern,
      fixedPassword: body.fixedPassword,
      passwordOptions: body.passwordOptions,
      domain: body.domain,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.bulk_create",
      metadata: { requested: body.count, created: results.length, failed: failures.length, label: body.label },
    });

    return created({
      accounts: results.map(({ account, plainPassword }) => ({
        ...account,
        password: plainPassword,
      })),
      count: results.length,
      failures,
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write", "accounts:bulk"] });
