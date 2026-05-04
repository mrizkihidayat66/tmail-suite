import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { ConflictError } from "@/lib/core/errors";

const createSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const users = await db.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, displayName: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    return ok({ users });
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const exists = await db.adminUser.findUnique({ where: { username: body.username } });
    if (exists) throw new ConflictError("Username already exists");

    const user = await db.adminUser.create({
      data: {
        username: body.username,
        passwordHash: await bcrypt.hash(body.password, 12),
        displayName: body.displayName,
      },
      select: { id: true, username: true, displayName: true, isActive: true, createdAt: true },
    });

    return created(user);
  } catch (e) {
    return handleError(e);
  }
});
