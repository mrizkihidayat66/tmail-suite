import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/core/db";

export const metadata: Metadata = { title: "Sign In" };

async function isAuthenticated(): Promise<boolean> {
  const token = cookies().get("token")?.value;
  if (!token) return false;
  try {
    const session = await db.sessionToken.findUnique({
      where: { token },
      select: { expiresAt: true, user: { select: { isActive: true } } },
    });
    if (!session || !session.user.isActive) return false;
    if (session.expiresAt < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  if (await isAuthenticated()) redirect("/dashboard");
  return <>{children}</>;
}
