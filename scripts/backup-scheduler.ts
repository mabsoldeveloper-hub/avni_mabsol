import "dotenv/config";

import cron from "node-cron";
import mongoose from "mongoose";
import {
  BackupSettings,
  getBackupSettings,
  getNextBackupDate,
} from "@/lib/backup-settings";
import { sendScheduledBackup } from "@/lib/backup-service";
import dbConnect from "@/lib/mongodb";

async function checkAndRunBackup() {
  try {
    console.log("[backup] Checking backup schedule...");

    const settings = await getBackupSettings();

    if (!settings) {
      console.log("[backup] Settings not configured");
      return;
    }

    console.log("[backup] Settings:", {
      enabled: settings.enabled,
      frequency: settings.frequency,
      scope: settings.scope || "current_fy",
      nextBackupAt: settings.nextBackupAt,
      now: new Date().toISOString(),
    });

    if (!settings.enabled) {
      console.log("[backup] Automatic backup is disabled");
      return;
    }

    if (
      !settings.nextBackupAt ||
      new Date() < new Date(settings.nextBackupAt)
    ) {
      console.log("[backup] Backup is not due yet");
      return;
    }

    console.log(
      `[backup] Starting scheduled backup for scope: ${settings.scope || "current_fy"}...`
    );

    const result = await sendScheduledBackup();

    const nextBackupAt = getNextBackupDate(settings.frequency, new Date());

    await dbConnect();

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB database connection is not available");
    }

    await db.collection<BackupSettings>("backup_settings").updateOne(
      {
        _id: "main",
      },
      {
        $set: {
          nextBackupAt,
          lastBackupAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      `[backup] Backup sent successfully (${result.manifest.fyName}, ${result.manifest.totalDocuments} docs). Next backup: ${nextBackupAt.toISOString()}`
    );
  } catch (error) {
    console.error("[backup] Scheduled backup failed:", error);
  }
}

console.log("[backup] Backup scheduler started. Checking every minute...");

cron.schedule("* * * * *", async () => {
  await checkAndRunBackup();
});

void checkAndRunBackup();
