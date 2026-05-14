import cron from "node-cron";
import { getConfig, CONFIG_KEYS } from "@/lib/core/config";
import { pollAndProcess, deactivateExpiredAccounts } from "./processor";
import { isGmailConnected } from "./client";
import { reconcileEmailCounts } from "@/lib/features/emails/service";
import { deleteExpiredSessions } from "@/lib/core/auth";
import { logger } from "@/lib/core/logger";

let pollTask: cron.ScheduledTask | null = null;
let cleanupTask: cron.ScheduledTask | null = null;
let reconcileTask: cron.ScheduledTask | null = null;
let initialized = false;
let currentInterval = 0;

async function getPollInterval(): Promise<number> {
  const val = await getConfig(CONFIG_KEYS.GMAIL_POLL_INTERVAL);
  const parsed = parseInt(val ?? "30", 10);
  return isNaN(parsed) || parsed < 10 ? 30 : parsed;
}

export async function startScheduler(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const interval = await getPollInterval();
  currentInterval = interval;
  const pollExpr = `*/${interval} * * * * *`;

  pollTask = cron.schedule(pollExpr, async () => {
    try {
      const connected = await isGmailConnected();
      if (!connected) return;
      const result = await pollAndProcess();
      if (result.processed > 0 || result.errors > 0) {
        logger.info('Gmail poll completed', {
          processed: result.processed,
          skipped: result.skipped,
          errors: result.errors,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "GMAIL_NOT_CONNECTED") {
        logger.error('Gmail poll error', e instanceof Error ? e : undefined, { message: msg });
      }
    }
  });

  cleanupTask = cron.schedule("0 * * * *", async () => {
    try {
      const count = await deactivateExpiredAccounts();
      if (count > 0) logger.info('Cleanup: deactivated expired accounts', { count });
      const sessions = await deleteExpiredSessions();
      if (sessions > 0) logger.info('Cleanup: deleted expired sessions', { count: sessions });
    } catch (e) {
      logger.error('Cleanup error', e instanceof Error ? e : undefined);
    }
  });

  reconcileTask = cron.schedule("0 3 * * *", async () => {
    try {
      const fixed = await reconcileEmailCounts();
      if (fixed > 0) logger.info('Reconcile: fixed email counts', { accountsFixed: fixed });
    } catch (e) {
      logger.error('Reconcile error', e instanceof Error ? e : undefined);
    }
  });

  logger.info('Scheduler started', { pollIntervalSeconds: interval, cleanupInterval: '1h' });
}

export function stopScheduler(): void {
  pollTask?.stop();
  cleanupTask?.stop();
  reconcileTask?.stop();
  initialized = false;
  currentInterval = 0;
}

export async function restartScheduler(): Promise<void> {
  stopScheduler();
  await startScheduler();
}
