import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

/**
 * @openapi
 * /api/v1/accounts/export:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: Export accounts data
 *     description: |
 *       Export account data in CSV or JSON format.
 *       
 *       **Formats:**
 *       - CSV: Comma-separated values for spreadsheet import
 *       - JSON: Structured data for programmatic processing
 *       
 *       **Exported Fields:**
 *       - Email, username, label
 *       - Active status, expiration date
 *       - Email count, creation date
 *       
 *       **Filtering:**
 *       - Optional label filter
 *       - Excludes soft-deleted accounts
 *       
 *       **Response:**
 *       - Returns file download with appropriate Content-Type
 *       - Filename: accounts.csv or accounts.json
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: fmt
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Filter by label
 *     responses:
 *       200:
 *         description: Accounts data exported
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 email,username,label,is_active,expires_at,email_count,created_at
 *                 test@example.com,testuser,test,true,2026-05-14T00:00:00Z,5,2026-05-13T00:00:00Z
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   username:
 *                     type: string
 *                   label:
 *                     type: string
 *                   isActive:
 *                     type: boolean
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *                   emailCount:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);
    const fmt = searchParams.get("fmt") === "json" ? "json" : "csv";
    const label = searchParams.get("label") ?? "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (label) where.label = label;

    const accounts = await db.tempAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        email: true, username: true, label: true, isActive: true,
        expiresAt: true, emailCount: true, createdAt: true,
      },
    });

    if (fmt === "json") {
      return new NextResponse(JSON.stringify(accounts, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=accounts.json",
        },
      });
    }

    const header = "email,username,label,is_active,expires_at,email_count,created_at";
    const rows = accounts.map((a) =>
      [
        a.email, a.username, a.label ?? "",
        a.isActive, a.expiresAt?.toISOString() ?? "",
        a.emailCount, a.createdAt.toISOString(),
      ].join(",")
    );

    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=accounts.csv",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}, { requiredScopes: ["accounts:read"] });
