import { db } from "@/lib/core/db";
import { NotFoundError } from "@/lib/core/errors";
import { parseJsonSafe } from "@/lib/shared/utils";

function normalizeEmail(email: {
  id: string;
  accountId?: string;
  fromAddress: string;
  fromName?: string | null;
  toAddress?: string;
  subject?: string | null;
  snippet?: string | null;
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
  sizeBytes?: number | null;
  [key: string]: unknown;
}) {
  return {
    ...email,
    from: { address: email.fromAddress, name: email.fromName ?? null },
    seen: email.isRead,
    intro: email.snippet ?? null,
    size: email.sizeBytes ?? null,
  };
}

export async function listEmails(
  accountId: string,
  opts: {
    page?: number;
    limit?: number;
    unread?: boolean;
    subject?: string;
    fromAddress?: string;
  } = {}
) {
  const { page = 1, limit = 20, unread, subject, fromAddress } = opts;

  const where: Record<string, unknown> = { accountId };
  if (unread !== undefined) where.isRead = !unread;
  if (subject) where.subject = { contains: subject };
  if (fromAddress) where.fromAddress = { contains: fromAddress };

  const [emails, total, unreadCount] = await Promise.all([
    db.email.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, fromAddress: true, fromName: true, subject: true,
        snippet: true, receivedAt: true, isRead: true, hasAttachments: true, sizeBytes: true,
      },
    }),
    db.email.count({ where }),
    db.email.count({ where: { accountId, isRead: false } }),
  ]);

  return {
    emails: emails.map(normalizeEmail),
    total,
    unreadCount,
    page,
    limit,
  };
}

export async function getEmailById(accountId: string, emailId: string) {
  const email = await db.email.findFirst({
    where: { id: emailId, accountId },
    include: { attachments: true },
  });
  if (!email) throw new NotFoundError("Email");

  if (!email.isRead) {
    await db.email.update({ where: { id: emailId }, data: { isRead: true } });
    email.isRead = true;
  }

  return {
    ...normalizeEmail(email),
    ccAddresses: parseJsonSafe<string[]>(email.ccAddresses, []),
    bccAddresses: parseJsonSafe<string[]>(email.bccAddresses, []),
    rawHeaders: parseJsonSafe<Record<string, string>>(email.rawHeaders, {}),
    gmailLabels: parseJsonSafe<string[]>(email.gmailLabels, []),
  };
}

export async function markEmailRead(accountId: string, emailId: string, seen: boolean): Promise<void> {
  const email = await db.email.findFirst({ where: { id: emailId, accountId } });
  if (!email) throw new NotFoundError("Email");
  await db.email.update({ where: { id: emailId }, data: { isRead: seen } });
}

export async function deleteEmail(accountId: string, emailId: string): Promise<void> {
  const email = await db.email.findFirst({ where: { id: emailId, accountId } });
  if (!email) throw new NotFoundError("Email");

  await db.email.delete({ where: { id: emailId } });
  await db.tempAccount.update({
    where: { id: accountId },
    data: { emailCount: { decrement: 1 } },
  });
}

export async function getAccountEmailStats(accountId: string) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const lastWeek = new Date(now.getTime() - 7 * 86_400_000);

  const [total, unread, last24h, last7d, lastEmail] = await Promise.all([
    db.email.count({ where: { accountId } }),
    db.email.count({ where: { accountId, isRead: false } }),
    db.email.count({ where: { accountId, receivedAt: { gte: yesterday } } }),
    db.email.count({ where: { accountId, receivedAt: { gte: lastWeek } } }),
    db.email.findFirst({
      where: { accountId },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true },
    }),
  ]);

  return { total, unread, last24h, last7d, lastEmailAt: lastEmail?.receivedAt ?? null };
}

export async function searchEmails(query: string, accountId?: string, limit = 50) {
  const where: Record<string, unknown> = {
    OR: [
      { subject: { contains: query } },
      { bodyText: { contains: query } },
      { fromAddress: { contains: query } },
    ],
  };
  if (accountId) where.accountId = accountId;

  const emails = await db.email.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true, accountId: true, fromAddress: true, fromName: true,
      subject: true, snippet: true, receivedAt: true, isRead: true, hasAttachments: true, sizeBytes: true,
    },
  });

  return emails.map(normalizeEmail);
}

export async function getRecentEmails(limit = 20) {
  const emails = await db.email.findMany({
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true, accountId: true, fromAddress: true, fromName: true,
      subject: true, snippet: true, receivedAt: true, isRead: true, hasAttachments: true, sizeBytes: true,
      account: { select: { email: true } },
    },
  });

  return emails.map(normalizeEmail);
}
