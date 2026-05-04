import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const action = searchParams.get("action") ?? "";
    const actorType = searchParams.get("actorType") ?? "";

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (actorType) where.actorType = actorType;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return ok({ logs, total, page, limit });
  } catch (e) {
    return handleError(e);
  }
});
