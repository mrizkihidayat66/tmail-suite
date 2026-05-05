"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = new PrismaClient();

async function main() {
  await ensureJwtSecret();
  await ensureAdminUser();
  await ensureDefaultConfig();
  console.log("[bootstrap] done");
}

async function ensureJwtSecret() {
  const existing = await db.appConfig.findUnique({ where: { key: "jwt_secret" } });
  if (!existing) {
    await db.appConfig.create({
      data: { key: "jwt_secret", value: crypto.randomBytes(48).toString("hex") },
    });
    console.log("[bootstrap] jwt secret generated");
  }
}

async function ensureAdminUser() {
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

async function ensureDefaultConfig() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const defaults = [
    { key: "google_redirect_uri", value: `${appUrl}/api/v1/gmail/callback` },
    { key: "gmail_poll_interval", value: "30" },
  ];
  for (const { key, value } of defaults) {
    await db.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}

main()
  .catch((e) => { console.error("[bootstrap] error:", e); process.exit(1); })
  .finally(() => db.$disconnect());
