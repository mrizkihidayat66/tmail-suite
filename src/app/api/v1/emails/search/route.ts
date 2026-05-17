import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { searchEmails } from "@/lib/features/emails/service";
import { ValidationError } from "@/lib/core/errors";

const schema = z.object({
  q: z.string()
    .min(1, "Search query is required")
    .max(500, "Search query too long (max 500 characters)")
    .refine(
      (val) => {
        // Prevent SQL injection patterns
        const dangerousPatterns = /(\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b|--|;|\/\*|\*\/|xp_|sp_)/i;
        return !dangerousPatterns.test(val);
      },
      { message: "Invalid characters in search query" }
    ),
  accountId: z.string().uuid("Invalid account ID format").optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const params = schema.safeParse(Object.fromEntries(searchParams));
    if (!params.success) throw new ValidationError("q is required");

    const emails = await searchEmails(params.data.q, params.data.accountId, params.data.limit);
    return ok({ emails, query: params.data.q });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["emails:read"] });
