import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { NotFoundError, ForbiddenError, AppError } from "@/lib/core/errors";

const updateSchema = z.object({
  displayName: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const user = await db.adminUser.findUnique({ where: { id: ctx.params.id } });
    if (!user) throw new NotFoundError("User");

    const body = updateSchema.parse(await req.json());

    if (body.isActive === false && ctx.params.id === session.sub) {
      throw new ForbiddenError("Cannot deactivate your own account");
    }

    if (body.password) {
      if (!body.currentPassword) {
        throw new AppError("Current password is required to set a new password", 400, "CURRENT_PASSWORD_REQUIRED");
      }
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) throw new AppError("Current password is incorrect", 400, "INVALID_CURRENT_PASSWORD");
    }

    const data: Record<string, unknown> = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 12);
      data.mustChangePassword = false;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await db.adminUser.update({
      where: { id: ctx.params.id },
      data,
      select: { id: true, username: true, displayName: true, isActive: true, updatedAt: true },
    });

    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    if (ctx.params.id === session.sub) throw new ForbiddenError("Cannot deactivate your own account");

    const user = await db.adminUser.findUnique({ where: { id: ctx.params.id } });
    if (!user) throw new NotFoundError("User");

    await db.adminUser.update({ where: { id: ctx.params.id }, data: { isActive: false } });
    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
