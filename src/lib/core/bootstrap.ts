import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { CONFIG_KEYS } from "./config";

export async function bootstrap(): Promise<void> {
  await ensureJwtSecret();
  await ensureAdminUser();
  await ensureDefaultConfig();
}

async function ensureJwtSecret(): Promise<void> {
  const existing = await db.appConfig.findUnique({ where: { key: CONFIG_KEYS.JWT_SECRET } });
  if (!existing) {
    await db.appConfig.create({
      data: { key: CONFIG_KEYS.JWT_SECRET, value: crypto.randomBytes(48).toString("hex") },
    });
  }
}

async function ensureAdminUser(): Promise<void> {
  const existing = await db.adminUser.findFirst();
  if (!existing) {
    await db.adminUser.create({
      data: {
        username: "admin",
        passwordHash: await bcrypt.hash("changeme123", 12),
        displayName: "Administrator",
        mustChangePassword: true,
      },
    });
    console.log("[bootstrap] admin user created — please change the default password after first login");
  }
}

async function ensureDefaultConfig(): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const defaults: Array<{ key: string; value: string }> = [
    { key: CONFIG_KEYS.GOOGLE_REDIRECT_URI, value: `${appUrl}/api/v1/gmail/callback` },
    { key: CONFIG_KEYS.GMAIL_POLL_INTERVAL, value: "30" },
  ];
  for (const { key, value } of defaults) {
    await db.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
