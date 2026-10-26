import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
import ExeDownloadLog from "@/models/ExeDownloadLog";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseClientOs(userAgent: string): string {
  if (!userAgent) return "Windows";
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows nt 10.0") || ua.includes("windows nt 11.0") || ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  return "Unknown OS";
}

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("type") || "zip"; // 'zip', 'portable' or 'setup'
    const useGitHub = process.env.USE_GITHUB_RELEASE === "true" || request.nextUrl.searchParams.get("source") === "github";
    const githubReleaseBase = process.env.DESKTOP_AGENT_RELEASE_URL || "https://github.com/mabsoldeveloper-hub/Mabsol_pharma_crm/releases/download/v1.0.0";

    // 1. Authenticate user & check for Super Admin EXE Suspension
    let user: any = null;
    try {
      await dbConnect();
      user = await getCurrentUser();

      if (!user) {
        const authHeader = request.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          try {
            const token = authHeader.substring(7);
            const payload = jwt.verify(token, process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026") as any;
            if (payload && payload.id) {
              user = await User.findById(payload.id).populate("companyId");
            }
          } catch {}
        }
      }

      if (!user) {
        const queryEmail = request.nextUrl.searchParams.get("email");
        const queryUserId = request.nextUrl.searchParams.get("userId");
        if (queryUserId) {
          user = await User.findById(queryUserId).populate("companyId");
        } else if (queryEmail) {
          user = await User.findOne({ email: queryEmail.toLowerCase().trim() }).populate("companyId");
        }
      }

      // Check if this user's EXE access is suspended by Super Admin
      if (user?.exeAccessSuspended) {
        return NextResponse.json(
          {
            success: false,
            exeSuspended: true,
            error: `Desktop Agent (.EXE) access has been suspended for ${user.name || user.email} by Super Administrator.${user.exeSuspendedReason ? ` Reason: ${user.exeSuspendedReason}` : ""}`,
          },
          { status: 403 }
        );
      }

      // Log download event
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "127.0.0.1";
      const userAgent = request.headers.get("user-agent") || "";
      const os = parseClientOs(userAgent);

      const comp: any = user?.companyId || {};
      const isHeadOffice = !comp?.parentCompanyId || comp?.isHeadOffice === true;
      let parentCompanyName = "";

      if (comp?.parentCompanyId) {
        try {
          const CompanyModel = (await import("@/models/Company")).default;
          const parentDoc = await CompanyModel.findById(comp.parentCompanyId).select("companyName").lean();
          if (parentDoc) {
            parentCompanyName = (parentDoc as any).companyName || "";
          }
        } catch {}
      }

      await ExeDownloadLog.create({
        companyId: comp?._id || null,
        companyName: comp?.companyName || user?.name || "Independent / Guest",
        companyCode: comp?.companyCode || "",
        isHeadOffice,
        parentCompanyId: comp?.parentCompanyId || null,
        parentCompanyName,
        userId: user?._id || null,
        userName: user?.name || "Portal User",
        userEmail: user?.email || "",
        userRole: user?.roleName || user?.roleType || "User",
        downloadFormat: format === "setup" ? "setup" : format === "portable" ? "portable" : "zip",
        version: "1.0.0",
        ipAddress,
        userAgent,
        os,
      });
    } catch (logErr) {
      console.error("[EXE DOWNLOAD LOG ERROR]:", logErr);
    }

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
