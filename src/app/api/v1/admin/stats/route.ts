import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getSystemStats } from "@/lib/features/admin/service";

/**
 * @openapi
 * /api/v1/admin/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: System statistics
 *     description: |
 *       Get comprehensive system statistics and metrics.
 *       
 *       **Statistics Include:**
 *       - Total accounts (active/inactive)
 *       - Total emails (read/unread)
 *       - Total API keys (active/revoked)
 *       - Total domains
 *       - Storage usage
 *       - Recent activity metrics
 *       
 *       **Use Cases:**
 *       - Dashboard metrics
 *       - Capacity planning
 *       - Usage analytics
 *       - Performance monitoring
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     inactive:
 *                       type: integer
 *                 emails:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     unread:
 *                       type: integer
 *                     today:
 *                       type: integer
 *                 apiKeys:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     revoked:
 *                       type: integer
 *                 domains:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     verified:
 *                       type: integer
 *                 storage:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: integer
 *                       description: Storage used in bytes
 *                     emails:
 *                       type: integer
 *                       description: Email count
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    return ok(await getSystemStats());
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
