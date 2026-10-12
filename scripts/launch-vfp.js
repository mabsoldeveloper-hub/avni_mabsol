const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mongoose = require("mongoose");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
loadEnv(path.join(PROJECT_ROOT, ".env"));

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  let vfpExePath = process.env.VFP_EXE_PATH || "C:\\Program Files (x86)\\Microsoft Visual FoxPro 9\\vfp9.exe";
  let startupCommand = "";
  let configPrgPath = "";
  let companyCode = "";
  let sourceDir = "";
  let dataDir = "";

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, { maxPoolSize: 2 });
      const vfpConfigSchema = new mongoose.Schema({}, { strict: false });
      const VfpConfig = mongoose.models.VfpConfig || mongoose.model("VfpConfig", vfpConfigSchema, "vfpconfigs");
      const config = await VfpConfig.findOne({ dataDir: { $exists: true, $ne: "" } }) || await VfpConfig.findOne({ key: "vfp_sync_config" });
      if (config) {
        if (config.get("vfpExePath")) {
          vfpExePath = config.get("vfpExePath");
        }
        if (config.get("startupCommand")) {
          startupCommand = config.get("startupCommand");
        }
        if (config.get("prgPath")) {
          const rawPrg = config.get("prgPath");
          configPrgPath = /7\.prg/i.test(rawPrg) ? "" : rawPrg;
        }
        if (config.get("companyName")) {
          companyCode = config.get("companyName");
        }
        if (config.get("sourceDir")) {
          sourceDir = config.get("sourceDir");
        }
        if (config.get("dataDir")) {
          dataDir = config.get("dataDir");
        }
      }
    } catch (e) {
      console.warn("[launcher] Warning: Could not connect to MongoDB, using local env fallback.");
    } finally {
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }

  if (!fs.existsSync(vfpExePath)) {
    console.error(`Error: Visual FoxPro executable not found at: ${vfpExePath}`);
    console.log("Please check your .env configuration or VFP Settings for VFP_EXE_PATH.");
    process.exit(1);
  }

  const prgPath = path.join(PROJECT_ROOT, "vfp_startup.prg");
  const fpwPath = path.join(PROJECT_ROOT, "vfp_config.fpw");
  let tempAutomatedPrgPath = "";

  // Write VFP startup file and configuration mapping
  let prgContent = "";
  if (configPrgPath.trim()) {
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
      console.error(`Error: PRG file not found at: ${configPrgPath}`);
      process.exit(1);
    }

    const safePrgPath = tempAutomatedPrgPath.replace(/\\/g, "\\\\");

    prgContent = `SET SAFETY OFF\r\n` +
      `SET TALK OFF\r\n` +
      `SET EXCLUSIVE OFF\r\n` +
      `SET PROCEDURE TO (SYS(16)) ADDITIVE\r\n\r\n` +
      `PUBLIC _pcCompanyCode, _pcSourceDir, _pcDestDir\r\n` +
      `_pcCompanyCode = "${companyCode}"\r\n` +
      `_pcSourceDir = "${sourceDir}"\r\n` +
      `_pcDestDir = "${dataDir}"\r\n\r\n` +
      `DO "${safePrgPath}"\r\n\r\n` +
      `ACTIVATE SCREEN\r\n` +
      `? "SUCCESS: VFP Data sync copy completed successfully!"\r\n\r\n` +
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
      `    ACTIVATE SCREEN\r\n` +
      `    CLEAR\r\n` +
      `    ? "========================================================"\r\n` +
      `    ? "   VFP Synchronization"\r\n` +
      `    ? "========================================================"\r\n` +
      `    ? cMessageText\r\n` +
      `    ? "========================================================"\r\n` +
      `    RETURN 1\r\n` +
      `ENDFUNC\r\n`;
  } else {
    prgContent = `ON ERROR QUIT\r\nSET NOTIFY OFF\r\nSET CONFIRM OFF\r\nSET SAFETY OFF\r\nSET TALK OFF\r\n_SCREEN.Visible = .F.\r\nQUIT\r\n`;
  }

  fs.writeFileSync(prgPath, prgContent);
  fs.writeFileSync(fpwPath, `SCREEN = OFF\r\nRESOURCE = OFF\r\nTITLE = \r\nSYSMENU = OFF\r\nSTATUS BAR = OFF\r\nDEVELOPMENT = OFF\r\nNOTIFY = OFF\r\nTALK = OFF\r\nSAFETY = OFF\r\nCOMMAND = DO "${prgPath}"\r\n`);

  console.log(`Executing VFP headless process...`);

  const child = spawn(vfpExePath, ["-t", "-c" + fpwPath], {
    cwd: path.dirname(vfpExePath),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  // Clean up temporary startup scripts after a brief delay
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
    process.exit(0);
  }, 5000);
}

main().catch((error) => {
  console.error("Launcher error:", error);
  process.exit(1);
});
