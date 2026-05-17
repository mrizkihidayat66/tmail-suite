import { NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { handleError } from "@/lib/core/response";
import { withAuth } from "@/lib/core/middleware";

export const GET = withAuth(async (): Promise<NextResponse> => {
  try {
    const domains = await db.domain.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ domains });
  } catch (e) {
    return handleError(e);
  }
});
