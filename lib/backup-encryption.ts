import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.BACKUP_ENCRYPTION_KEY?.trim();

  if (!key) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY is missing"
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters"
    );
  }

  return Buffer.from(key, "hex");
}

/**
 * Binary backup ko encrypt karta hai.
 *
 * File structure:
 * [12 bytes IV][16 bytes Auth Tag][Encrypted Data]
 */
export function encryptBackup(
  data: Buffer
): Buffer {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    iv,
    authTag,
    encrypted,
  ]);
}

/**
 * Encrypted backup ko decrypt karta hai.
 */
export function decryptBackup(
  encryptedData: Buffer
): Buffer {
  const key = getEncryptionKey();

  if (encryptedData.length < 28) {
    throw new Error("Invalid encrypted backup file");
  }

  const iv = encryptedData.subarray(0, 12);
  const authTag = encryptedData.subarray(12, 28);
  const encrypted = encryptedData.subarray(28);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}