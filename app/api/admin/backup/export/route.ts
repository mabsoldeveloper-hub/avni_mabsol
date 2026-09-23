import { NextResponse } from "next/server";
import { createEncryptedBackup } from "@/lib/backup-service";
import { promises as fs } from "fs";

export const runtime = "nodejs";

export async function GET() {
  let tempDir: string | undefined;

  try {
    // IMPORTANT:
    // Yahan admin authentication check lagana hai.

    const backup = await createEncryptedBackup();

    tempDir = backup.tempDir;

    const response = new NextResponse(
      new Uint8Array(backup.buffer),
      {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${backup.fileName}"`,
          "Content-Length": backup.buffer.length.toString(),
          "Cache-Control": "no-store",
        },
      }
    );

    setTimeout(async () => {
      if (tempDir) {
        await fs.rm(tempDir, {
          recursive: true,
          force: true,
        });
      }
    }, 1000);

    return response;
  } catch (error) {
    console.error("Backup download error:", error);

    return NextResponse.json(
      {
        message: "Failed to create backup",
      },
      {
        status: 500,
      }
    );
  }
}