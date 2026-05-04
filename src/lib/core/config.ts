import { db } from "./db";
import crypto from "crypto";

export const CONFIG_KEYS = {
  JWT_SECRET: "jwt_secret",
  GOOGLE_CLIENT_ID: "google_client_id",
  GOOGLE_CLIENT_SECRET: "google_client_secret",
  GOOGLE_REDIRECT_URI: "google_redirect_uri",
  GMAIL_CATCHALL_EMAIL: "gmail_catchall_email",
  GMAIL_POLL_INTERVAL: "gmail_poll_interval",
  GMAIL_LAST_POLL_AT: "gmail_last_poll_at",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

const SENSITIVE_KEYS = new Set<string>([
  CONFIG_KEYS.JWT_SECRET,
  CONFIG_KEYS.GOOGLE_CLIENT_SECRET,
]);

const cache = new Map<string, string>();
let populatePromise: Promise<void> | null = null;

async function populateCache(): Promise<void> {
  if (populatePromise) return populatePromise;
  if (cache.size > 0) return;
  populatePromise = (async () => {
    const rows = await db.appConfig.findMany();
    for (const row of rows) {
      cache.set(row.key, row.value);
    }
  })();
  await populatePromise;
}

function invalidateCache(): void {
  cache.clear();
  populatePromise = null;
}

export async function getConfig(key: ConfigKey): Promise<string | null> {
  await populateCache();
  return cache.get(key) ?? null;
}

export async function getConfigOrThrow(key: ConfigKey, label?: string): Promise<string> {
  const val = await getConfig(key);
  if (!val) throw new Error(`Configuration "${label ?? key}" is not set. Configure it in Settings → Configuration.`);
  return val;
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  await db.appConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  invalidateCache();
}

export async function setConfigs(entries: Partial<Record<ConfigKey, string>>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== "") {
      await db.appConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
  }
  invalidateCache();
}

export async function getAllConfigs(): Promise<Record<string, string | null>> {
  await populateCache();
  const result: Record<string, string | null> = {};
  for (const key of Object.values(CONFIG_KEYS)) {
    const val = cache.get(key) ?? null;
    result[key] = SENSITIVE_KEYS.has(key) && val ? "••••••••" : val;
  }
  return result;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

export async function ensureJwtSecret(): Promise<string> {
  let secret = await getConfig(CONFIG_KEYS.JWT_SECRET);
  if (!secret) {
    secret = crypto.randomBytes(48).toString("hex");
    await setConfig(CONFIG_KEYS.JWT_SECRET, secret);
  }
  return secret;
}
