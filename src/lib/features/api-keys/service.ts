import { db } from "@/lib/core/db";
import { NotFoundError, AppError } from "@/lib/core/errors";
import { generateApiKey, hashApiKey, encryptApiKey, decryptApiKey } from "@/lib/shared/generators";
import { ensureJwtSecret } from "@/lib/core/config";

export async function createApiKey(input: {
  name: string;
  description?: string;
  scopes?: string[];
  expiresAt?: Date;
  createdById: string;
}) {
  const secret = await ensureJwtSecret();
  const { raw, prefix } = generateApiKey();
  const hash = hashApiKey(raw, secret);
  const encrypted = encryptApiKey(raw, secret);

  const key = await db.apiKey.create({
    data: {
      name: input.name,
      description: input.description,
      keyHash: hash,
      keyPrefix: prefix,
      keyEncrypted: encrypted,
      scopes: JSON.stringify(input.scopes ?? ["*"]),
      expiresAt: input.expiresAt,
      createdById: input.createdById,
    },
  });

  return { key, rawKey: raw };
}

export async function verifyApiKey(rawKey: string) {
  const secret = await ensureJwtSecret();
  const hash = hashApiKey(rawKey, secret);

  const key = await db.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key || !key.isActive || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
  });

  return key;
}

export async function revealApiKey(id: string): Promise<string> {
  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) throw new NotFoundError("API key");
  if (!key.keyEncrypted) throw new AppError("Key was created before reveal support was added. Please rotate to get a new key.", 409, "KEY_NOT_REVEALABLE");

  const secret = await ensureJwtSecret();
  return decryptApiKey(key.keyEncrypted, secret);
}

export async function revokeApiKey(id: string): Promise<void> {
  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) throw new NotFoundError("API key");

  await db.apiKey.update({
    where: { id },
    data: { revokedAt: new Date(), isActive: false },
  });
}

export async function rotateApiKey(id: string, createdById: string) {
  const old = await db.apiKey.findUnique({ where: { id } });
  if (!old) throw new NotFoundError("API key");

  await revokeApiKey(id);

  return createApiKey({
    name: old.name,
    description: old.description ?? undefined,
    scopes: JSON.parse(old.scopes),
    expiresAt: old.expiresAt ?? undefined,
    createdById,
  });
}
