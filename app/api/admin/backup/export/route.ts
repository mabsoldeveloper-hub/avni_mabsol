import { NextResponse } from "next/server";
import { createEncryptedBackup } from "@/lib/backup-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const isAll = searchParams.get("all") === "true";
    const fyId = searchParams.get("fyId");
    const fyName = searchParams.get("fyName");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const backup = await createEncryptedBackup({
      isAll,
      fyId,
      fyName,
      startDate,
      endDate,
    });

    return new NextResponse(new Uint8Array(backup.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Content-Length": backup.buffer.length.toString(),
        "Cache-Control": "no-store",
        "X-Backup-Year": backup.manifest.fyName,
        "X-Backup-Documents": backup.manifest.totalDocuments.toString(),
      },
    });
  } catch (error) {
    console.error("Backup download error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create backup",
      },
      {
        status: 500,
      }
    );
  }
}