import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { createApiKey } from "@/lib/features/api-keys/service";
import { parseJsonSafe } from "@/lib/shared/utils";
import { writeAuditLog } from "@/lib/features/admin/service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scopes: z.array(z.string()).default(["*"]),
  expiresAt: z.string().datetime().optional(),
});

export const GET = withAuth(async (_req: NextRequest, _session): Promise<NextResponse> => {
  try {
    const keys = await db.apiKey.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, description: true, keyPrefix: true, scopes: true,
        expiresAt: true, lastUsedAt: true, usageCount: true, isActive: true, createdAt: true,
      },
    });
    return ok({
      apiKeys: keys.map((k) => ({ ...k, scopes: parseJsonSafe<string[]>(k.scopes, ["*"]) })),
    });
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const { key, rawKey } = await createApiKey({
      name: body.name,
      description: body.description,
      scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdById: session.sub,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "api_key.create",
      targetType: "api_key",
      targetId: key.id,
      targetName: key.name,
    });

    return created({
      ...key,
      scopes: parseJsonSafe<string[]>(key.scopes, ["*"]),
      key: rawKey,
    });
  } catch (e) {
    return handleError(e);
  }
});
