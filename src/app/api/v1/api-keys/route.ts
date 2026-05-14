import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { createApiKey } from "@/lib/features/api-keys/service";
import { parseJsonSafe } from "@/lib/shared/utils";
import { writeAuditLog } from "@/lib/features/admin/service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scopes: z.array(z.string()).default(["*"]),
  expiresAt: z.string().datetime().optional(),
});

/**
 * @openapi
 * /api/v1/api-keys:
 *   get:
 *     tags:
 *       - API Keys
 *     summary: List API keys
 *     description: |
 *       Retrieve list of all active (non-revoked) API keys.
 *       
 *       **Response:**
 *       - Returns all non-revoked API keys
 *       - Ordered by creation date (newest first)
 *       - Includes key metadata and usage statistics
 *       - Key values are NOT included (use reveal endpoint)
 *       
 *       **Security:**
 *       - Only shows key prefix (first 12 characters)
 *       - Full key value never exposed in list
 *       - Requires api-keys:read scope
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       keyPrefix:
 *                         type: string
 *                         description: First 12 characters of the key
 *                       scopes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       lastUsedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       usageCount:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest, _session): Promise<NextResponse> => {
  try {
    const keys = await db.apiKey.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, description: true, keyPrefix: true, scopes: true,
        expiresAt: true, lastUsedAt: true, usageCount: true, isActive: true, createdAt: true,
      },
    });
    return ok({
      apiKeys: keys.map((k) => ({ ...k, scopes: parseJsonSafe<string[]>(k.scopes, ["*"]) })),
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:read"] });

/**
 * @openapi
 * /api/v1/api-keys:
 *   post:
 *     tags:
 *       - API Keys
 *     summary: Create API key
 *     description: |
 *       Create a new API key for programmatic access.
 *       
 *       **Features:**
 *       - Generate secure random API key
 *       - Configurable scopes for permission control
 *       - Optional expiration date
 *       - Key returned only once on creation
 *       
 *       **Scopes:**
 *       - `*`: Full access (all scopes)
 *       - `accounts:read`: Read account data
 *       - `accounts:write`: Create/update/delete accounts
 *       - `emails:read`: Read email data
 *       - `api-keys:read`: Read API keys
 *       - `api-keys:write`: Create/update/revoke API keys
 *       
 *       **Security:**
 *       - Key value returned only on creation
 *       - Store key securely - cannot be retrieved later
 *       - Use reveal endpoint to decrypt stored key
 *       - Creates audit log entry
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: API key name
 *                 example: Production API Key
 *               description:
 *                 type: string
 *                 description: Optional description
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: ["*"]
 *                 description: Permission scopes
 *                 example: ["accounts:read", "emails:read"]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 keyPrefix:
 *                   type: string
 *                 scopes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 isActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 key:
 *                   type: string
 *                   description: Full API key (only returned once)
 *                   example: tm_1234567890abcdef1234567890abcdef
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const POST = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const { key, rawKey } = await createApiKey({
      name: body.name,
      description: body.description,
      scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdById: session.sub,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "api_key.create",
      targetType: "api_key",
      targetId: key.id,
      targetName: key.name,
    });

    return created({
      ...key,
      scopes: parseJsonSafe<string[]>(key.scopes, ["*"]),
      key: rawKey,
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:write"] });
