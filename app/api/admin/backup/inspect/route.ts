import { NextResponse } from "next/server";
import { inspectEncryptedBackup } from "@/lib/backup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Backup file is required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".mbak")) {
      return NextResponse.json(
        { message: "Only encrypted .mbak files are supported" },
        { status: 400 }
      );
    }

    const encryptedBuffer = Buffer.from(await file.arrayBuffer());
    const inspection = await inspectEncryptedBackup(encryptedBuffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      inspection,
    });
  } catch (error) {
    console.error("Backup inspection error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to inspect backup file. Key mismatch or corrupted file.",
      },
      { status: 400 }
    );
  }
}

