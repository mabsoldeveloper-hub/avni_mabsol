import { NextResponse } from "next/server";
import { restoreEncryptedBackup } from "@/lib/backup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // IMPORTANT:
    // Admin authentication check lagao.

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
        {
          message:
            "Only encrypted .mbak files are allowed",
        },
        { status: 400 }
      );
    }

    const encryptedBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    await restoreEncryptedBackup(
      encryptedBuffer
    );

    return NextResponse.json({
      message: "Database restored successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Restore failed. File may be invalid or encryption key may not match.",
      },
      { status: 500 }
    );
  }
}