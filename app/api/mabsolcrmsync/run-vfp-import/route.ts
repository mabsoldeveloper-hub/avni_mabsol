import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

// Recursively find all DBF files relative to rootDir
function listDbfFiles(rootDir: string, currentDir: string = rootDir): string[] {
  const results: string[] = [];
  if (!fs.existsSync(currentDir)) return results;

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const dirNameLower = entry.name.toLowerCase();
      if (
        entry.name.startsWith("_") ||
        entry.name.startsWith("~") ||
        dirNameLower.includes("temp") ||
        dirNameLower.includes("tmp") ||
        dirNameLower.includes("backup")
      ) {
        continue;
      }
      results.push(...listDbfFiles(rootDir, fullPath));
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith(".dbf")) {
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
        results.push(relativePath);
      }
    }
  }
  return results;
}

export async function POST() {
  const prgPath = path.join(process.cwd(), "vfp_run_import.prg");
  const fpwPath = path.join(process.cwd(), "vfp_run_config.fpw");

  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Load active configuration
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });
    if (!config) {
      return NextResponse.json(
        { success: false, error: "VFP Sync is not configured. Please use the Sync Wizard first." },
        { status: 400 }
      );
    }

    const { sourceDir, dataDir, vfpExePath } = config as any;

    if (!sourceDir || !dataDir) {
      return NextResponse.json(
        { success: false, error: "Source Folder and Sync Folder must be configured in the Sync Wizard before importing." },
        { status: 400 }
      );
    }

    const activeVfpExe = vfpExePath || process.env.VFP_EXE_PATH || "";

    if (!activeVfpExe) {
      return NextResponse.json(
        { success: false, error: "VFP executable path is not configured. Please set the path in the Sync Wizard or define VFP_EXE_PATH in your environment." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(activeVfpExe)) {
      return NextResponse.json(
        { success: false, error: `VFP executable not found at: ${activeVfpExe}` },
        { status: 400 }
      );
    }

    if (!fs.existsSync(sourceDir)) {
      return NextResponse.json(
        { success: false, error: `Source directory does not exist: ${sourceDir}` },
        { status: 400 }
      );
    }

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Show VFP screen in foreground
    fs.writeFileSync(fpwPath, "SCREEN = ON\r\n");

    // Generate VFP script to copy files
    const dbfFiles = listDbfFiles(sourceDir);
    let prgLines = [
      "SET SAFETY OFF",
      "SET TALK OFF",
      'WAIT WINDOW "MabsolCrm - Starting Import..." TIMEOUT 1',
      ""
    ];
    let copiedCount = 0;

    for (const relativeDbf of dbfFiles) {
      const srcPath = path.resolve(path.join(sourceDir, relativeDbf)).replace(/\//g, "\\");
      const destPath = path.resolve(path.join(dataDir, relativeDbf)).replace(/\//g, "\\");
      const destFolder = path.dirname(destPath);
      const baseName = path.basename(relativeDbf);

      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      prgLines.push(`WAIT WINDOW "Importing table: ${baseName}..." NOWAIT`);
      prgLines.push(`TRY`);
      prgLines.push(`  USE "${srcPath}" SHARED NOUPDATE`);
      prgLines.push(`  COPY TO "${destPath}"`);
      prgLines.push(`  USE`);
      prgLines.push(`CATCH`);
      prgLines.push(`ENDTRY`);
      prgLines.push(``);
      copiedCount++;
    }

    prgLines.push('WAIT WINDOW "MabsolCrm - Import Complete!" TIMEOUT 1.5');
    prgLines.push("QUIT");
    fs.writeFileSync(prgPath, prgLines.join("\r\n"));

    // Log start of import command
    const command = await VfpSyncCommand.create({
      command: "rescan",
      status: "queued",
      requestedBy: "crm",
      email: user.email,
    });

    await VfpSyncLog.create({
      runId: String(command._id),
      email: user.email,
      action: "rescan",
      status: "queued",
      message: "Direct MabsolCRM import and rescan triggered from dashboard.",
    });

    // Run VFP command in foreground setting cwd to VFP folder so DLLs are found
    const vfpDir = path.dirname(activeVfpExe);
    await execFileAsync(activeVfpExe, ["-c" + fpwPath, prgPath], {
      cwd: vfpDir
    });

    return NextResponse.json({
      success: true,
      message: `MabsolCRM Engine successfully extracted and imported ${copiedCount} tables!`,
      copiedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    // Clean up files
    if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath);
    if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath);
  }
}
