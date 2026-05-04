import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { deactivateExpiredAccounts } from "@/lib/features/gmail/processor";

export const POST = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const count = await deactivateExpiredAccounts();
    return ok({ deactivated: count });
  } catch (e) {
    return handleError(e);
  }
});
