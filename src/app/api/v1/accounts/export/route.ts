import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/core/middleware";
import { handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

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
});
