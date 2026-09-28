import { NextResponse } from "next/server";
import { sendScheduledBackup } from "@/lib/backup-service";
import { DatabaseBackupOptions } from "@/lib/database-backup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let options: DatabaseBackupOptions | undefined = undefined;

    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        options = {
          isAll: body.isAll === true,
          fyId: body.fyId || null,
          fyName: body.fyName || null,
          startDate: body.startDate || null,
          endDate: body.endDate || null,
        };
      }
    } catch {
      // No JSON body passed, proceed with saved default settings
    }

    const result = await sendScheduledBackup(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup send error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to send backup",
      },
      { status: 500 }
    );
  }
}