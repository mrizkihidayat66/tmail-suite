import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { generateUsername } from "@/lib/shared/generators";

const schema = z.object({
  pattern: z.enum([
    "random_word", "random_chars", "adjective_noun",
    "indonesian", "chinese", "japanese", "english",
  ]).default("random_word"),
});

export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const { pattern } = schema.parse(Object.fromEntries(searchParams));
    return ok({ username: generateUsername(pattern) });
  } catch (e) {
    return handleError(e);
  }
});
