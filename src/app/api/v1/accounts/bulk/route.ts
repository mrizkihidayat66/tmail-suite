import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { bulkCreateAccounts } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const schema = z.object({
  count: z.number().int().min(1).max(100).default(1),
  ttlHours: z.number().int().min(0).default(24),
  label: z.string().optional(),
  domain: z.string().optional(),
  usernamePattern: z.enum([
    "random_word", "random_chars", "adjective_noun",
    "indonesian", "chinese", "japanese", "english",
  ]).default("random_word"),
  passwordOptions: z.object({
    length: z.number().int().min(8).max(64).default(16),
    includeSymbols: z.boolean().default(true),
    includeNumbers: z.boolean().default(true),
    includeUppercase: z.boolean().default(true),
  }).optional(),
});

export const POST = withAuth(async (req: NextRequest, session): Promise<NextResponse> => {
  try {
    const body = schema.parse(await req.json());
    const results = await bulkCreateAccounts(body.count, {
      ttlHours: body.ttlHours,
      label: body.label,
      usernamePattern: body.usernamePattern,
      passwordOptions: body.passwordOptions,
      domain: body.domain,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.bulk_create",
      metadata: { count: results.length, label: body.label },
    });

    return created({
      accounts: results.map(({ account, plainPassword }) => ({
        ...account,
        password: plainPassword,
      })),
      count: results.length,
    });
  } catch (e) {
    return handleError(e);
  }
});
