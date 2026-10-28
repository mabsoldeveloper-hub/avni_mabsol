import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];

    // Security check: Prevent directory traversal
    if (
      pathSegments.length === 0 ||
      pathSegments.some((seg) => seg.includes("..") || seg.includes("/") || seg.includes("\\"))
    ) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const relativeSubPath = path.join(...pathSegments);

    // Potential locations where uploads could be located on live server & local
    const candidateDirs = [
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "uploads"),
      path.join(process.cwd(), ".next", "standalone", "public", "uploads"),
      path.join(process.cwd(), ".next", "standalone", "uploads"),
    ];

    let targetFilePath: string | null = null;
    for (const baseDir of candidateDirs) {
      const fullPath = path.join(baseDir, relativeSubPath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        targetFilePath = fullPath;
        break;
      }
    }

    if (!targetFilePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileBuffer = fs.readFileSync(targetFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to serve file" }, { status: 500 });
  }
}
