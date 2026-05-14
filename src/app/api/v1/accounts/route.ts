import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { createAccount } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const createSchema = z.object({
  username: z.string().min(1).max(100, "Username too long").optional(),
  customPassword: z.string().min(8).max(128, "Password too long").optional(),
  displayName: z.string().max(200, "Display name too long").optional(),
  ttlHours: z.number().int().min(0).max(8760, "TTL too long (max 1 year)").default(24),
  label: z.string().max(100, "Label too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  domain: z.string().max(253, "Domain too long").optional(),
  usernamePattern: z.enum([
    "random", "en", "id", "zh", "ja",
  ]).default("random"),
});

/**
 * @openapi
 * /api/v1/accounts:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: List temporary email accounts
 *     description: |
 *       Retrieve a paginated list of temporary email accounts with optional filtering.
 *       
 *       **Query Parameters:**
 *       - `page`: Page number (default: 1)
 *       - `limit`: Items per page (default: 20, max: 100)
 *       - `search`: Search in email, label, or notes
 *       - `label`: Filter by label
 *       - `status`: Filter by status (active/expired)
 *       
 *       **Response:**
 *       - Returns paginated list of accounts
 *       - Includes total count and pagination metadata
 *       - Excludes soft-deleted accounts
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in email, label, or notes
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Filter by label
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired]
 *         description: Filter by account status
 *     responses:
 *       200:
 *         description: List of accounts with pagination
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
 *                       displayName:
 *                         type: string
 *                       label:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       ttlHours:
 *                         type: integer
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *                       emailCount:
 *                         type: integer
 *                       lastSyncedAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search") ?? "";
    const label = searchParams.get("label") ?? "";
    const status = searchParams.get("status") ?? "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { label: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (label) where.label = label;
    if (status === "active") where.isActive = true;
    if (status === "expired") where.isActive = false;

    const [accounts, total] = await Promise.all([
      db.tempAccount.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, username: true, displayName: true,
          label: true, notes: true, ttlHours: true, expiresAt: true,
          isActive: true, emailCount: true, lastSyncedAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      db.tempAccount.count({ where }),
    ]);

    return ok({ accounts, total, page, limit });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });

/**
 * @openapi
 * /api/v1/accounts:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Create temporary email account
 *     description: |
 *       Create a new temporary email account with optional custom settings.
 *       
 *       **Features:**
 *       - Auto-generate username and password if not provided
 *       - Support multiple username patterns (random, en, id, zh, ja)
 *       - Configurable TTL (time-to-live) in hours
 *       - Optional labels and notes for organization
 *       - Multi-domain support
 *       
 *       **Audit:**
 *       - Creates audit log entry for account creation
 *       - Records actor information and timestamp
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
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Custom username (auto-generated if not provided)
 *                 example: testuser
 *               customPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Custom password (auto-generated if not provided)
 *               displayName:
 *                 type: string
 *                 maxLength: 200
 *                 description: Display name for the account
 *               ttlHours:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 8760
 *                 default: 24
 *                 description: Time-to-live in hours (max 1 year)
 *               label:
 *                 type: string
 *                 maxLength: 100
 *                 description: Label for organization
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes
 *               domain:
 *                 type: string
 *                 maxLength: 253
 *                 description: Domain for email address
 *               usernamePattern:
 *                 type: string
 *                 enum: [random, en, id, zh, ja]
 *                 default: random
 *                 description: Username generation pattern
 *     responses:
 *       201:
 *         description: Account created successfully
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
 *                 password:
 *                   type: string
 *                   description: Plain text password (only returned on creation)
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
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const POST = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const { account, plainPassword } = await createAccount({
      username: body.username,
      customPassword: body.customPassword,
      displayName: body.displayName,
      ttlHours: body.ttlHours,
      label: body.label,
      notes: body.notes,
      usernamePattern: body.usernamePattern,
      domain: body.domain,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.create",
      targetType: "account",
      targetId: account.id,
      targetName: account.email,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return created({ ...account, password: plainPassword });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write"] });
