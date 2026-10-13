import { NextRequest, NextResponse } from "next/server";
import { createEncryptedBackup } from "@/lib/backup-service";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: any) {
  return withAuth(async (req) => {
    try {
      const { searchParams } = new URL(req.url);

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
  }, { requireAdmin: true })(request, props);
}