import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/core/db";
import { createSession } from "@/lib/core/auth";
import { ok, handleError } from "@/lib/core/response";
import { UnauthorizedError, AppError } from "@/lib/core/errors";
import { getEnv } from "@/config/env";
import { checkRateLimit, resetRateLimit } from "@/lib/core/rate-limit";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

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
      secure: getEnv().NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch (e) {
    return handleError(e);
  }
}
