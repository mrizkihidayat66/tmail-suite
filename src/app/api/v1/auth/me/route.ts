import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: |
 *       Get information about the currently authenticated admin user.
 *       
 *       **Authentication Required:**
 *       - Must have valid session token in cookie or Authorization header
 *       
 *       **Response:**
 *       - Returns user ID, username, display name
 *       - Includes mustChangePassword flag if password change required
 *       
 *       **Use Cases:**
 *       - Verify current session validity
 *       - Get user information for UI display
 *       - Check if password change is required
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: User ID
 *                 username:
 *                   type: string
 *                   description: Username
 *                 displayName:
 *                   type: string
 *                   description: Display name
 *                 mustChangePassword:
 *                   type: boolean
 *                   description: Whether user must change password
 *       401:
 *         description: Not authenticated or invalid session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const GET = withAuth(async (_req: NextRequest, session): Promise<NextResponse> => {
  try {
    const user = await db.adminUser.findUnique({
      where: { id: session.sub },
      select: { id: true, username: true, displayName: true, mustChangePassword: true },
    });
    return ok(user);
  } catch (e) {
    return handleError(e);
  }
});
