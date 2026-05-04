import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

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
