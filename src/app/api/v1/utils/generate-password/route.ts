import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { generatePassword } from "@/lib/shared/generators";

const schema = z.object({
  count: z.coerce.number().int().min(1).max(20).default(1),
  length: z.coerce.number().int().min(8).max(64).default(16),
  includeSymbols: z.coerce.boolean().default(true),
  includeNumbers: z.coerce.boolean().default(true),
  includeUppercase: z.coerce.boolean().default(true),
});

export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const params = schema.parse(Object.fromEntries(searchParams));
    const passwords = Array.from({ length: params.count }, () =>
      generatePassword({
        length: params.length,
        includeSymbols: params.includeSymbols,
        includeNumbers: params.includeNumbers,
        includeUppercase: params.includeUppercase,
      })
    );
    return ok({ passwords });
  } catch (e) {
    return handleError(e);
  }
});
