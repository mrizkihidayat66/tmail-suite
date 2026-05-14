import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/core/db";
import { createSession } from "@/lib/core/auth";
import { ok, handleError } from "@/lib/core/response";
import { UnauthorizedError } from "@/lib/core/errors";
import { checkRateLimit, resetRateLimit } from "@/lib/core/rate-limit";

const schema = z.object({
  username: z.string().min(1).max(100, "Username too long"),
  password: z.string().min(1).max(128, "Password too long"),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Admin login
 *     description: |
 *       Authenticate as admin user and receive a session token.
 *       
 *       **Rate Limiting:**
 *       - 5 attempts per 15 minutes per IP address
 *       - Failed attempts count towards rate limit
 *       - Successful login resets rate limit counter
 *       
 *       **Session Management:**
 *       - Session token returned in HTTP-only cookie
 *       - Token valid for 30 days
 *       - Token must be included in subsequent requests via cookie or Authorization header
 *       
 *       **Security:**
 *       - Passwords are hashed using bcrypt
 *       - Failed login attempts are rate limited
 *       - User account must be active
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Admin username
 *                 example: admin
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 128
 *                 description: Admin password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, session token set in cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     username:
 *                       type: string
 *                       description: Username
 *                     displayName:
 *                       type: string
 *                       description: Display name
 *                 mustChangePassword:
 *                   type: boolean
 *                   description: Whether user must change password
 *       401:
 *         description: Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error - missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts, rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = schema.parse(await req.json());

    const user = await db.adminUser.findUnique({ where: { username: body.username } });
    if (!user || !user.isActive) throw new UnauthorizedError("Invalid credentials");

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid credentials");

    resetRateLimit(ip);

    await db.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSession(user.id, user.username, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ipAddress: ip,
    });

    const res = ok({
      user: { id: user.id, username: user.username, displayName: user.displayName },
      mustChangePassword: user.mustChangePassword,
    });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch (e) {
    return handleError(e);
  }
}
