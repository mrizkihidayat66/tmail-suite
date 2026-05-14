import { NextRequest, NextResponse } from "next/server";
import { deleteSession, verifySession } from "@/lib/core/auth";
import { ok, handleError } from "@/lib/core/response";
import { UnauthorizedError } from "@/lib/core/errors";

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Admin logout
 *     description: |
 *       Logout current admin session and invalidate session token.
 *       
 *       **Authentication Required:**
 *       - Must have valid session token in cookie or Authorization header
 *       
 *       **Session Management:**
 *       - Session token is invalidated on server
 *       - Cookie is cleared from client
 *       - Token cannot be reused after logout
 *       
 *       **Security:**
 *       - Validates session exists before logout
 *       - Prevents logout of already logged out sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful, session invalidated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Logout confirmation message
 *                   example: Logged out
 *       401:
 *         description: No active session or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.cookies.get("token")?.value;

    // Verify session exists and is valid before logout
    if (!token) {
      throw new UnauthorizedError("No active session");
    }

    // Validate the session token
    await verifySession(token);

    // Delete the validated session
    await deleteSession(token);

    const res = ok({ message: "Logged out" });
    res.cookies.set("token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
