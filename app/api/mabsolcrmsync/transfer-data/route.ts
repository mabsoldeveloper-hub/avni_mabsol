import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

// Recursive copy of VFP database files
function copyVfpFilesRecursively(src: string, dest: string, companyName?: string): number {
  if (!fs.existsSync(src)) return 0;

  // Ensure destination folder exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let copiedCount = 0;

  const targetCompanyExt = companyName ? `.${companyName.toLowerCase()}` : "";

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Avoid temporary, hidden, backup, or lock folders to keep copy fast
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
      copiedCount += copyVfpFilesRecursively(srcPath, destPath, companyName);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Common VFP and FoxPro extensions
      const validExtensions = [".dbf", ".fpt", ".cdx", ".idx", ".dbc", ".dct", ".dcx"];
      if (validExtensions.includes(ext) || (targetCompanyExt && ext === targetCompanyExt)) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
      }
    }
  }
  return copiedCount;
}

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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyName, sourceDir, dataDir } = body;

    if (!dataDir) {
      return NextResponse.json(
        { success: false, error: "dataDir (Sync Directory) is required" },
        { status: 400 }
      );
    }

    // Validate dataDir exists
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json(
        { success: false, error: `Sync folder does not exist on local disk: ${dataDir}` },
        { status: 400 }
      );
    }

    const dataStat = fs.statSync(dataDir);
    if (!dataStat.isDirectory()) {
      return NextResponse.json(
        { success: false, error: `Sync folder path is not a directory: ${dataDir}` },
        { status: 400 }
      );
    }

    // Load VFP config to see if we should use VFP Engine
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });
    const useVfpEngine = config ? (config as any).useVfpEngine : false;
    const vfpExePath = config && (config as any).vfpExePath ? (config as any).vfpExePath : (process.env.VFP_EXE_PATH || "");

    let copiedCount = 0;
    let methodUsed = "direct_sync";

    const shouldCopy = sourceDir && sourceDir.trim() !== "" && sourceDir.trim() !== dataDir.trim();

    if (shouldCopy) {
      // Validate sourceDir exists
      if (!fs.existsSync(sourceDir)) {
        return NextResponse.json(
          { success: false, error: `Source folder does not exist: ${sourceDir}` },
          { status: 400 }
        );
      }
      const sourceStat = fs.statSync(sourceDir);
      if (!sourceStat.isDirectory()) {
        return NextResponse.json(
          { success: false, error: `Source path is not a directory: ${sourceDir}` },
          { status: 400 }
        );
      }
      if (!vfpExePath || !fs.existsSync(vfpExePath)) {
        return NextResponse.json(
          { success: false, error: `VFP Engine is enabled, but VFP executable was not found at: ${vfpExePath || "not configured"}` },
          { status: 400 }
        );
      }

      methodUsed = "vfp_engine";
      const prgPath = path.join(process.cwd(), "vfp_export.prg");
      const fpwPath = path.join(process.cwd(), "vfp_config.fpw");

      try {
        // Show VFP screen in foreground
        fs.writeFileSync(fpwPath, "SCREEN = ON\r\n");

        // Generate VFP export script with status wait windows
        const dbfFiles = listDbfFiles(sourceDir);
        let prgLines = [
          "SET SAFETY OFF",
          "SET TALK OFF",
          'WAIT WINDOW "MabsolCrm - Starting Import..." TIMEOUT 1',
          ""
        ];

        for (const relativeDbf of dbfFiles) {
          const srcPath = path.resolve(path.join(sourceDir, relativeDbf)).replace(/\//g, "\\");
          const destPath = path.resolve(path.join(dataDir, relativeDbf)).replace(/\//g, "\\");
          const destFolder = path.dirname(destPath);
          const baseName = path.basename(relativeDbf);

          // Ensure destination folder exists
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

        prgLines.push('WAIT WINDOW "MabsolCrm - VFP Import Complete!" TIMEOUT 1.5');
        prgLines.push("QUIT");
        fs.writeFileSync(prgPath, prgLines.join("\r\n"));

        // Execute in foreground setting cwd to VFP folder so DLLs are found
        const vfpDir = path.dirname(vfpExePath);
        await execFileAsync(vfpExePath, ["-c" + fpwPath, prgPath], {
          cwd: vfpDir
        });

      } catch (execError: any) {
        return NextResponse.json(
          { success: false, error: `VFP Engine execution error: ${execError.message}` },
          { status: 500 }
        );
      } finally {
        // Clean up temporary script files
        if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath);
        if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath);
      }
    } else {
      // Standard filesystem copy
      try {
        copiedCount = copyVfpFilesRecursively(sourceDir, dataDir, companyName);
      } catch (copyError: any) {
        return NextResponse.json(
          { success: false, error: `Error copying VFP files: ${copyError.message}` },
          { status: 500 }
        );
      }
    }

    // Save configuration
    await VfpConfig.updateOne(
      { key: "vfp_sync_config_" + user.email },
      {
        $set: {
          companyName,
          sourceDir,
          dataDir,
          email: user.email,
        },
      },
      { upsert: true }
    );

    // Get list of available DBF files
    const dbfFiles = listDbfFiles(dataDir);

    return NextResponse.json({
      success: true,
      message: useVfpEngine
        ? `Successfully exported ${copiedCount} tables using the MabsolCRM engine!`
        : `Successfully transferred ${copiedCount} database files!`,
      copiedCount,
      dbfFiles,
      sourceDir,
      dataDir,
      methodUsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
