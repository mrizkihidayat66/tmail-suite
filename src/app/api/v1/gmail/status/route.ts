import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { isGmailConnected } from "@/lib/features/gmail/client";
import { getConfig, CONFIG_KEYS } from "@/lib/core/config";

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const connected = await isGmailConnected();
    const catchallEmail = await getConfig(CONFIG_KEYS.GMAIL_CATCHALL_EMAIL);
    const token = connected && catchallEmail
      ? await db.gmailToken.findUnique({
          where: { userEmail: catchallEmail },
          select: { userEmail: true, expiresAt: true, updatedAt: true, scope: true },
        })
      : null;
    return ok({ connected, token });
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    await db.gmailToken.deleteMany();
    return noContent();
  } catch (e) {
    return handleError(e);
  }
});
