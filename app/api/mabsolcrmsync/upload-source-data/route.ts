import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No data files selected for upload." }, { status: 400 });
    }

    const isLinuxServer = process.platform !== "win32";
    const targetSourceDir = isLinuxServer
      ? "/home/vfpuser/MabsolData"
      : path.join(process.cwd(), "data", "MabsolData");

    if (!fs.existsSync(targetSourceDir)) {
      fs.mkdirSync(targetSourceDir, { recursive: true });
    }

    const uploadedFileNames: string[] = [];

    for (const file of files) {
      if (typeof file === "object" && file.name) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = path.basename(file.name);
        const filePath = path.join(targetSourceDir, fileName);
        fs.writeFileSync(filePath, buffer);
        uploadedFileNames.push(fileName);
      }
    }

    // Get total count of files in targetSourceDir
    const allSourceFiles = fs.existsSync(targetSourceDir) 
      ? fs.readdirSync(targetSourceDir).filter((f) => !f.startsWith(".") && fs.statSync(path.join(targetSourceDir, f)).isFile())
      : [];

    const uploaderId = String((user as any)._id || (user as any).id || "");
    const uploaderName = user.name || "Operator";
    const uploaderEmail = user.email || "";
    const uploadTimestamp = new Date();

    // Save source directory path and user upload tracking in VfpConfig
    await VfpConfig.updateOne(
      { email: user.email },
      {
        $set: {
          email: user.email,
          sourceDir: targetSourceDir,
          dataDir: isLinuxServer ? "/home/vfpuser/MabsolSyncData" : path.join(process.cwd(), "data", "vfp_uploads"),
          uploadedSourceFilesCount: allSourceFiles.length,
          lastSourceUploadedAt: uploadTimestamp,
          lastUploadedByUserId: uploaderId,
          lastUploadedByUserName: uploaderName,
          lastUploadedByUserEmail: uploaderEmail,
        },
      },
      { upsert: true }
    );

    // Also update global sync config
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      {
        $set: {
          sourceDir: targetSourceDir,
          uploadedSourceFilesCount: allSourceFiles.length,
          lastSourceUploadedAt: uploadTimestamp,
          lastUploadedByUserId: uploaderId,
          lastUploadedByUserName: uploaderName,
          lastUploadedByUserEmail: uploaderEmail,
        },
      },
      { upsert: true }
    );

    // Record audit trail log of upload with uploader ID
    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName: uploaderName,
      companyName: (user.companyId as any)?.companyName || "Unknown",
      license: uploaderId ? `ID: ${uploaderId.slice(-6)}` : "N/A",
      vfpExePath: "Raw MabsolCRM Data Upload",
      action: "source_data_uploaded",
      status: "success",
      message: `User ${uploaderName} (${uploaderEmail}, ID: ${uploaderId}) uploaded ${uploadedFileNames.length} data file(s) to ${targetSourceDir} (${allSourceFiles.length} total files ready).`,
    });

    return NextResponse.json({
      success: true,
      message: `Uploaded ${uploadedFileNames.length} data file(s) to ${targetSourceDir} successfully! (Total ${allSourceFiles.length} files present on server)`,
      targetSourceDir,
      count: uploadedFileNames.length,
      totalFilesCount: allSourceFiles.length,
      files: uploadedFileNames,
      uploadedBy: {
        userId: uploaderId,
        userName: uploaderName,
        userEmail: uploaderEmail,
        uploadedAt: uploadTimestamp,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload data files to server." },
      { status: 500 }
    );
  }
}
