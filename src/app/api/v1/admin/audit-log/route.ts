import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { ok, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

/**
 * @openapi
 * /api/v1/admin/audit-log:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get audit logs
 *     description: |
 *       Retrieve system audit logs with filtering and pagination.
 *       
 *       **Audit Log Events:**
 *       - User authentication (login, logout)
 *       - Account operations (create, update, delete)
 *       - API key operations (create, revoke, rotate)
 *       - Email operations (read, delete)
 *       - Admin operations (config changes, cleanup)
 *       
 *       **Filtering:**
 *       - By action type (login, create_account, etc.)
 *       - By actor type (user, api_key, system)
 *       - Pagination support
 *       
 *       **Use Cases:**
 *       - Security auditing
 *       - Compliance reporting
 *       - Troubleshooting
 *       - User activity tracking
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 200
 *         description: Items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *         example: login
 *       - in: query
 *         name: actorType
 *         schema:
 *           type: string
 *           enum: [user, api_key, system]
 *         description: Filter by actor type
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       action:
 *                         type: string
 *                       actorType:
 *                         type: string
 *                       actorId:
 *                         type: string
 *                       targetType:
 *                         type: string
 *                         nullable: true
 *                       targetId:
 *                         type: string
 *                         nullable: true
 *                       metadata:
 *                         type: object
 *                         nullable: true
 *                       ipAddress:
 *                         type: string
 *                         nullable: true
 *                       userAgent:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const action = searchParams.get("action") ?? "";
    const actorType = searchParams.get("actorType") ?? "";

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (actorType) where.actorType = actorType;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return ok({ logs, total, page, limit });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["admin:*"] });
