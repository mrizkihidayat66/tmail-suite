import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAllConfigs, setConfigs, CONFIG_KEYS, ConfigKey } from "@/lib/core/config";
import { restartScheduler } from "@/lib/features/gmail/scheduler";

const patchSchema = z.object({
  google_client_id: z.string().optional(),
  google_client_secret: z.string().optional(),
  google_redirect_uri: z.string().url().optional(),
  gmail_catchall_email: z.string().email().optional(),
  gmail_poll_interval: z.coerce.number().int().min(10).max(3600).optional().transform(v => v?.toString()),
});

/**
 * @openapi
 * /api/v1/admin/config:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get system configuration
 *     description: |
 *       Retrieve all system configuration settings.
 *       
 *       **Configuration Keys:**
 *       - `google_client_id`: OAuth client ID
 *       - `google_client_secret`: OAuth client secret
 *       - `google_redirect_uri`: OAuth redirect URI
 *       - `gmail_catchall_email`: Catchall email address
 *       - `gmail_poll_interval`: Sync interval in seconds
 *       
 *       **Security:**
 *       - Sensitive values may be masked
 *       - Requires admin:* scope
 *       - Audit logged
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configs:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const configs = await getAllConfigs();
    return ok({ configs });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });

/**
 * @openapi
 * /api/v1/admin/config:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update system configuration
 *     description: |
 *       Update system configuration settings.
 *       
 *       **Updatable Settings:**
 *       - Google OAuth credentials
 *       - Gmail catchall email
 *       - Gmail poll interval (10-3600 seconds)
 *       
 *       **Side Effects:**
 *       - Changing poll interval restarts scheduler
 *       - OAuth changes affect new connections
 *       - Catchall changes affect email routing
 *       
 *       **Validation:**
 *       - Poll interval: 10-3600 seconds
 *       - Redirect URI: valid URL format
 *       - Catchall email: valid email format
 *       
 *       **Security:**
 *       - Requires admin:* scope
 *       - Creates audit log entry
 *       - Sensitive values encrypted
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
 *               google_client_id:
 *                 type: string
 *                 description: Google OAuth client ID
 *               google_client_secret:
 *                 type: string
 *                 description: Google OAuth client secret
 *               google_redirect_uri:
 *                 type: string
 *                 format: uri
 *                 description: OAuth redirect URI
 *               gmail_catchall_email:
 *                 type: string
 *                 format: email
 *                 description: Catchall email address
 *               gmail_poll_interval:
 *                 type: integer
 *                 minimum: 10
 *                 maximum: 3600
 *                 description: Sync interval in seconds
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configs:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const PATCH = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());

    const entries: Partial<Record<ConfigKey, string>> = {};
    if (body.google_client_id) entries[CONFIG_KEYS.GOOGLE_CLIENT_ID] = body.google_client_id;
    if (body.google_client_secret) entries[CONFIG_KEYS.GOOGLE_CLIENT_SECRET] = body.google_client_secret;
    if (body.google_redirect_uri) entries[CONFIG_KEYS.GOOGLE_REDIRECT_URI] = body.google_redirect_uri;
    if (body.gmail_catchall_email) entries[CONFIG_KEYS.GMAIL_CATCHALL_EMAIL] = body.gmail_catchall_email;
    if (body.gmail_poll_interval) {
      entries[CONFIG_KEYS.GMAIL_POLL_INTERVAL] = body.gmail_poll_interval;
      await restartScheduler();
    }

    await setConfigs(entries);
    const configs = await getAllConfigs();
    return ok({ configs });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
