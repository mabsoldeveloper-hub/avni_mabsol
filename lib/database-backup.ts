import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing");
}

function runCommand(
  command: string,
  args: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} failed with code ${code}: ${stderr}`
          )
        );
      }
    });
  });
}

export async function createRawDatabaseBackup() {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "mongodb-backup-")
  );

  const archivePath = path.join(
    tempDir,
    "database.archive"
  );

  try {
    await runCommand("mongodump", [
      `--uri=${MONGODB_URI}`,
      `--archive=${archivePath}`,
      "--gzip",
    ]);

    return {
      archivePath,
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

export async function restoreRawDatabaseBackup(
  archiveBuffer: Buffer
) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "mongodb-restore-")
  );

  const archivePath = path.join(
    tempDir,
    "uploaded.archive"
  );

  try {
    await fs.writeFile(archivePath, archiveBuffer);

    await runCommand("mongorestore", [
      `--uri=${MONGODB_URI}`,
      `--archive=${archivePath}`,
      "--gzip",
      "--drop",
    ]);

    return {
      message: "Database restored successfully",
    };
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}