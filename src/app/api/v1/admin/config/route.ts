import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getAllConfigs, setConfigs, CONFIG_KEYS, ConfigKey } from "@/lib/core/config";
import { restartScheduler } from "@/lib/features/gmail/scheduler";

const patchSchema = z.object({
  google_client_id: z.string().optional(),
  google_client_secret: z.string().optional(),
  google_redirect_uri: z.string().url().optional(),
  gmail_catchall_email: z.string().email().optional(),
  gmail_poll_interval: z.coerce.number().int().min(10).max(3600).optional().transform(v => v?.toString()),
});

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const configs = await getAllConfigs();
    return ok({ configs });
  } catch (e) {
    return handleError(e);
  }
});

export const PATCH = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());

    const entries: Partial<Record<ConfigKey, string>> = {};
    if (body.google_client_id) entries[CONFIG_KEYS.GOOGLE_CLIENT_ID] = body.google_client_id;
    if (body.google_client_secret) entries[CONFIG_KEYS.GOOGLE_CLIENT_SECRET] = body.google_client_secret;
    if (body.google_redirect_uri) entries[CONFIG_KEYS.GOOGLE_REDIRECT_URI] = body.google_redirect_uri;
    if (body.gmail_catchall_email) entries[CONFIG_KEYS.GMAIL_CATCHALL_EMAIL] = body.gmail_catchall_email;
    if (body.gmail_poll_interval) {
      entries[CONFIG_KEYS.GMAIL_POLL_INTERVAL] = body.gmail_poll_interval;
      await restartScheduler();
    }

    await setConfigs(entries);
    const configs = await getAllConfigs();
    return ok({ configs });
  } catch (e) {
    return handleError(e);
  }
});
