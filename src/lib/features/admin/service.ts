import { db } from "@/lib/core/db";
import { isGmailConnected } from "@/lib/features/gmail/client";

export async function getSystemStats() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);

  const [
    totalAccounts, activeAccounts, expiredAccounts,
    totalEmails, emailsLast24h,
    totalApiKeys, activeApiKeys,
    gmailConnected,
    totalDomains, activeDomains,
  ] = await Promise.all([
    db.tempAccount.count({ where: { deletedAt: null } }),
    db.tempAccount.count({ where: { deletedAt: null, isActive: true } }),
    db.tempAccount.count({ where: { deletedAt: null, expiresAt: { lt: now } } }),
    db.email.count(),
    db.email.count({ where: { receivedAt: { gte: yesterday } } }),
    db.apiKey.count({ where: { revokedAt: null } }),
    db.apiKey.count({ where: { revokedAt: null, isActive: true } }),
    isGmailConnected(),
    db.domain.count(),
    db.domain.count({ where: { isActive: true } }),
  ]);

  return {
    totalAccounts, activeAccounts, expiredAccounts,
    totalEmails, emailsLast24h,
    totalApiKeys, activeApiKeys,
    gmailConnected,
    totalDomains, activeDomains,
  };
}

export async function getSystemHealth() {
  let dbStatus = false;
  let gmailStatus = false;

  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = true;
  } catch {}

  try {
    gmailStatus = await isGmailConnected();
  } catch {}

  return {
    status: dbStatus ? "ok" : "degraded",
    database: dbStatus ? "ok" : "error",
    gmail: gmailStatus ? "connected" : "disconnected",
  };
}

export async function writeAuditLog(data: {
  actorType: string;
  actorId?: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });
}
