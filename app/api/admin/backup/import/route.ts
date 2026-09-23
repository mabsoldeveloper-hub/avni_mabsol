import { NextResponse } from "next/server";
import { restoreEncryptedBackup } from "@/lib/backup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const mode = formData.get("mode") as "replace_year" | "merge" | null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Backup file is required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".mbak")) {
      return NextResponse.json(
        {
          message: "Only encrypted .mbak files are allowed",
        },
        { status: 400 }
      );
    }

    const encryptedBuffer = Buffer.from(await file.arrayBuffer());

    const result = await restoreEncryptedBackup(encryptedBuffer, {
      mode: mode || "replace_year",
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      manifest: result.manifest,
      stats: result.stats,
    });
  } catch (error) {
    console.error("Database restore error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Restore failed. File may be corrupted or encryption key may not match.",
      },
      { status: 500 }
    );
  }
}