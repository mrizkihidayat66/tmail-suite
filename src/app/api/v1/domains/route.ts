import { NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { handleError } from "@/lib/core/response";

export async function GET(): Promise<NextResponse> {
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
}
