import { NextRequest, NextResponse } from "next/server";
import { deleteSession, verifySession } from "@/lib/core/auth";
import { ok, handleError } from "@/lib/core/response";
import { UnauthorizedError } from "@/lib/core/errors";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.cookies.get("token")?.value;

    // Verify session exists and is valid before logout
    if (!token) {
      throw new UnauthorizedError("No active session");
    }

    // Validate the session token
    await verifySession(token);

    // Delete the validated session
    await deleteSession(token);

    const res = ok({ message: "Logged out" });
    res.cookies.set("token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
