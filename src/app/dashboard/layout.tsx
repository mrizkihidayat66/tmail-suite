import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/core/db";
import { AppShell } from "@/components/layout/app-shell";

async function getSessionUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const session = await db.sessionToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, isActive: true } } },
    });
    if (!session || !session.user.isActive) return null;
    if (session.expiresAt < new Date()) return null;
    return session.user;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
