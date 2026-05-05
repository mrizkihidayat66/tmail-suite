export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./src/lib/features/gmail/scheduler");
    startScheduler().catch((e) => console.error("[instrumentation] scheduler error:", e));
  }
}
