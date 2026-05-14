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

/**
 * @openapi
 * /api/v1/emails/search:
 *   get:
 *     tags:
 *       - Emails
 *     summary: Search emails
 *     description: |
 *       Search emails across accounts using full-text search.
 *       
 *       **Search Features:**
 *       - Full-text search in subject, body, sender, recipient
 *       - Optional account filter
 *       - Configurable result limit (max 200)
 *       - SQL injection protection
 *       
 *       **Query Validation:**
 *       - Required: search query (1-500 characters)
 *       - Blocks dangerous SQL patterns
 *       - Case-insensitive search
 *       
 *       **Response:**
 *       - Returns matching emails
 *       - Ordered by relevance
 *       - Includes match highlights
 *       
 *       **Use Cases:**
 *       - Find emails by keyword
 *       - Search specific account
 *       - Filter by sender or subject
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Search query
 *         example: invoice payment
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific account ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       accountId:
 *                         type: string
 *                       accountEmail:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       from:
 *                         type: string
 *                       snippet:
 *                         type: string
 *                       receivedAt:
 *                         type: string
 *                         format: date-time
 *                       seen:
 *                         type: boolean
 *                 query:
 *                   type: string
 *                   description: Original search query
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
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
