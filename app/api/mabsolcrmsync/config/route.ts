import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isLinuxServer = process.platform !== "win32";
    const sanitizedEmail = (user.email || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");

    // Exact server paths configured on EC2 Linux server
    const defaultVfpExeCandidates = isLinuxServer
      ? [
          "/home/vfpuser/MabsolEXE/MabsolCRM.exe",
          "/home/vfpuser/MabsolEXE/MabsolCRM.EXE",
          "/home/vfpuser/MabsolCrm/VfpNew/MabsolCRM.EXE",
          "/home/vfpuser/Mabsol_pharma_crm/VfpNew/MabsolCRM.EXE",
          "/home/vfpuser/VfpNew/MabsolCRM.EXE",
          "MabsolCRM.EXE"
        ]
      : [
          "C:\\Users\\Administrator\\Downloads\\VfpNew\\VfpNew\\MabsolCRM.EXE",
          path.join(process.cwd(), "VfpNew", "MabsolCRM.EXE"),
          "MabsolCRM.EXE"
        ];

    const defaultPrgCandidates = isLinuxServer
      ? [
          "/home/vfpuser/MabsolPRG/7.PRG",
          "/home/vfpuser/MabsolPRG/7.prg",
          "/home/vfpuser/MabsolCrm/VfpNew/7.PRG",
          "/home/vfpuser/Mabsol_pharma_crm/VfpNew/7.PRG",
          "/home/vfpuser/VfpNew/7.PRG",
          "7.PRG"
        ]
      : [
          "C:\\Users\\Administrator\\Downloads\\VfpNew\\VfpNew\\7.PRG",
          path.join(process.cwd(), "VfpNew", "7.PRG"),
          "7.PRG"
        ];

    const defaultSourceCandidates = isLinuxServer
      ? [
          "/home/vfpuser/MabsolData",
          "/home/vfpuser/data",
          path.join(process.cwd(), "data"),
          "Backup"
        ]
      : [
          "D:\\Avni_MabsolCRM\\data",
          "D:\\MabsolCrm\\data",
          "D:\\Mabsol_pharma_crm\\data",
          "Backup"
        ];

    const defaultDestDir = isLinuxServer
      ? "/home/vfpuser/MabsolSyncData"
      : path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail);

    let defaultVfpExe = defaultVfpExeCandidates.find((p) => fs.existsSync(p)) || defaultVfpExeCandidates[0];
    let defaultPrg = defaultPrgCandidates.find((p) => fs.existsSync(p)) || defaultPrgCandidates[0];
    let defaultSource = defaultSourceCandidates.find((p) => fs.existsSync(p)) || defaultSourceCandidates[0];

    let dataDir = defaultDestDir;
    let sourceDir = defaultSource;
    let consoleSyncDir = "";
    let enabledFiles: string[] = [];
    let useVfpEngine = false;
    let autoSync = false;
    let autoSyncInterval = 10;
    let vfpExePath = process.env.VFP_EXE_PATH || defaultVfpExe;
    let prgPath = defaultPrg;
    let userName = user.name || "Operator";
    let companyName = (user.companyId as any)?.companyName || "E10";
    let license = "123456";
    let startupCommand = "";
    let isFromDb = false;

    let autoVfpExtract = false;
    let autoVfpExtractInterval = 10;
    let lastVfpExtractedAt: any = null;
    let uploadedSourceFilesCount = 0;
    let lastSourceUploadedAt: any = null;
    let lastUploadedByUserId: string = "";
    let lastUploadedByUserName: string = "";
    let lastUploadedByUserEmail: string = "";

    const config = await VfpConfig.findOne({ email: user.email }).lean();
    if (config) {
      if ((config as any).lastUploadedByUserId) {
        lastUploadedByUserId = (config as any).lastUploadedByUserId;
      }
      if ((config as any).lastUploadedByUserName) {
        lastUploadedByUserName = (config as any).lastUploadedByUserName;
      }
      if ((config as any).lastUploadedByUserEmail) {
        lastUploadedByUserEmail = (config as any).lastUploadedByUserEmail;
      }
      if ((config as any).dataDir) {
        const storedDataDir = (config as any).dataDir;
        if (isLinuxServer && (/^[a-zA-Z]:/i.test(storedDataDir) || storedDataDir.includes("\\"))) {
          dataDir = "/home/vfpuser/MabsolSyncData";
        } else {
          dataDir = storedDataDir;
        }
        isFromDb = true;
      }
      if ((config as any).sourceDir) {
        const storedSource = (config as any).sourceDir;
        if (isLinuxServer && (/^[a-zA-Z]:/i.test(storedSource) || storedSource === "Backup" || storedSource.includes("\\"))) {
          sourceDir = "/home/vfpuser/MabsolData";
        } else {
          sourceDir = storedSource;
        }
      }
      if ((config as any).consoleSyncDir !== undefined) {
        consoleSyncDir = (config as any).consoleSyncDir;
      }
      if ((config as any).enabledFiles) {
        enabledFiles = (config as any).enabledFiles;
      }
      if ((config as any).autoSync !== undefined) {
        autoSync = (config as any).autoSync;
      }
      if ((config as any).autoSyncInterval !== undefined) {
        autoSyncInterval = (config as any).autoSyncInterval;
      }
      if ((config as any).autoVfpExtract !== undefined) {
        autoVfpExtract = (config as any).autoVfpExtract;
      }
      if ((config as any).autoVfpExtractInterval !== undefined) {
        autoVfpExtractInterval = (config as any).autoVfpExtractInterval;
      }
      if ((config as any).lastVfpExtractedAt) {
        lastVfpExtractedAt = (config as any).lastVfpExtractedAt;
      }
      if ((config as any).uploadedSourceFilesCount !== undefined) {
        uploadedSourceFilesCount = (config as any).uploadedSourceFilesCount;
      }
      if ((config as any).lastSourceUploadedAt) {
        lastSourceUploadedAt = (config as any).lastSourceUploadedAt;
      }
      if ((config as any).useVfpEngine !== undefined) {
        useVfpEngine = (config as any).useVfpEngine;
      }
      if ((config as any).vfpExePath) {
        const storedExe = (config as any).vfpExePath;
        if (storedExe === "aab.EXE" || (isLinuxServer && (/^[a-zA-Z]:/i.test(storedExe) || storedExe.includes("\\")))) {
          vfpExePath = "/home/vfpuser/MabsolEXE/MabsolCRM.exe";
        } else {
          vfpExePath = storedExe;
        }
      }
      if ((config as any).prgPath) {
        const storedPrg = (config as any).prgPath;
        if (isLinuxServer && (/^[a-zA-Z]:/i.test(storedPrg) || storedPrg.includes("\\"))) {
          prgPath = "/home/vfpuser/MabsolPRG/7.PRG";
        } else {
          prgPath = storedPrg;
        }
      }
      if ((config as any).userName) {
        userName = (config as any).userName;
      }
      if ((config as any).companyName) {
        companyName = (config as any).companyName;
      }
      if ((config as any).license) {
        license = (config as any).license;
      }
      if ((config as any).startupCommand) {
        startupCommand = (config as any).startupCommand;
      }
    }

    const checkExists = (p: string) => {
      if (!p) return false;
      if (isLinuxServer && /^[a-zA-Z]:/i.test(p)) return true;
      return fs.existsSync(p);
    };

    let liveSourceFilesCount = uploadedSourceFilesCount;
    try {
      if (fs.existsSync(sourceDir)) {
        const files = fs.readdirSync(sourceDir).filter((f) => !f.startsWith(".") && fs.statSync(path.join(sourceDir, f)).isFile());
        liveSourceFilesCount = files.length;
      }
    } catch {}

    const hasSourceData = liveSourceFilesCount > 0;
    const exists = checkExists(dataDir);
    const sourceExists = checkExists(sourceDir);
    const vfpExeExists = checkExists(vfpExePath);

    return NextResponse.json({
      success: true,
      dataDir,
      sourceDir,
      consoleSyncDir,
      enabledFiles,
      autoSync,
      autoSyncInterval,
      autoVfpExtract,
      autoVfpExtractInterval,
      lastVfpExtractedAt,
      uploadedSourceFilesCount: liveSourceFilesCount,
      lastSourceUploadedAt,
      lastUploadedByUserId,
      lastUploadedByUserName,
      lastUploadedByUserEmail,
      hasSourceData,
      useVfpEngine,
      vfpExePath,
      prgPath,
      userName,
      companyName,
      license,
      startupCommand,
      isFromDb,
      exists,
      sourceExists,
      vfpExeExists,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const body = await request.json();
    const { 
      dataDir, 
      sourceDir, 
      enabledFiles, 
      autoSync, 
      autoSyncInterval, 
      autoVfpExtract, 
      autoVfpExtractInterval,
      useVfpEngine, 
      vfpExePath, 
      prgPath, 
      userName, 
      companyName, 
      license, 
      startupCommand 
    } = body;

    const updateFields: any = {};
    const existingConfig = await VfpConfig.findOne({ email: user.email });

    if (dataDir !== undefined) {
      updateFields.dataDir = dataDir ? dataDir.trim() : "";
    }

    if (sourceDir !== undefined) {
      updateFields.sourceDir = sourceDir ? sourceDir.trim() : "";
    }

    const { consoleSyncDir } = body;
    if (consoleSyncDir !== undefined) {
      updateFields.consoleSyncDir = consoleSyncDir ? consoleSyncDir.trim() : "";
    }

    if (enabledFiles !== undefined) {
      if (!Array.isArray(enabledFiles)) {
        return NextResponse.json(
          { success: false, error: "enabledFiles must be an array of strings" },
          { status: 400 }
        );
      }
      updateFields.enabledFiles = enabledFiles;
    }

    if (autoSync !== undefined) {
      updateFields.autoSync = Boolean(autoSync);
    }

    if (autoSyncInterval !== undefined) {
      updateFields.autoSyncInterval = Number(autoSyncInterval) || 10;
    }

    if (autoVfpExtract !== undefined) {
      updateFields.autoVfpExtract = Boolean(autoVfpExtract);
    }

    if (autoVfpExtractInterval !== undefined) {
      updateFields.autoVfpExtractInterval = Number(autoVfpExtractInterval) || 10;
    }

    if (useVfpEngine !== undefined) {
      updateFields.useVfpEngine = Boolean(useVfpEngine);
    }

    if (vfpExePath !== undefined) {
      updateFields.vfpExePath = vfpExePath ? vfpExePath.trim() : "";
    }

    if (prgPath !== undefined) {
      updateFields.prgPath = prgPath ? prgPath.trim() : "";
    }

    if (userName !== undefined) {
      updateFields.userName = userName;
    }
    if (companyName !== undefined) {
      updateFields.companyName = companyName;
    }
    if (license !== undefined) {
      updateFields.license = license;
    }
    if (startupCommand !== undefined) {
      updateFields.startupCommand = startupCommand;
    }

    // Save to database
    await VfpConfig.updateOne(
      { key: "vfp_sync_config_" + user.email },
      { $set: { ...updateFields, email: user.email } },
      { upsert: true }
    );
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: updateFields },
      { upsert: true }
    );

    // Get final values for logging (merging with existing)
    const activeConfig = await VfpConfig.findOne({ email: user.email });
    const logUserName = activeConfig?.userName || user.name || "Unknown";
    const logCompanyName = activeConfig?.companyName || (user.companyId as any)?.companyName || "Unknown";
    const logLicense = activeConfig?.license || "Unknown";
    const logVfpExePath = activeConfig?.vfpExePath || "Unknown";

    // Calculate detailed changes
    const changesList: string[] = [];
    const changes: any = {};
    const fieldsToCompare = ["userName", "companyName", "license", "vfpExePath", "prgPath", "dataDir", "sourceDir", "autoSync", "autoSyncInterval", "useVfpEngine", "enabledFiles", "startupCommand"];
    for (const field of fieldsToCompare) {
      if (body[field] !== undefined) {
        const oldVal = existingConfig ? (existingConfig as any)[field] : undefined;
        const newVal = body[field];
        const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? "");
        const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? "");
        if (oldStr !== newStr) {
          changes[field] = { old: oldVal, new: newVal };
          changesList.push(`${field} changed from "${oldVal ?? ''}" to "${newVal ?? ''}"`);
        }
      }
    }
    const changesMsg = changesList.length > 0 ? changesList.join(", ") : "No configuration properties changed.";

    // Create entry in VfpSettingLog to log this configuration change
    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName: logUserName,
      companyName: logCompanyName,
      license: logLicense,
      vfpExePath: logVfpExePath,
      action: "save_settings",
      status: "success",
      message: changesMsg,
      changes,
    });

    return NextResponse.json({
      success: true,
      message: "VFP configuration updated successfully!",
      config: updateFields,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
