import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

const createSchema = z.object({
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
    ),
  isActive: z.boolean().default(true),
});

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const domains = await db.domain.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok({ domains });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const domain = await db.domain.create({ data: body });
    return created(domain);
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
