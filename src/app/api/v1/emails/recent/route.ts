import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getRecentEmails } from "@/lib/features/emails/service";

export const GET = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const emails = await getRecentEmails(session.sub, limit);
    return ok({ emails });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["emails:read"] });
