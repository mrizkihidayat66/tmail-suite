import { NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { handleError } from "@/lib/core/response";
import { withAuth } from "@/lib/core/middleware";

/**
 * @openapi
 * /api/v1/domains:
 *   get:
 *     tags:
 *       - Domains
 *     summary: List active domains
 *     description: |
 *       Retrieve list of all active domains.
 *       
 *       **Public Endpoint:**
 *       - Returns only active domains
 *       - Used for domain selection in UI
 *       - No pagination (typically small list)
 *       
 *       **Response:**
 *       - Domain ID, name, and creation date
 *       - Ordered by creation date (oldest first)
 *       - Excludes inactive domains
 *       
 *       **Use Cases:**
 *       - Domain dropdown in account creation
 *       - Domain validation
 *       - Public domain list
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of active domains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       domain:
 *                         type: string
 *                         example: example.com
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (): Promise<NextResponse> => {
  try {
    const domains = await db.domain.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ domains });
  } catch (e) {
    return handleError(e);
  }
});
