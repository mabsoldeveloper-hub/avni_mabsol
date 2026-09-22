import { NextResponse } from "next/server";
import { sendScheduledBackup } from "@/lib/backup-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    // IMPORTANT:
    // Admin authentication check lagao.

    const result = await sendScheduledBackup();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup send error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to send backup",
      },
      { status: 500 }
    );
  }
}