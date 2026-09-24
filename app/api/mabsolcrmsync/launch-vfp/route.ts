import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch active VFP configuration
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });
    let vfpExePath = config && (config as any).vfpExePath ? (config as any).vfpExePath : (process.env.VFP_EXE_PATH || "MabsolCRM.EXE");
    const startupCommand = config && (config as any).startupCommand ? (config as any).startupCommand : "";
    let configPrgPath = config && (config as any).prgPath ? (config as any).prgPath : "7.PRG";

    // Helper to resolve candidate files across Linux server and Windows paths
    const resolveCandidate = (fileNameOrPath: string, defaultName: string) => {
      if (!fileNameOrPath) fileNameOrPath = defaultName;
      const baseName = path.basename(fileNameOrPath);
      const candidates = [
        fileNameOrPath,
        path.join("/home/vfpuser/MabsolEXE", baseName),
        path.join("/home/vfpuser/MabsolPRG", baseName),
        path.join(/*turbopackIgnore: true*/ process.cwd(), "VfpNew", baseName),
        path.join(/*turbopackIgnore: true*/ process.cwd(), baseName),
        path.join("/home/vfpuser/MabsolCrm/VfpNew", baseName),
        path.join("/home/vfpuser/Mabsol_pharma_crm/VfpNew", baseName),
        path.join("/home/vfpuser/VfpNew", baseName),
        path.join("/home/vfpuser", baseName),
        `C:\\Users\\Administrator\\Downloads\\VfpNew\\VfpNew\\${baseName}`,
      ];
      for (const cand of candidates) {
        try {
          if (cand && fs.existsSync(cand)) return cand;
        } catch {}
      }
      return fileNameOrPath;
    };

    vfpExePath = resolveCandidate(vfpExePath, "MabsolCRM.EXE");
    configPrgPath = resolveCandidate(configPrgPath, "7.PRG");

    // Validate executable and startup command or prgPath exist
    if (!vfpExePath || (!startupCommand.trim() && !configPrgPath.trim())) {
      return NextResponse.json(
        { success: false, error: "MabsolCRM executable path and either Startup Console Command or PRG File Path are required to open the MabsolCRM Engine." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(vfpExePath)) {
      return NextResponse.json(
        { success: false, error: `MabsolCRM executable not found at: ${vfpExePath}. Please ensure MabsolCRM.EXE is uploaded to the server.` },
        { status: 400 }
      );
    }

    const prgPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "vfp_launch_startup.prg");
    const fpwPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "vfp_launch_config.fpw");
    let tempAutomatedPrgPath = "";

    // Write VFP startup file and configuration mapping
    let prgContent = "";
    if (configPrgPath.trim()) {
      const isLinuxServer = process.platform !== "win32";
      const companyCode = config && (config as any).companyName ? (config as any).companyName : "E10";
      const sourceDir = config && (config as any).sourceDir ? (config as any).sourceDir : (isLinuxServer ? "/home/vfpuser/MabsolData" : "Backup");
      const dataDir = config && (config as any).dataDir ? (config as any).dataDir : (isLinuxServer ? "/home/vfpuser/MabsolSyncData" : path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "vfp_uploads"));
      
      // Read target script and replace built-in interactive commands with our custom UDF prefixes
      if (fs.existsSync(configPrgPath)) {
        let originalContent = fs.readFileSync(configPrgPath, "utf8");
        
        // 1. Replace dialog calls to custom UDF versions
        let automatedContent = originalContent
          .replace(/\bINPUTBOX\b/gi, "MY_INPUTBOX")
          .replace(/\bGETDIR\b/gi, "MY_GETDIR")
          .replace(/\bMESSAGEBOX\b/gi, "MY_MESSAGEBOX");
          
        // 2. Rename output database files to format name.company.dbf (e.g. lower(tbl) + "." + lower(compcode) + ".dbf")
        automatedContent = automatedContent.replace(
          /outdbf\s*=\s*tbl\s*\+\s*["']_["']\s*\+\s*compcode\s*\+\s*["']\.DBF["']/gi,
          'outdbf = LOWER(tbl) + "." + LOWER(compcode) + ".dbf"'
        );

        // 3. Dynamically insert lock release and cleanup block after USE IN curdata
        const cleanupCode = 
          `USE IN curdata\r\n` +
          `    LOCAL lcAlias\r\n` +
          `    lcAlias = JUSTSTEM(srcfile)\r\n` +
          `    IF USED(lcAlias)\r\n` +
          `       USE IN (lcAlias)\r\n` +
          `    ENDIF\r\n` +
          `    IF FILE(srcfile)\r\n` +
          `       DELETE FILE (srcfile)\r\n` +
          `    ENDIF`;
          
        automatedContent = automatedContent.replace(/\bUSE\s+IN\s+curdata\b/gi, cleanupCode);
          
        const dirName = path.dirname(configPrgPath);
        const baseName = path.basename(configPrgPath, path.extname(configPrgPath));
        tempAutomatedPrgPath = path.join(dirName, `${baseName}_automated_run.prg`);
        fs.writeFileSync(tempAutomatedPrgPath, automatedContent, "utf8");
      } else {
        return NextResponse.json(
          { success: false, error: `PRG file not found at: ${configPrgPath}` },
          { status: 400 }
        );
      }

      const safePrgPath = tempAutomatedPrgPath.replace(/\\/g, "\\\\");
      
      prgContent = `_SCREEN.Visible = .F.\r\n` +
        `SET SAFETY OFF\r\n` +
        `SET TALK OFF\r\n` +
        `SET ECHO OFF\r\n` +
        `SET EXCLUSIVE OFF\r\n` +
        `SET PROCEDURE TO (SYS(16)) ADDITIVE\r\n\r\n` +
        `PUBLIC _pcCompanyCode, _pcSourceDir, _pcDestDir\r\n` +
        `_pcCompanyCode = "${companyCode}"\r\n` +
        `_pcSourceDir = "${sourceDir}"\r\n` +
        `_pcDestDir = "${dataDir}"\r\n\r\n` +
        `TRY\r\n` +
        `    DO "${safePrgPath}"\r\n` +
        `CATCH TO oErr\r\n` +
        `ENDTRY\r\n\r\n` +
        `QUIT\r\n\r\n` +
        `FUNCTION MY_INPUTBOX(cInputPrompt, cDialogTitle, cDefaultValue, nTimeout, cTimeoutValue, nFlags)\r\n` +
        `    RETURN _pcCompanyCode\r\n` +
        `ENDFUNC\r\n\r\n` +
        `FUNCTION MY_GETDIR(cDirectory, cText, cCaption, nFlags, lCreateFolder)\r\n` +
        `    LOCAL lcText\r\n` +
        `    lcText = UPPER(NVL(cText, ""))\r\n` +
        `    \r\n` +
        `    IF "ENCRYPTED" $ lcText OR "MARG" $ lcText OR "GET" $ lcText OR "SOURCE" $ lcText\r\n` +
        `        RETURN ADDBS(_pcSourceDir)\r\n` +
        `    ENDIF\r\n` +
        `    \r\n` +
        `    IF "COPY" $ lcText OR "DEST" $ lcText OR "TO" $ lcText\r\n` +
        `        RETURN ADDBS(_pcDestDir)\r\n` +
        `    ENDIF\r\n` +
        `    \r\n` +
        `    IF NOT PEMSTATUS(_Screen, "nGetDirCount", 5)\r\n` +
        `        _Screen.AddProperty("nGetDirCount", 1)\r\n` +
        `    ELSE\r\n` +
        `        _Screen.nGetDirCount = _Screen.nGetDirCount + 1\r\n` +
        `    ENDIF\r\n` +
        `    \r\n` +
        `    IF _Screen.nGetDirCount = 1\r\n` +
        `        RETURN ADDBS(_pcSourceDir)\r\n` +
        `    ELSE\r\n` +
        `        RETURN ADDBS(_pcDestDir)\r\n` +
        `    ENDIF\r\n` +
        `ENDFUNC\r\n\r\n` +
        `FUNCTION MY_MESSAGEBOX(cMessageText, nDialogType, cTitleBarText, nTimeout)\r\n` +
        `    RETURN 1\r\n` +
        `ENDFUNC\r\n`;
    } else {
      const keyboardInstruction = startupCommand 
        ? `KEYBOARD [DO "${startupCommand}"] + CHR(13)`
        : `KEYBOARD '* Drag & drop your PRG file here or type script path (e.g. DO "D:\\\\New Folder\\\\1.PRG")' + CHR(13)`;
      
      prgContent = `_SCREEN.Visible = .F.\r\nSET SAFETY OFF\r\nSET TALK OFF\r\n${keyboardInstruction}\r\nQUIT\r\n`;
    }

    fs.writeFileSync(prgPath, prgContent);
    fs.writeFileSync(fpwPath, `SCREEN = OFF\r\nRESOURCE = OFF\r\nCOMMAND = DO "${prgPath}"\r\n`);

    const vfpDir = path.dirname(vfpExePath);

    // Support Windows executable on Linux AWS server via Wine & XRDP Display
    let execCmd = vfpExePath;
    let execArgs = ["-c" + fpwPath];

    if (process.platform !== "win32" && (vfpExePath.toLowerCase().endsWith(".exe") || !fs.existsSync(vfpExePath))) {
      execCmd = "wine";
      execArgs = [vfpExePath, "-c" + fpwPath];
    }

    const displayEnv = process.env.DISPLAY || ":10.0" || ":0";

    // Spawn VFP in detached hidden mode pointing to configuration
    const child = spawn(execCmd, execArgs, {
      cwd: vfpDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        DISPLAY: displayEnv,
      },
    });

    // Unreference the child process so Next.js doesn't wait for it to exit
    child.unref();

    // Clean up temporary script files after a short delay (e.g. 5 seconds)
    setTimeout(() => {
      try {
        if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath);
        if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath);
        const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
        const bakPath = prgPath.replace(/\.prg$/i, ".bak");
        if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath);
        if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
        
        // Clean up temporary automated PRG and FXP
        if (tempAutomatedPrgPath) {
          if (fs.existsSync(tempAutomatedPrgPath)) fs.unlinkSync(tempAutomatedPrgPath);
          const tempFxpPath = tempAutomatedPrgPath.replace(/\.prg$/i, ".fxp");
          if (fs.existsSync(tempFxpPath)) fs.unlinkSync(tempFxpPath);
        }
      } catch (e) {}
    }, 5000);

    // Log VFP launch event in VfpSettingLog and update lastVfpExtractedAt
    try {
      await VfpConfig.updateOne(
        { email: user.email },
        { $set: { lastVfpExtractedAt: new Date() } },
        { upsert: true }
      );
      await VfpSettingLog.create({
        email: user.email,
        userName: (config as any)?.userName || user.name || "Operator",
        companyName: (config as any)?.companyName || "Unknown",
        license: (config as any)?.license || "N/A",
        vfpExePath,
        action: "mabsolcrm_launched",
        status: "success",
        message: `MabsolCRM (${path.basename(vfpExePath)}) engine executed data extraction.`,
      });
    } catch {
      // Ignore logging error
    }

    return NextResponse.json({
      success: true,
      message: `MabsolCRM (${path.basename(vfpExePath)}) executed successfully with pre-loaded command!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
