import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { isGmailConnected } from "@/lib/features/gmail/client";
import { getConfig, CONFIG_KEYS } from "@/lib/core/config";

/**
 * @openapi
 * /api/v1/gmail/status:
 *   get:
 *     tags:
 *       - Gmail
 *     summary: Get Gmail connection status
 *     description: |
 *       Check if Gmail is connected and retrieve token information.
 *       
 *       **Status Information:**
 *       - Connection status (true/false)
 *       - Catchall email address
 *       - Token expiration date
 *       - Last token update
 *       - OAuth scopes granted
 *       
 *       **Use Cases:**
 *       - Check if Gmail sync is configured
 *       - Display connection status in UI
 *       - Verify token validity
 *       - Show connected email address
 *       
 *       **Response:**
 *       - `connected`: boolean indicating if Gmail is connected
 *       - `token`: token details if connected, null otherwise
 *       
 *       **Note:**
 *       - Does not validate token with Google
 *       - Only checks local database
 *       - Token may be expired even if connected=true
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Gmail connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   description: Whether Gmail is connected
 *                 token:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     userEmail:
 *                       type: string
 *                       format: email
 *                       description: Connected Gmail address
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Token expiration timestamp
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last token update
 *                     scope:
 *                       type: string
 *                       description: OAuth scopes granted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const connected = await isGmailConnected();
    const catchallEmail = await getConfig(CONFIG_KEYS.GMAIL_CATCHALL_EMAIL);
    const token = connected && catchallEmail
      ? await db.gmailToken.findUnique({
          where: { userEmail: catchallEmail },
          select: { userEmail: true, expiresAt: true, updatedAt: true, scope: true },
        })
      : null;
    return ok({ connected, token });
  } catch (e) {
    return handleError(e);
  }
});

/**
 * @openapi
 * /api/v1/gmail/status:
 *   delete:
 *     tags:
 *       - Gmail
 *     summary: Disconnect Gmail
 *     description: |
 *       Remove Gmail connection and delete all stored tokens.
 *       
 *       **Deletion Behavior:**
 *       - Deletes all Gmail tokens from database
 *       - Stops Gmail synchronization
 *       - Does not revoke tokens with Google
 *       - Does not delete synced emails
 *       
 *       **Impact:**
 *       - Gmail sync stops immediately
 *       - Existing emails remain in database
 *       - Accounts remain active
 *       - Can reconnect anytime
 *       
 *       **Security:**
 *       - Tokens removed from local database
 *       - Google still has active OAuth grant
 *       - User should revoke access in Google account
 *       
 *       **Use Cases:**
 *       - Disconnect Gmail integration
 *       - Switch to different Gmail account
 *       - Troubleshoot connection issues
 *       - Security cleanup
 *       
 *       **Recommendation:**
 *       - Revoke access in Google account settings
 *       - Visit: https://myaccount.google.com/permissions
 *       - Remove "TMail Suite" application
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       204:
 *         description: Gmail disconnected successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const DELETE = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    await db.gmailToken.deleteMany();
    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
