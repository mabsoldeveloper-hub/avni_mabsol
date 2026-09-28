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
} from "./backup-settings";

import {
  sendBackupEmail,
} from "./backup-email";

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

export async function sendScheduledBackup(options?: DatabaseBackupOptions) {
  const settings = await getBackupSettings();

  if (!settings) {
    throw new Error("Backup settings are not configured");
  }

  if (!settings.enabled) {
    throw new Error("Backup scheduler is disabled");
  }

  if (!settings.receiverEmail) {
    throw new Error("Receiver Gmail is not configured");
  }

  // Determine backup options from settings if not explicitly passed
  let backupOptions: DatabaseBackupOptions = options || {};
  if (!options) {
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
    receiverEmail: settings.receiverEmail,
    fileName: backup.fileName,
    buffer: backup.buffer,
    fyName: backup.manifest.fyName,
  });

  return {
    message: "Backup sent successfully",
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