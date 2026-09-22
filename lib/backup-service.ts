import { promises as fs } from "fs";

import {
  createRawDatabaseBackup,
  restoreRawDatabaseBackup,
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

export async function createEncryptedBackup() {
  const { archivePath, tempDir } =
    await createRawDatabaseBackup();

  try {
    const rawBuffer = await fs.readFile(archivePath);

    const encryptedBuffer = encryptBackup(rawBuffer);

    const fileName = `database-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.mbak`;

    return {
      fileName,
      buffer: encryptedBuffer,
      tempDir,
    };
  } catch (error) {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}

export async function sendScheduledBackup() {
  const settings = await getBackupSettings();

  if (!settings) {
    throw new Error(
      "Backup settings are not configured",
    );
  }

  if (!settings.enabled) {
    throw new Error(
      "Backup scheduler is disabled",
    );
  }

  if (!settings.receiverEmail) {
    throw new Error(
      "Receiver Gmail is not configured",
    );
  }

  const backup = await createEncryptedBackup();

  try {
    await sendBackupEmail({
      receiverEmail: settings.receiverEmail,
      fileName: backup.fileName,
      buffer: backup.buffer,
    });

    return {
      message: "Backup sent successfully",
      fileName: backup.fileName,
    };
  } finally {
    await fs.rm(backup.tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function restoreEncryptedBackup(
  encryptedBuffer: Buffer,
) {
  const rawBuffer = decryptBackup(encryptedBuffer);

  return restoreRawDatabaseBackup(rawBuffer);
}