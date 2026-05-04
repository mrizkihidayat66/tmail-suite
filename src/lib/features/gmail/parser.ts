import { gmail_v1 } from "googleapis";

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  originalToAddress: string;
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  rawHeaders: Record<string, string>;
  gmailLabels: string[];
  hasAttachments: boolean;
  sizeBytes: number;
  receivedAt: Date;
  attachments: ParsedAttachment[];
}

export interface ParsedAttachment {
  gmailAttId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string
): string {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data, "base64url").toString("utf-8");
  } catch {
    return "";
  }
}

function extractEmail(raw: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();

  const angleMatch = trimmed.match(/<([^>]+)>/);
  if (angleMatch) {
    return angleMatch[1].trim().toLowerCase();
  }

  const unquoted = trimmed.replace(/^["']|["']$/g, "").trim();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(unquoted)) {
    return unquoted.toLowerCase();
  }

  const emailMatch = trimmed.match(/([^\s<>"',;]+@[^\s<>"',;]+\.[^\s<>"',;]+)/);
  if (emailMatch) {
    return emailMatch[1].toLowerCase();
  }

  return trimmed.toLowerCase();
}

function extractDisplayName(raw: string): string {
  if (!raw) return "";

  const angleIdx = raw.indexOf("<");
  if (angleIdx > 0) {
    return raw.slice(0, angleIdx).trim().replace(/^["']|["']$/g, "").trim();
  }

  return "";
}

function parseAddressList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/,(?![^<]*>)/)
    .map((s) => extractEmail(s.trim()))
    .filter(Boolean);
}

function extractParts(payload: gmail_v1.Schema$MessagePart): {
  text: string;
  html: string;
  attachments: ParsedAttachment[];
} {
  let text = "";
  let html = "";
  const attachments: ParsedAttachment[] = [];

  function walk(part: gmail_v1.Schema$MessagePart) {
    const mime = part.mimeType ?? "";
    const body = part.body ?? {};

    if (mime === "text/plain" && body.data) {
      text = text || decodeBase64(body.data);
    } else if (mime === "text/html" && body.data) {
      html = html || decodeBase64(body.data);
    } else if (part.filename && body.attachmentId) {
      attachments.push({
        gmailAttId: body.attachmentId,
        filename: part.filename,
        contentType: mime,
        sizeBytes: body.size ?? 0,
      });
    }

    part.parts?.forEach(walk);
  }

  walk(payload);
  return { text, html, attachments };
}

export function parseMessage(message: gmail_v1.Schema$Message): ParsedEmail {
  const payload = message.payload ?? {};
  const headers = payload.headers ?? [];

  const rawHeadersMap = Object.fromEntries(
    headers.map((h: { name?: string | null; value?: string | null }) => [h.name ?? "", h.value ?? ""])
  );

  const fromRaw = getHeader(headers, "from");
  const fromAddress = extractEmail(fromRaw);
  const fromName = extractDisplayName(fromRaw);

  const toRaw = getHeader(headers, "to");
  const toAddress = extractEmail(toRaw);

  const xOriginalTo = extractEmail(getHeader(headers, "x-gm-original-to"));
  const deliveredTo = extractEmail(getHeader(headers, "delivered-to"));

  const originalToAddress = xOriginalTo || toAddress || deliveredTo;

  const dateRaw = getHeader(headers, "date");
  let receivedAt: Date;
  try {
    receivedAt = new Date(dateRaw);
    if (isNaN(receivedAt.getTime())) receivedAt = new Date();
  } catch {
    receivedAt = new Date();
  }

  const { text, html, attachments } = extractParts(payload);

  return {
    gmailMessageId: message.id ?? "",
    gmailThreadId: message.threadId ?? "",
    fromAddress,
    fromName,
    toAddress,
    originalToAddress,
    ccAddresses: parseAddressList(getHeader(headers, "cc")),
    bccAddresses: parseAddressList(getHeader(headers, "bcc")),
    subject: getHeader(headers, "subject") || "(no subject)",
    snippet: (message.snippet ?? "").slice(0, 500),
    bodyText: text,
    bodyHtml: html,
    rawHeaders: rawHeadersMap,
    gmailLabels: message.labelIds ?? [],
    hasAttachments: attachments.length > 0,
    sizeBytes: message.sizeEstimate ?? 0,
    receivedAt,
    attachments,
  };
}
