import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { bulkCreateAccounts } from "@/lib/features/accounts/service";
import { writeAuditLog } from "@/lib/features/admin/service";

const schema = z.object({
  count: z.number().int().min(1).max(100, "Cannot create more than 100 accounts at once").default(1),
  ttlHours: z.number().int().min(0).max(8760, "TTL too long (max 1 year)").default(24),
  label: z.string().max(100, "Label too long").optional(),
  domain: z.string().max(253, "Domain too long").optional(),
  usernamePattern: z.enum([
    "random", "en", "id", "zh", "ja",
  ]).default("random"),
  fixedPassword: z.string().min(8).max(128, "Password too long").optional(),
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
    const { results, failures } = await bulkCreateAccounts(body.count, {
      ttlHours: body.ttlHours,
      label: body.label,
      usernamePattern: body.usernamePattern,
      fixedPassword: body.fixedPassword,
      passwordOptions: body.passwordOptions,
      domain: body.domain,
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.sub,
      actorName: session.username,
      action: "account.bulk_create",
      metadata: { requested: body.count, created: results.length, failed: failures.length, label: body.label },
    });

    return created({
      accounts: results.map(({ account, plainPassword }) => ({
        ...account,
        password: plainPassword,
      })),
      count: results.length,
      failures,
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:write", "accounts:bulk"] });
