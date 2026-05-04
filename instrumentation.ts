export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./src/lib/features/gmail/scheduler");
    const { bootstrap } = await import("./src/lib/core/bootstrap");
    await bootstrap().catch((e) => console.error("[instrumentation] bootstrap error:", e));
    startScheduler().catch((e) => console.error("[instrumentation] scheduler error:", e));
  }
}
