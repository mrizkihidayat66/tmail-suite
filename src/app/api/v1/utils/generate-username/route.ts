import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { generateUsername } from "@/lib/shared/generators";

const schema = z.object({
  pattern: z.enum([
    "random", "en", "id", "zh", "ja",
  ]).default("random"),
});

/**
 * @openapi
 * /api/v1/utils/generate-username:
 *   get:
 *     tags:
 *       - Utils
 *     summary: Generate random username
 *     description: |
 *       Generate a random username based on language pattern.
 *       
 *       **Username Patterns:**
 *       - `random`: Random alphanumeric (e.g., user_a3b9x2)
 *       - `en`: English words (e.g., happy_tiger_42)
 *       - `id`: Indonesian words (e.g., senang_harimau_42)
 *       - `zh`: Chinese pinyin (e.g., kuaile_laohu_42)
 *       - `ja`: Japanese romaji (e.g., ureshii_tora_42)
 *       
 *       **Generation Rules:**
 *       - Lowercase only
 *       - Underscore separator
 *       - Random number suffix
 *       - URL-safe characters
 *       - Unique per request
 *       
 *       **Use Cases:**
 *       - Generate usernames for new accounts
 *       - Suggest available usernames
 *       - Bulk account creation
 *       - Anonymous user naming
 *       
 *       **Note:**
 *       - Does not check uniqueness in database
 *       - Caller must verify username availability
 *       - Suitable for suggestions only
 *       - May need retry for uniqueness
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *           enum: [random, en, id, zh, ja]
 *           default: random
 *         description: |
 *           Username generation pattern:
 *           - `random`: Random alphanumeric
 *           - `en`: English words
 *           - `id`: Indonesian words
 *           - `zh`: Chinese pinyin
 *           - `ja`: Japanese romaji
 *     responses:
 *       200:
 *         description: Username generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                   example: happy_tiger_42
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const { pattern } = schema.parse(Object.fromEntries(searchParams));
    return ok({ username: generateUsername(pattern) });
  } catch (e) {
    return handleError(e);
  }
});
