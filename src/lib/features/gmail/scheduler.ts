import cron from "node-cron";
import { getConfig, CONFIG_KEYS } from "@/lib/core/config";
import { pollAndProcess, deactivateExpiredAccounts } from "./processor";
import { isGmailConnected } from "./client";
import { reconcileEmailCounts } from "@/lib/features/emails/service";
import { deleteExpiredSessions } from "@/lib/core/auth";

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
        console.log(
          `[scheduler] poll: +${result.processed} stored, ${result.skipped} skipped, ${result.errors} errors`
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "GMAIL_NOT_CONNECTED") {
        console.error("[scheduler] poll error:", msg);
      }
    }
  });

  cleanupTask = cron.schedule("0 * * * *", async () => {
    try {
      const count = await deactivateExpiredAccounts();
      if (count > 0) console.log(`[scheduler] cleanup: deactivated ${count} expired accounts`);
      const sessions = await deleteExpiredSessions();
      if (sessions > 0) console.log(`[scheduler] cleanup: deleted ${sessions} expired sessions`);
    } catch (e) {
      console.error("[scheduler] cleanup error:", e);
    }
  });

  reconcileTask = cron.schedule("0 3 * * *", async () => {
    try {
      const fixed = await reconcileEmailCounts();
      if (fixed > 0) console.log(`[scheduler] reconcile: fixed emailCount for ${fixed} accounts`);
    } catch (e) {
      console.error("[scheduler] reconcile error:", e);
    }
  });

  console.log(`[scheduler] started — poll every ${interval}s, cleanup every 1h`);
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
