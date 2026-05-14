import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid environment variables: ${missing}`);
    }
    _env = result.data;
  }
  return _env;
}

/**
 * Application Configuration
 * Centralizes all configurable values with environment variable overrides
 */
export const APP_CONFIG = {
  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_MAX: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
    LOGIN_WINDOW_MS: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000'), // 15 min
    API_MAX: parseInt(process.env.RATE_LIMIT_API_MAX || '100'),
    API_WINDOW_MS: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'), // 1 min
  },
  
  // Email Settings
  EMAIL: {
    MAX_ATTACHMENT_SIZE: parseInt(process.env.MAX_ATTACHMENT_SIZE || '10485760'), // 10MB
    BATCH_SIZE: parseInt(process.env.EMAIL_BATCH_SIZE || '50'),
  },
  
  // Gmail Settings
  GMAIL: {
    DEFAULT_POLL_INTERVAL: parseInt(process.env.GMAIL_POLL_INTERVAL || '300'), // 5 min
  },
  
  // Session Settings
  SESSION: {
    MAX_AGE_MS: parseInt(process.env.SESSION_MAX_AGE_MS || '86400000'), // 24 hours
    COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'token',
  },
} as const;
