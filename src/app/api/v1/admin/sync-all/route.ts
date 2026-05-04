import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { pollAndProcess } from "@/lib/features/gmail/processor";

export const POST = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const result = await pollAndProcess();
    return ok({ message: "Sync triggered", ...result });
  } catch (e) {
    return handleError(e);
  }
});
