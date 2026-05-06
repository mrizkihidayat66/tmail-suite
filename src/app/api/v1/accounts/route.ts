import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { createAccount } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const createSchema = z.object({
  username: z.string().min(1).optional(),
  customPassword: z.string().min(8).optional(),
  displayName: z.string().optional(),
  ttlHours: z.number().int().min(0).default(24),
  label: z.string().optional(),
  notes: z.string().optional(),
  domain: z.string().optional(),
  usernamePattern: z.enum([
    "random", "en", "id", "zh", "ja",
  ]).default("random"),
});

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
});

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
});
