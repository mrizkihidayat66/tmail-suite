import { NextRequest, NextResponse } from "next/server";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { created, handleError } from "@/lib/core/response";
import { rotateApiKey } from "@/lib/features/api-keys/service";
import { parseJsonSafe } from "@/lib/shared/utils";

export const POST = withAuth(async (_req: NextRequest, session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const { key, rawKey } = await rotateApiKey(ctx.params.id, session.sub);
    return created({
      ...key,
      scopes: parseJsonSafe<string[]>(key.scopes, ["*"]),
      key: rawKey,
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["api-keys:write"] });
