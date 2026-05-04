import path from "path";
import fs from "fs";
import { db } from "@/lib/core/db";
import { listNewMessages, fetchMessage, fetchAttachment } from "./client";
import { parseMessage } from "./parser";

const ATTACHMENTS_DIR =
  process.env.ATTACHMENTS_DIR ?? path.join(process.cwd(), "db", "attachments");
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const BATCH_SIZE = 10;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "text/plain", "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface PollResult {
  processed: number;
  skipped: number;
  errors: number;
}

async function findAccountForMessage(
  toAddress: string,
  originalToAddress: string
): Promise<{ id: string } | null> {
  const candidates = [...new Set([toAddress, originalToAddress].filter(Boolean))];

  for (const addr of candidates) {
    const account = await db.tempAccount.findFirst({
      where: { email: addr, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (account) return account;
  }

  return null;
}

async function processMessage(messageId: string): Promise<"processed" | "skipped" | "error"> {
  const exists = await db.email.findUnique({
    where: { gmailMessageId: messageId },
    select: { id: true },
  });
  if (exists) return "skipped";

  try {
    const raw = await fetchMessage(messageId);
    const parsed = parseMessage(raw);

    const account = await findAccountForMessage(parsed.toAddress, parsed.originalToAddress);
    if (!account) return "skipped";

    const email = await db.email.create({
      data: {
        gmailMessageId: parsed.gmailMessageId,
        gmailThreadId: parsed.gmailThreadId,
        accountId: account.id,
        fromAddress: parsed.fromAddress,
        fromName: parsed.fromName,
        toAddress: parsed.originalToAddress || parsed.toAddress,
        ccAddresses: JSON.stringify(parsed.ccAddresses),
        bccAddresses: JSON.stringify(parsed.bccAddresses),
        subject: parsed.subject,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        rawHeaders: JSON.stringify(parsed.rawHeaders),
        gmailLabels: JSON.stringify(parsed.gmailLabels),
        hasAttachments: parsed.hasAttachments,
        sizeBytes: parsed.sizeBytes,
        receivedAt: parsed.receivedAt,
      },
    });

    for (const att of parsed.attachments) {
      let storagePath: string | null = null;

      if (att.sizeBytes <= MAX_ATTACHMENT_BYTES && ALLOWED_MIME_TYPES.has(att.contentType)) {
        try {
          const data = await fetchAttachment(parsed.gmailMessageId, att.gmailAttId);
          if (data) {
            const dir = path.join(ATTACHMENTS_DIR, email.id);
            fs.mkdirSync(dir, { recursive: true });
            const safeName = att.filename.replace(/[^\w\-. ]/g, "_").replace(/\.{2,}/g, "_").slice(0, 200);
            const filePath = path.resolve(dir, safeName);
            if (!filePath.startsWith(path.resolve(dir))) {
              console.error(`[processor] path traversal attempt blocked: ${att.filename}`);
            } else {
              fs.writeFileSync(filePath, data);
              storagePath = path.join(email.id, safeName);
            }
          }
        } catch (e) {
          console.error(`[processor] attachment download failed: ${att.filename}`, e);
        }
      }

      await db.emailAttachment.create({
        data: {
          emailId: email.id,
          gmailAttId: att.gmailAttId,
          filename: att.filename,
          contentType: att.contentType,
          sizeBytes: att.sizeBytes,
          storagePath,
        },
      });
    }

    await db.tempAccount.update({
      where: { id: account.id },
      data: { emailCount: { increment: 1 }, lastSyncedAt: new Date() },
    });

    return "processed";
  } catch (e) {
    console.error(`[processor] failed to process message ${messageId}:`, e);
    return "error";
  }
}

export async function pollAndProcess(): Promise<PollResult> {
  const result: PollResult = { processed: 0, skipped: 0, errors: 0 };

  const messages = await listNewMessages(100);
  if (messages.length === 0) return result;

  const ids = messages.map((m) => m.id).filter((id): id is string => !!id);

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.allSettled(batch.map((id) => processMessage(id)));

    for (const outcome of outcomes) {
      if (outcome.status === "fulfilled") {
        if (outcome.value === "error") {
          result.errors++;
        } else {
          result[outcome.value]++;
        }
      } else {
        result.errors++;
      }
    }
  }

  return result;
}

export async function deactivateExpiredAccounts(): Promise<number> {
  const { count } = await db.tempAccount.updateMany({
    where: { expiresAt: { lt: new Date() }, isActive: true, deletedAt: null },
    data: { isActive: false },
  });
  return count;
}
