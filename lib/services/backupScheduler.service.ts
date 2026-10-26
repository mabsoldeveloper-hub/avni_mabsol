import cron from "node-cron";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import {
  BackupSettings,
  getBackupSettings,
  getNextBackupDate,
} from "@/lib/backup-settings";
import { sendScheduledBackup } from "@/lib/backup-service";

declare global {
  var __backupScheduler: {
    cronTask: any;
    intervalTimer: any;
    isSchedulerRunning: boolean;
    isBackupInProgress: boolean;
    lastCheckedAt: Date | null;
  } | undefined;
}

if (!globalThis.__backupScheduler) {
  globalThis.__backupScheduler = {
    cronTask: null,
    intervalTimer: null,
    isSchedulerRunning: false,
    isBackupInProgress: false,
    lastCheckedAt: null,
  };
}

const schedulerState = globalThis.__backupScheduler!;

/**
 * Checks backup configuration and triggers dispatch if schedule is due
 */
export async function checkAndRunBackup() {
  if (schedulerState.isBackupInProgress) {
    return;
  }

  schedulerState.lastCheckedAt = new Date();

  try {
    await connectDB();
    const settings = await getBackupSettings();

    if (!settings) {
      return;
    }

    if (!settings.enabled) {
      return;
    }

    if (!settings.receiverEmail || !settings.receiverEmail.trim()) {
      console.warn("[Backup Scheduler] Scheduler enabled, but receiver email is missing.");
      return;
    }

    const now = new Date();

    // Check if scheduled time has arrived
    if (settings.nextBackupAt && now < new Date(settings.nextBackupAt)) {
      return; // Not due yet
    }

    schedulerState.isBackupInProgress = true;
    console.log(
      `[Backup Scheduler] Triggering scheduled backup to ${settings.receiverEmail} (${settings.frequency}, scope: ${settings.scope || "current_fy"})...`
    );

    const result = await sendScheduledBackup();

    const nextBackupAt = getNextBackupDate(settings.frequency, new Date());
    const db = mongoose.connection.db;

    if (db) {
      await db.collection<BackupSettings>("backup_settings").updateOne(
        { _id: "main" },
        {
          $set: {
            nextBackupAt,
            lastBackupAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    console.log(
      `[Backup Scheduler] Scheduled backup dispatched successfully. Next run: ${nextBackupAt.toISOString()}`
    );
  } catch (error: any) {
    console.error("[Backup Scheduler] Execution error:", error.message || error);

    // On failure, postpone next retry by 5 minutes to prevent rapid retry loops
    try {
      const db = mongoose.connection.db;
      if (db) {
        const retryAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.collection<BackupSettings>("backup_settings").updateOne(
          { _id: "main" },
          {
            $set: {
              nextBackupAt: retryAt,
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch {}
  } finally {
    schedulerState.isBackupInProgress = false;
  }
}

/**
 * Initializes and starts the background backup scheduler daemon (singleton)
 */
export function startBackupScheduler() {
  if (
    schedulerState.isSchedulerRunning &&
    (schedulerState.cronTask !== null || schedulerState.intervalTimer !== null)
  ) {
    return;
  }

  stopBackupScheduler();

  // 1. High precision 30-second interval watchdog
  schedulerState.intervalTimer = setInterval(() => {
    checkAndRunBackup().catch((err) => {
      console.error("[Backup Scheduler Interval Error]:", err.message);
    });
  }, 30 * 1000);

  // 2. Node-cron schedule check every minute
  schedulerState.cronTask = cron.schedule("* * * * *", () => {
    checkAndRunBackup().catch((err) => {
      console.error("[Backup Scheduler Cron Error]:", err.message);
    });
  });

  schedulerState.isSchedulerRunning = true;
  console.log("[Backup Scheduler] Daemon initialized and active (30s watchdog & 1m cron).");

  // Immediate check on startup for overdue tasks
  setTimeout(() => {
    checkAndRunBackup().catch(() => {});
  }, 5000);
}

/**
 * Stops the background backup scheduler daemon
 */
export function stopBackupScheduler() {
  if (schedulerState.cronTask) {
    try {
      schedulerState.cronTask.stop();
    } catch {}
    schedulerState.cronTask = null;
  }

  if (schedulerState.intervalTimer) {
    try {
      clearInterval(schedulerState.intervalTimer);
    } catch {}
    schedulerState.intervalTimer = null;
  }

  schedulerState.isSchedulerRunning = false;
  console.log("[Backup Scheduler] Daemon stopped.");
}

/**
 * Restarts the daemon to apply updated frequencies or settings
 */
export function restartBackupScheduler() {
  stopBackupScheduler();
  startBackupScheduler();
}

/**
 * Query active status
 */
export function isBackupSchedulerActive(): boolean {
  return (
    schedulerState.isSchedulerRunning &&
    (schedulerState.cronTask !== null || schedulerState.intervalTimer !== null)
  );
}

