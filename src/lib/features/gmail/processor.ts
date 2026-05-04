import path from "path";
import fs from "fs";
import { db } from "@/lib/core/db";
import { listNewMessages, fetchMessage, fetchAttachment, isGmailConnected } from "./client";
import { parseMessage } from "./parser";

const ATTACHMENTS_DIR =
  process.env.ATTACHMENTS_DIR ?? path.join(process.cwd(), "data", "attachments");
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
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

export async function pollAndProcess(): Promise<PollResult> {
  const result: PollResult = { processed: 0, skipped: 0, errors: 0 };

  const messages = await listNewMessages(100);
  if (messages.length === 0) return result;

  for (const ref of messages) {
    if (!ref.id) continue;

    const exists = await db.email.findUnique({
      where: { gmailMessageId: ref.id },
      select: { id: true },
    });
    if (exists) { result.skipped++; continue; }

    try {
      const raw = await fetchMessage(ref.id);
      const parsed = parseMessage(raw);

      const account = await findAccountForMessage(parsed.toAddress, parsed.originalToAddress);
      if (!account) { result.skipped++; continue; }

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

        if (
          att.sizeBytes <= MAX_ATTACHMENT_BYTES &&
          ALLOWED_MIME_TYPES.has(att.contentType)
        ) {
          try {
            const data = await fetchAttachment(parsed.gmailMessageId, att.gmailAttId);
            if (data) {
              const dir = path.join(ATTACHMENTS_DIR, email.id);
              fs.mkdirSync(dir, { recursive: true });
              const safeName = att.filename.replace(/[^\w\-. ]/g, "_").replace(/\.{2,}/g, "_").slice(0, 200);
              const filePath = path.resolve(dir, safeName);
              if (!filePath.startsWith(path.resolve(dir))) {
                console.error(`[processor] path traversal attempt blocked: ${att.filename}`);
                storagePath = null;
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

      result.processed++;
    } catch (e) {
      console.error(`[processor] failed to process message ${ref.id}:`, e);
      result.errors++;
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
