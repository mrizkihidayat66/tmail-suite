import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { getSystemHealth } from "@/lib/features/admin/service";

/**
 * @openapi
 * /api/v1/admin/health:
 *   get:
 *     tags:
 *       - Admin
 *     summary: System health check
 *     description: |
 *       Check system health and service status.
 *       
 *       **Health Checks:**
 *       - Database connectivity
 *       - Gmail API connectivity
 *       - Scheduler status
 *       - System resources
 *       
 *       **Response:**
 *       - Overall status (healthy/degraded/unhealthy)
 *       - Individual service statuses
 *       - Error details if any
 *       
 *       **Use Cases:**
 *       - Monitoring and alerting
 *       - Load balancer health checks
 *       - Deployment verification
 *       - Troubleshooting
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   description: Overall system status
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     latency:
 *                       type: number
 *                       description: Database latency in ms
 *                 gmail:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     connected:
 *                       type: boolean
 *                 scheduler:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     running:
 *                       type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    return ok(await getSystemHealth());
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
