import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("type") || "portable"; // 'portable' or 'setup'

    const candidates = [
      path.join(process.cwd(), "dist-electron", format === "setup" ? "MabsolSyncAgent Setup 1.0.0.exe" : "MabsolSyncAgent 1.0.0.exe"),
      path.join(process.cwd(), "dist-electron", "MabsolSyncAgent 1.0.0.exe"),
      path.join(process.cwd(), "dist-electron", "MabsolSyncAgent Setup 1.0.0.exe"),
      path.join(process.cwd(), "public", "downloads", "MabsolSyncAgent.exe"),
    ];

    let foundPath: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Desktop Agent binary not found on server. Please run 'npm run electron:build' to package the latest installer.",
        },
        { status: 404 }
      );
    }

    const stat = fs.statSync(foundPath);
    const fileStream = fs.createReadStream(foundPath);
    const fileName = path.basename(foundPath);

    // Convert node stream to web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
