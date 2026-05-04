import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/core/middleware";
import { ok, created, handleError } from "@/lib/core/response";
import { db } from "@/lib/core/db";

const createSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid domain format"),
  isActive: z.boolean().default(true),
});

export const GET = withAuth(async (_req: NextRequest): Promise<NextResponse> => {
  try {
    const domains = await db.domain.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok({ domains });
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = createSchema.parse(await req.json());
    const domain = await db.domain.create({ data: body });
    return created(domain);
  } catch (e) {
    return handleError(e);
  }
});
