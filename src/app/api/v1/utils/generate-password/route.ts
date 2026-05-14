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

/**
 * @openapi
 * /api/v1/utils/generate-password:
 *   get:
 *     tags:
 *       - Utils
 *     summary: Generate secure passwords
 *     description: |
 *       Generate one or more cryptographically secure random passwords.
 *       
 *       **Password Generation:**
 *       - Uses crypto.randomBytes for security
 *       - Configurable length (8-64 characters)
 *       - Configurable character sets
 *       - Multiple passwords in one request
 *       
 *       **Character Sets:**
 *       - Lowercase letters (always included)
 *       - Uppercase letters (optional)
 *       - Numbers (optional)
 *       - Symbols (optional): !@#$%^&*()_+-=[]{}|;:,.<>?
 *       
 *       **Use Cases:**
 *       - Generate passwords for new accounts
 *       - Password reset functionality
 *       - Bulk account creation
 *       - API key generation
 *       
 *       **Security:**
 *       - Cryptographically secure random generation
 *       - No password storage or logging
 *       - Generated on-demand
 *       - Suitable for production use
 *       
 *       **Limits:**
 *       - Max 20 passwords per request
 *       - Length: 8-64 characters
 *       - At least lowercase letters included
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           maximum: 20
 *         description: Number of passwords to generate
 *       - in: query
 *         name: length
 *         schema:
 *           type: integer
 *           default: 16
 *           minimum: 8
 *           maximum: 64
 *         description: Password length
 *       - in: query
 *         name: includeSymbols
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include special symbols
 *       - in: query
 *         name: includeNumbers
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include numbers
 *       - in: query
 *         name: includeUppercase
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include uppercase letters
 *     responses:
 *       200:
 *         description: Passwords generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 passwords:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["aB3$xY9!mN2@pQ5"]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
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
