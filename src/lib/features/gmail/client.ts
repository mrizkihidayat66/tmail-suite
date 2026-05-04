import { google, gmail_v1 } from "googleapis";
import { db } from "@/lib/core/db";
import { getConfigOrThrow, getConfig, CONFIG_KEYS } from "@/lib/core/config";
import { AppError } from "@/lib/core/errors";

async function getOAuthCredentials() {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getConfigOrThrow(CONFIG_KEYS.GOOGLE_CLIENT_ID, "Google Client ID"),
    getConfigOrThrow(CONFIG_KEYS.GOOGLE_CLIENT_SECRET, "Google Client Secret"),
    getConfigOrThrow(CONFIG_KEYS.GOOGLE_REDIRECT_URI, "Google Redirect URI"),
  ]);
  return { clientId, clientSecret, redirectUri };
}

export async function createOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = await getOAuthCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getAuthorizationUrl(state: string): Promise<string> {
  const client = await createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = await createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const catchallEmail = await getConfigOrThrow(CONFIG_KEYS.GMAIL_CATCHALL_EMAIL, "Gmail Catch-all Email");

  const token = await db.gmailToken.findUnique({
    where: { userEmail: catchallEmail },
  });

  if (!token?.accessToken || !token?.refreshToken) {
    throw new AppError("Gmail is not connected", 503, "GMAIL_NOT_CONNECTED");
  }

  const client = await createOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  client.on("tokens", async (newTokens: { access_token?: string | null; expiry_date?: number | null }) => {
    if (newTokens.access_token) {
      await db.gmailToken.update({
        where: { userEmail: catchallEmail },
        data: {
          accessToken: newTokens.access_token,
          expiresAt: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      });
    }
  });

  return google.gmail({ version: "v1", auth: client });
}

export async function isGmailConnected(): Promise<boolean> {
  const catchallEmail = await getConfig(CONFIG_KEYS.GMAIL_CATCHALL_EMAIL);
  if (!catchallEmail) return false;
  const token = await db.gmailToken.findUnique({ where: { userEmail: catchallEmail } });
  return !!(token?.accessToken && token?.refreshToken);
}

export async function listNewMessages(maxResults = 100): Promise<gmail_v1.Schema$Message[]> {
  const gmail = await getGmailClient();

  const domains = await db.domain.findMany({
    where: { isActive: true },
    select: { domain: true },
  });

  if (domains.length === 0) return [];

  const domainQuery = domains.map((d) => `to:*@${d.domain}`).join(" OR ");
  const q = `(${domainQuery}) newer_than:1d`;

  const res = await gmail.users.messages.list({ userId: "me", q, maxResults });
  return res.data.messages ?? [];
}

export async function fetchMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
  const gmail = await getGmailClient();
  const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  return res.data;
}

export async function fetchAttachment(
  messageId: string,
  attachmentId: string
): Promise<Buffer | null> {
  const gmail = await getGmailClient();
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  if (!res.data.data) return null;
  return Buffer.from(res.data.data, "base64url");
}
