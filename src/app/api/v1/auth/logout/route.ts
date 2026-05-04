import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/core/auth";
import { ok } from "@/lib/core/response";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("token")?.value;
  if (token) await deleteSession(token);

  const res = ok({ message: "Logged out" });
  res.cookies.set("token", "", { maxAge: 0, path: "/" });
  return res;
}
