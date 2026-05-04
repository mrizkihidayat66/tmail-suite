import crypto from "crypto";
import { db } from "./db";
import { UnauthorizedError } from "./errors";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  sub: string;
  username: string;
}

export async function createSession(
  userId: string,
  username: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  await db.sessionToken.create({
    data: {
      token,
      userId,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const session = await db.sessionToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, username: true, isActive: true } } },
  });

  if (!session || !session.user.isActive) {
    throw new UnauthorizedError();
  }

  if (session.expiresAt < new Date()) {
    await db.sessionToken.delete({ where: { token } });
    throw new UnauthorizedError("Session expired");
  }

  await db.sessionToken.update({
    where: { token },
    data: { lastUsedAt: new Date() },
  });

  return { sub: session.user.id, username: session.user.username };
}

export async function deleteSession(token: string): Promise<void> {
  await db.sessionToken.deleteMany({ where: { token } });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.sessionToken.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(): Promise<number> {
  const { count } = await db.sessionToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

export async function requireUser(token: string | undefined) {
  if (!token) throw new UnauthorizedError();
  const session = await verifySession(token);
  const user = await db.adminUser.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, displayName: true, isActive: true },
  });
  if (!user || !user.isActive) throw new UnauthorizedError();
  return user;
}
