import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("type") || "zip"; // 'zip', 'portable' or 'setup'
    const useGitHub = process.env.USE_GITHUB_RELEASE === "true" || request.nextUrl.searchParams.get("source") === "github";
    const githubReleaseBase = process.env.DESKTOP_AGENT_RELEASE_URL || "https://github.com/mabsoldeveloper-hub/Mabsol_pharma_crm/releases/download/v1.0.0";

    if (useGitHub) {
      const remoteFileName = format === "setup"
        ? "MabsolSyncAgent-Setup-1.0.0.exe"
        : format === "zip"
        ? "MabsolSyncAgent.zip"
        : "MabsolSyncAgent-1.0.0.exe";
      return NextResponse.redirect(`${githubReleaseBase}/${remoteFileName}`, 302);
    }

    const isZip = format === "zip";

    const candidates = isZip
      ? [
          path.join(process.cwd(), "public", "downloads", "MabsolSyncAgent.zip"),
          path.join(process.cwd(), "dist-electron", "MabsolSyncAgent.zip"),
          path.join(process.cwd(), "public", "downloads", "MabsolSyncAgent.exe"),
        ]
      : [
          path.join(process.cwd(), "dist-electron", format === "setup" ? "MabsolSyncAgent Setup 1.0.0.exe" : "MabsolSyncAgent 1.0.0.exe"),
          path.join(process.cwd(), "public", "downloads", format === "setup" ? "MabsolSyncAgent_Setup.exe" : "MabsolSyncAgent_Portable.exe"),
          path.join(process.cwd(), "public", "downloads", "MabsolSyncAgent.exe"),
          path.join(process.cwd(), "dist-electron", "MabsolSyncAgent 1.0.0.exe"),
          path.join(process.cwd(), "dist-electron", "MabsolSyncAgent Setup 1.0.0.exe"),
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
    const contentType = isZip || fileName.endsWith(".zip") 
      ? "application/zip" 
      : "application/vnd.microsoft.portable-executable";

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
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
