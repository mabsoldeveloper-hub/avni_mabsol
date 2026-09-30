export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startServerSyncScheduler } = await import("@/lib/vfp/serverSyncScheduler");
      startServerSyncScheduler();
    } catch (err: any) {
      console.error("[Instrumentation Error - AutoSync Scheduler]:", err.message);
    }
  }
}
