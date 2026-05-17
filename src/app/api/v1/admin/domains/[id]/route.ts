import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, RouteContext } from "@/lib/core/middleware";
import { ok, noContent, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";
import { NotFoundError } from "@/lib/core/errors";

const patchSchema = z.object({
  domain: z.string()
    .min(3, "Domain too short")
    .max(253, "Domain too long (max 253 characters)")
    .toLowerCase()
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/,
      "Invalid domain format. Must be a valid domain name (e.g., example.com)"
    )
    .refine(
      (val) => {
        // Prevent consecutive dots
        if (val.includes("..")) return false;
        // Prevent starting/ending with dot or hyphen
        if (val.startsWith(".") || val.endsWith(".")) return false;
        if (val.startsWith("-") || val.endsWith("-")) return false;
        // Each label must be <= 63 characters
        return val.split(".").every(label => label.length <= 63 && label.length > 0);
      },
      { message: "Invalid domain structure" }
    )
    .optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const body = patchSchema.parse(await req.json());
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    const updated = await db.domain.update({ where: { id: ctx.params.id }, data: body });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });

export const DELETE = withAuth(async (_req: NextRequest, _session, ctx: RouteContext<{ id: string }>): Promise<NextResponse> => {
  try {
    const existing = await db.domain.findUnique({ where: { id: ctx.params.id } });
    if (!existing) throw new NotFoundError("Domain");
    await db.domain.delete({ where: { id: ctx.params.id } });
    return noContent();
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
