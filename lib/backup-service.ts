import {
  createRawDatabaseBackup,
  restoreRawDatabaseBackup,
  inspectDatabaseBackup,
  DatabaseBackupOptions,
  BackupManifest,
} from "./database-backup";

import {
  encryptBackup,
  decryptBackup,
} from "./backup-encryption";

import {
  getBackupSettings,
  BackupSettings,
} from "./backup-settings";

import {
  sendBackupEmail,
} from "./backup-email";

import connectDB from "./mongodb";
import mongoose from "mongoose";

export interface SendBackupOptions extends DatabaseBackupOptions {
  receiverEmail?: string;
  force?: boolean;
}

export async function createEncryptedBackup(options: DatabaseBackupOptions = {}) {
  const { archiveBuffer, manifest, fileName } =
    await createRawDatabaseBackup(options);

  const encryptedBuffer = encryptBackup(archiveBuffer);

  return {
    fileName,
    buffer: encryptedBuffer,
    manifest,
  };
}

export async function inspectEncryptedBackup(encryptedBuffer: Buffer) {
  const rawBuffer = decryptBackup(encryptedBuffer);
  return inspectDatabaseBackup(rawBuffer);
}

export async function sendScheduledBackup(options?: SendBackupOptions) {
  const settings = await getBackupSettings();

  const isManual = Boolean(
    options && (
      options.force ||
      options.receiverEmail ||
      options.isAll !== undefined ||
      options.fyId !== undefined ||
      options.startDate !== undefined
    )
  );

  // If triggered automatically by scheduler, verify enabled flag
  if (!isManual && (!settings || !settings.enabled)) {
    throw new Error("Backup scheduler is disabled");
  }

  const targetEmail = (
    options?.receiverEmail ||
    settings?.receiverEmail ||
    ""
  ).trim();

  if (!targetEmail) {
    throw new Error("Receiver email is not configured. Please enter a valid receiver email.");
  }

  // Determine backup options from settings if not explicitly passed
  let backupOptions: DatabaseBackupOptions = {};

  if (options && (options.isAll || options.fyId || options.startDate)) {
    backupOptions = {
      isAll: options.isAll,
      fyId: options.fyId,
      fyName: options.fyName,
      startDate: options.startDate,
      endDate: options.endDate,
    };
  } else if (settings) {
    if (settings.scope === "all") {
      backupOptions = { isAll: true };
    } else if (settings.scope === "custom") {
      backupOptions = {
        isAll: false,
        fyId: settings.financialYearId,
        fyName: settings.financialYearName,
        startDate: settings.customStartDate,
        endDate: settings.customEndDate,
      };
    } else {
      // "current_fy" (default)
      backupOptions = { isAll: false };
    }
  }

  const backup = await createEncryptedBackup(backupOptions);

  await sendBackupEmail({
    receiverEmail: targetEmail,
    fileName: backup.fileName,
    buffer: backup.buffer,
    fyName: backup.manifest.fyName,
  });

  // Update lastBackupAt timestamp in MongoDB
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (db) {
      await db.collection<BackupSettings>("backup_settings").updateOne(
        { _id: "main" },
        {
          $set: {
            lastBackupAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }
  } catch (err: any) {
    console.warn("[sendScheduledBackup] Failed to update lastBackupAt:", err.message);
  }

  return {
    success: true,
    message: `Encrypted backup archive (${backup.fileName}) sent successfully to ${targetEmail}`,
    fileName: backup.fileName,
    manifest: backup.manifest,
  };
}

export async function restoreEncryptedBackup(
  encryptedBuffer: Buffer,
  options?: { mode?: "replace_year" | "merge" }
) {
  const rawBuffer = decryptBackup(encryptedBuffer);
  return restoreRawDatabaseBackup(rawBuffer, options);
}