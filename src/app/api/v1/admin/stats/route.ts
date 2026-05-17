import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getSystemStats } from "@/lib/features/admin/service";

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    return ok(await getSystemStats());
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
