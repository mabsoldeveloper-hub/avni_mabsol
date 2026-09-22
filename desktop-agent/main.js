const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const axios = require("axios");
const FormData = require("form-data");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let syncIntervalTimer = null;
let heartbeatTimer = null;
let isSyncing = false;
let isOnlineState = true;

// Data directory for user config & session storage
const USER_DATA_DIR = app.getPath("userData");
const CONFIG_PATH = path.join(USER_DATA_DIR, "mabsol_sync_config.json");
const SESSION_PATH = path.join(USER_DATA_DIR, "mabsol_auth_session.json");
const QUEUE_PATH = path.join(USER_DATA_DIR, "mabsol_sync_queue.json");

// Engine directory (contains MabsolCRM.EXE, security core, and dependencies)
const ENGINE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "engine")
  : path.join(__dirname, "engine");

// ---------------------------------------------------------------------------
// Helpers: Config & Storage
// ---------------------------------------------------------------------------
function loadConfig() {
  const defaults = {
    cloudUrl: "https://phcrm.mabsolinfotech.cloud",
    companyName: "",
    companyCode: "E10",
    sourceDir: "",
    destDir: path.join(USER_DATA_DIR, "staging"),
    autoSync: false,
    intervalMins: 10,
    licenseKey: ""
  };
  if (!fs.existsSync(CONFIG_PATH)) return defaults;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function loadSession() {
  if (!fs.existsSync(SESSION_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    if (session) {
      fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2), "utf8");
    } else if (fs.existsSync(SESSION_PATH)) {
      fs.unlinkSync(SESSION_PATH);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), "utf8");
  } catch {}
}

function emitLog(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:log", { timestamp, level, message });
  }
}

function emitStatus(statusObj) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:status-changed", statusObj);
  }
}

function emitNetwork(isOnline) {
  isOnlineState = isOnline;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("network:status-changed", { isOnline });
  }
}

// ---------------------------------------------------------------------------
// Window Creation & System Tray
// ---------------------------------------------------------------------------
function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, "mabsol_logo.ico");
  if (!fs.existsSync(iconPath)) return;

  try {
    tray = new Tray(iconPath);
    tray.setToolTip("Mabsol CRM Desktop Sync Agent (Running in background)");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Console",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: "Sync Now",
        click: () => {
          executeDecryptionAndSync("tray_manual").catch(() => {});
        }
      },
      { type: "separator" },
      {
        label: "Exit Agent",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error("Failed to initialize system tray:", err);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, "mabsol_logo.ico");

  mainWindow = new BrowserWindow({
    width: 980,
    height: 740,
    minWidth: 860,
    minHeight: 640,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
    title: "Mabsol Pharma CRM - Desktop Sync Agent",
  });

  mainWindow.setMenuBarVisibility(false);

  // Disable DevTools / Inspect inspection
  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools();
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      input.key === "F12" ||
      ((input.control || input.meta) && input.shift && (input.key.toLowerCase() === "i" || input.key.toLowerCase() === "j")) ||
      ((input.control || input.meta) && input.key.toLowerCase() === "u")
    ) {
      event.preventDefault();
    }
  });

  // Minimize to tray on close instead of exiting
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Start background network heartbeat & queue sync watcher
  startNetworkWatcher();

  // Setup auto-sync if configured
  const cfg = loadConfig();
  if (cfg.autoSync) {
    setupAutoSyncTimer(cfg.intervalMins);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (isQuitting || process.platform === "darwin") {
    app.quit();
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers: Authentication
// ---------------------------------------------------------------------------
ipcMain.handle("auth:login", async (_event, { cloudUrl, email, password }) => {
  try {
    emitLog("info", `Authenticating with cloud server (${cloudUrl})...`);
    const cleanUrl = cloudUrl.replace(/\/+$/, "");
    const res = await axios.post(`${cleanUrl}/api/auth/login`, { email, password }, { timeout: 15000 });

    if (res.data && res.data.success) {
      if (res.data.directLogin || res.data.token) {
        let token = res.data.token || "";
        if (!token) {
          const setCookies = res.headers["set-cookie"];
          if (Array.isArray(setCookies)) {
            for (const c of setCookies) {
              const match = c.match(/token=([^;]+)/);
              if (match) {
                token = match[1];
                break;
              }
            }
          }
        }
        const verifiedEmail = email || res.data.user?.email || "";
        const session = {
          user: res.data.user,
          email: verifiedEmail,
          token,
          cloudUrl: cleanUrl,
          loggedInAt: new Date().toISOString()
        };
        saveSession(session);
        const cfg = loadConfig();
        cfg.userEmail = verifiedEmail;
        cfg.cloudUrl = cleanUrl;
        saveConfig(cfg);
        emitLog("success", `Login verified! Welcome, ${res.data.user?.name || verifiedEmail}`);
        return { success: true, directLogin: true, user: res.data.user, session };
      }

      emitLog("success", `Credentials validated! Verification OTP sent to ${email}`);
      return {
        success: true,
        otpRequired: Boolean(res.data.otpRequired),
        email: res.data.email || email,
        message: res.data.message || "OTP sent to your email and WhatsApp"
      };
    } else {
      const msg = res.data?.message || "Invalid email or password.";
      emitLog("error", `Login failed: ${msg}`);
      return { success: false, message: msg };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    emitLog("error", `Login network error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    if (!payload.exp) return false;
    return (payload.exp * 1000) < Date.now();
  } catch {
    return true;
  }
}

ipcMain.handle("auth:verify-otp", async (_event, { cloudUrl, email, otp }) => {
  try {
    emitLog("info", "Verifying 6-digit OTP code...");
    const cleanUrl = cloudUrl.replace(/\/+$/, "");
    const res = await axios.post(`${cleanUrl}/api/auth/verify-otp`, { email, otp, isDesktopAgent: true }, { timeout: 15000 });

    if (res.data && res.data.success) {
      // Extract auth token from JSON body or from set-cookie headers
      let token = res.data.token || "";
      if (!token) {
        const setCookies = res.headers["set-cookie"];
        if (Array.isArray(setCookies)) {
          for (const c of setCookies) {
            const match = c.match(/token=([^;]+)/);
            if (match) {
              token = match[1];
              break;
            }
          }
        }
      }

      const verifiedEmail = email || res.data.user?.email || "";
      const session = {
        user: res.data.user,
        email: verifiedEmail,
        token,
        cloudUrl: cleanUrl,
        loggedInAt: new Date().toISOString()
      };
      saveSession(session);

      // Also persist userEmail into config so it is always preserved across runs
      const cfg = loadConfig();
      cfg.userEmail = verifiedEmail;
      cfg.cloudUrl = cleanUrl;
      saveConfig(cfg);

      emitLog("success", `Login verified! Welcome, ${res.data.user?.name || verifiedEmail}`);
      return { success: true, user: res.data.user, session };
    } else {
      const msg = res.data?.message || "Invalid or expired OTP.";
      emitLog("error", `OTP verification failed: ${msg}`);
      return { success: false, message: msg };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    emitLog("error", `OTP error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

ipcMain.handle("auth:check-session", async () => {
  const session = loadSession();
  if (!session || !session.user) return { authenticated: false };
  if (isTokenExpired(session.token)) {
    emitLog("warn", "Cloud session token has expired. Re-authentication available.");
    return {
      authenticated: false,
      sessionExpired: true,
      email: session.email || session.user?.email || ""
    };
  }

  // Live verify account status with cloud server
  const cloudUrl = (session.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  try {
    const res = await axios.get(`${cloudUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Cache-Control": "no-cache"
      },
      timeout: 5000
    });
    if (!res.data || !res.data.success) {
      if (res.data?.suspended) {
        const suspMsg = res.data.message || "Your account has been deactivated or suspended. Please contact administrator.";
        emitLog("error", `Access Denied: ${suspMsg}`);
        saveSession(null);
        return {
          authenticated: false,
          accountSuspended: true,
          message: suspMsg,
          email: session.email || ""
        };
      }
    }
  } catch (err) {
    if (err.response?.status === 403 || err.response?.data?.suspended) {
      const suspMsg = err.response?.data?.message || "Your account has been deactivated or suspended. Please contact administrator.";
      emitLog("error", `Access Denied: ${suspMsg}`);
      saveSession(null);
      return {
        authenticated: false,
        accountSuspended: true,
        message: suspMsg,
        email: session.email || ""
      };
    }
    // If offline or network timeout, allow offline queueing to proceed
  }

  return { authenticated: true, session };
});

ipcMain.handle("auth:logout", async () => {
  saveSession(null);
  emitLog("info", "Logged out from Desktop Agent.");
  return { success: true };
});

ipcMain.handle("auth:send-edit-otp", async (_event, data) => {
  const session = loadSession();
  const config = loadConfig();
  const cloudUrl = (data?.cloudUrl || session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const email = (data?.email || session?.email || session?.user?.email || config.userEmail || "").trim();
  const token = session?.token || "";

  if (!email) {
    const msg = "No logged-in account email found. Please login to verify settings edit.";
    emitLog("error", msg);
    return { success: false, unauthorized: true, message: msg };
  }

  // If token is known to be expired, indicate unauthorized so UI can offer password verification
  if (token && isTokenExpired(token)) {
    const msg = "Your cloud session has expired. Please verify with your password to unlock settings.";
    emitLog("warn", msg);
    return { success: false, unauthorized: true, message: msg, email };
  }

  try {
    emitLog("info", `Sending settings edit verification code to ${email}...`);
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-agent-email": email
    };

    const res = await axios.post(
      `${cloudUrl}/api/mabsolcrmsync/send-otp`,
      { email },
      { headers, timeout: 15000 }
    );
    if (res.data && res.data.success) {
      emitLog("info", `Security verification code sent to ${email}`);
      return { success: true, message: res.data.message, email };
    }
    return { success: false, message: res.data?.message || "Failed to send verification code." };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const isUnauthorized = err.response?.status === 401 || (typeof msg === "string" && msg.toLowerCase().includes("unauthorized"));
    emitLog("error", `Security verification request notice: ${msg}`);
    return { success: false, unauthorized: isUnauthorized, message: msg, email };
  }
});

ipcMain.handle("auth:verify-edit-otp", async (_event, data) => {
  const session = loadSession();
  const config = loadConfig();
  const otp = String(data?.otp || "").trim();
  const cloudUrl = (data?.cloudUrl || session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const email = (data?.email || session?.email || session?.user?.email || config.userEmail || "").trim();
  const token = session?.token || "";

  if (!otp) {
    return { success: false, message: "Please enter the 6-digit verification code." };
  }

  try {
    emitLog("info", "Verifying security unlock code...");
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-agent-email": email
    };

    const res = await axios.post(
      `${cloudUrl}/api/mabsolcrmsync/verify-otp`,
      { email, otp },
      { headers, timeout: 15000 }
    );
    if (res.data && res.data.success) {
      emitLog("success", "Settings unlocked! You may now edit the configuration.");
      return { success: true };
    }
    return { success: false, message: res.data?.message || "Invalid or expired security code." };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const isUnauthorized = err.response?.status === 401 || (typeof msg === "string" && msg.toLowerCase().includes("unauthorized"));
    emitLog("error", `Settings unlock error: ${msg}`);
    return { success: false, unauthorized: isUnauthorized, message: msg };
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers: Config & File Dialog
// ---------------------------------------------------------------------------
ipcMain.handle("config:get", async () => {
  return loadConfig();
});

ipcMain.handle("config:save", async (_event, newCfg) => {
  const current = loadConfig();
  const merged = { ...current, ...newCfg };
  const res = saveConfig(merged);
  if (merged.autoSync) {
    setupAutoSyncTimer(merged.intervalMins);
  } else {
    clearInterval(syncIntervalTimer);
  }
  emitLog("info", "Configuration saved successfully.");
  return res;
});

ipcMain.handle("dialog:select-folder", async (_event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("sync:start", async () => {
  if (isSyncing) return { success: false, message: "Sync is already in progress." };
  return await executeDecryptionAndSync("manual");
});

ipcMain.handle("sync:status", async () => {
  const queue = loadQueue();
  return {
    isSyncing,
    isOnline: isOnlineState,
    queuedBatches: queue.length
  };
});

// ---------------------------------------------------------------------------
// Core Decryption Engine & efWin11.fll Cleanup
// ---------------------------------------------------------------------------
async function executeDecryptionAndSync(triggerReason = "manual") {
  if (isSyncing) return { success: false, message: "Sync already active." };
  isSyncing = true;
  emitStatus({ isSyncing: true, lastRunReason: triggerReason });

  const config = loadConfig();
  const session = loadSession();
  const rawCodes = (config.companyCode || "E10").trim();
  const companyCodes = rawCodes.split(/[,\s;]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
  if (companyCodes.length === 0) companyCodes.push("E10");

  const sourceDir = config.sourceDir;
  // Destination staging folder is internal and automated! No need to configure manually.
  const baseStagingDir = config.destDir || path.join(USER_DATA_DIR, "staging");

  emitLog("info", `=== Starting Secure Extraction & Cloud Sync (Companies: [${companyCodes.join(", ")}], Trigger: ${triggerReason}) ===`);

  if (!sourceDir || !fs.existsSync(sourceDir)) {
    const msg = `Source folder does not exist: ${sourceDir || "(not set)"}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  try {
    fs.mkdirSync(baseStagingDir, { recursive: true });
  } catch (e) {
    const msg = `Failed to create internal staging folder: ${e.message}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  // Verify bundled extraction engine
  const engineBinaryPath = path.join(ENGINE_DIR, "MabsolCRM.EXE");
  const engineFllPath = path.join(ENGINE_DIR, "efWin11.fll");

  if (!fs.existsSync(engineBinaryPath)) {
    const msg = `Engine binary missing at: ${engineBinaryPath}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  if (!fs.existsSync(engineFllPath)) {
    const msg = `Engine core library missing at: ${engineFllPath}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const authToken = session?.token || "";
  const userEmail = session?.email || config.userEmail || "";
  const licenseKey = config.licenseKey || "";

  const isCloudReachable = await checkConnectivity(cloudUrl);
  emitNetwork(isCloudReachable);

  let totalUploadedTables = 0;
  const summaryMessages = [];

  for (const compCode of companyCodes) {
    emitLog("info", `--------------------------------------------------`);
    emitLog("info", `Processing company data for code [${compCode}]...`);
    const compDestDir = path.join(baseStagingDir, compCode);
    try {
      fs.mkdirSync(compDestDir, { recursive: true });
    } catch (e) {
      emitLog("error", `Could not create staging folder for [${compCode}]: ${e.message}`);
      continue;
    }

    // 1. Scan source directory for files matching .<compCode>
    const sourceFiles = fs.readdirSync(sourceDir);
    const codeExt = `.${compCode.toLowerCase()}`;
    const matchingFiles = sourceFiles.filter((f) => f.toLowerCase().endsWith(codeExt));

    emitLog("info", `Found ${matchingFiles.length} encrypted record file(s) for company [${compCode}]`);

    if (matchingFiles.length === 0) {
      emitLog("warn", `No encrypted records found matching .${compCode} in source folder.`);
      continue;
    }

    // Standard table stems
    const knownTables = [
      "PRO", "GLEDGER", "DIS", "SUBDIS", "MDIS", "PROBAT", "GLMONTH",
      "PEND", "PENDINGS", "RATE", "MAORDER", "SUPPORT", "ORDER", "SALETYPE", "MDOC"
    ];

    const tablesSet = new Set(knownTables.map(t => t.toUpperCase()));
    matchingFiles.forEach((file) => {
      const stem = file.substring(0, file.lastIndexOf(".")).toUpperCase();
      tablesSet.add(stem);
    });
    const allTables = Array.from(tablesSet);

    // 2. Prepare destination: Copy core library into compDestDir
    const destFllPath = path.join(compDestDir, "efWin11.fll");
    try {
      fs.copyFileSync(engineFllPath, destFllPath);
    } catch (copyErr) {
      emitLog("error", `Could not initialize extraction library for [${compCode}]: ${copyErr.message}`);
      continue;
    }

    // 3. Copy matching encrypted files into compDestDir
    for (const file of matchingFiles) {
      try {
        fs.copyFileSync(path.join(sourceDir, file), path.join(compDestDir, file));
      } catch (fErr) {
        emitLog("warn", `Skipped copy for ${file}: ${fErr.message}`);
      }
    }

    // 4. Generate dynamic, headless extraction script
    const prgPath = path.join(compDestDir, "mabsol_core.prg");
    const fpwPath = path.join(compDestDir, "mabsol_core.fpw");

    let decryptScript = 
      `_SCREEN.Visible = .F.\r\n` +
      `_SCREEN.WindowState = 1\r\n` +
      `_SCREEN.Caption = ""\r\n` +
      `CLOSE ALL\r\n` +
      `CLEAR\r\n` +
      `SET SAFETY OFF\r\n` +
      `SET CENTURY ON\r\n` +
      `SET DATE BRITISH\r\n` +
      `SET EXCLUSIVE OFF\r\n` +
      `SET TALK OFF\r\n` +
      `SET DELETED ON\r\n\r\n` +
      `LOCAL destpath, libpath, compcode, tbl, srcfile, outdbf\r\n` +
      `compcode = "${compCode}"\r\n` +
      `destpath = "${compDestDir.replace(/\\/g, "\\\\")}"\r\n` +
      `SET DEFAULT TO (destpath)\r\n\r\n` +
      `libpath = destpath + "\\\\efWin11.fll"\r\n` +
      `IF FILE(libpath)\r\n` +
      `    SET LIBRARY TO (libpath) ADDITIVE\r\n` +
      `ENDIF\r\n\r\n`;

    for (const tbl of allTables) {
      decryptScript += 
        `tbl = "${tbl}"\r\n` +
        `srcfile = tbl + "." + compcode\r\n` +
        `outdbf = tbl + "_" + compcode + ".DBF"\r\n` +
        `IF FILE(srcfile)\r\n` +
        `    TRY\r\n` +
        `        = efwdecrypt(srcfile, "THYFGXWREZBDCVAS")\r\n` +
        `        SELECT * FROM (srcfile) INTO CURSOR curdata READWRITE\r\n` +
        `        IF RECCOUNT("curdata") > 0\r\n` +
        `            SELECT curdata\r\n` +
        `            COPY TO (outdbf) TYPE FOX2X\r\n` +
        `        ENDIF\r\n` +
        `        USE IN curdata\r\n` +
        `    CATCH\r\n` +
        `    ENDTRY\r\n` +
        `    IF FILE(srcfile)\r\n` +
        `        TRY\r\n` +
        `            DELETE FILE (srcfile)\r\n` +
        `        CATCH\r\n` +
        `        ENDTRY\r\n` +
        `    ENDIF\r\n` +
        `ENDIF\r\n\r\n`;
    }

    decryptScript +=
      `SET LIBRARY TO\r\n` +
      `CLOSE ALL\r\n` +
      `QUIT\r\n`;

    const fpwContent = 
      `SCREEN = OFF\r\n` +
      `TITLE = \r\n` +
      `RESOURCE = OFF\r\n` +
      `STATUS = OFF\r\n` +
      `TALK = OFF\r\n` +
      `COMMAND = DO "${prgPath}"\r\n`;

    fs.writeFileSync(prgPath, decryptScript, "utf8");
    fs.writeFileSync(fpwPath, fpwContent, "utf8");

    // 5. Run MabsolCRM.EXE
    try {
      await new Promise((resolve, reject) => {
        const engineProcess = spawn(engineBinaryPath, ["-t", `-c${fpwPath}`], {
          cwd: compDestDir,
          stdio: "ignore",
          windowsHide: true,
          detached: false
        });

        const timer = setTimeout(() => {
          try { engineProcess.kill(); } catch {}
          resolve();
        }, 45000);

        engineProcess.on("close", () => {
          clearTimeout(timer);
          resolve();
        });

        engineProcess.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    } catch (runErr) {
      emitLog("error", `Extraction execution error on [${compCode}]: ${runErr.message}`);
    } finally {
      // Clean up extraction library and temporary scripts
      try { if (fs.existsSync(destFllPath)) fs.unlinkSync(destFllPath); } catch {}
      const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
      const bakPath = prgPath.replace(/\.prg$/i, ".bak");
      try { if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath); } catch {}
      try { if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath); } catch {}
      try { if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath); } catch {}
      try { if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath); } catch {}

      // Purge non-DBF files from compDestDir
      try {
        if (fs.existsSync(compDestDir)) {
          for (const entry of fs.readdirSync(compDestDir)) {
            if (!entry.toLowerCase().endsWith(".dbf")) {
              const entryPath = path.join(compDestDir, entry);
              if (fs.statSync(entryPath).isFile()) fs.unlinkSync(entryPath);
            }
          }
        }
      } catch {}
    }

    const destFiles = fs.readdirSync(compDestDir);
    const dbfFiles = destFiles.filter(f => f.toLowerCase().endsWith(".dbf"));
    emitLog("success", `[${compCode}] Extraction finished. ${dbfFiles.length} database table(s) ready.`);

    if (!isCloudReachable) {
      enqueueOfflineBatch(compDestDir, dbfFiles, compCode);
      summaryMessages.push(`[${compCode}]: Queued ${dbfFiles.length} tables offline`);
      continue;
    }

    // Upload DBF files to EC2 server targeting this specific company folder
    emitLog("info", `Uploading [${compCode}] tables to EC2 Cloud Server...`);
    const uploadResult = await uploadDbfBatch(cloudUrl, compDestDir, dbfFiles, authToken, userEmail, licenseKey, compCode, config.companyName);

    if (uploadResult.success) {
      totalUploadedTables += dbfFiles.length;
      summaryMessages.push(`[${compCode}]: Stored ${dbfFiles.length} tables`);
      emitLog("success", `[${compCode}] Stored ${dbfFiles.length} table(s) on cloud server (direct DB sync skipped)!`);

      // Clean up internal staging files once uploaded to save client disk space
      try {
        for (const file of dbfFiles) {
          const fp = path.join(compDestDir, file);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        fs.rmdirSync(compDestDir);
      } catch {}
    } else {
      emitLog("error", `Upload failed for [${compCode}]: ${uploadResult.error}. Queued for retry.`);
      enqueueOfflineBatch(compDestDir, dbfFiles, compCode);
      summaryMessages.push(`[${compCode}]: Failed, queued offline`);
    }
  }

  isSyncing = false;

  if (!isCloudReachable) {
    emitLog("warn", "Sync queued in Offline Mode for restoration.");
    emitStatus({
      isSyncing: false,
      isOnline: false,
      lastStatus: "offline_queued",
      message: summaryMessages.join(" | ")
    });
    return { success: true, offline: true, message: summaryMessages.join(" | ") };
  }

  saveQueue([]);
  emitStatus({
    isSyncing: false,
    isOnline: true,
    lastStatus: "stored",
    tablesCount: totalUploadedTables,
    message: summaryMessages.join(" | ")
  });

  emitLog("success", `=== Transfer Completed! Files safely stored on cloud server (${totalUploadedTables} tables) ===`);
  return { success: true, message: summaryMessages.join(" | ") };
}

// ---------------------------------------------------------------------------
// Cloud Communication Helpers (Chunked Upload & Heartbeat)
// ---------------------------------------------------------------------------
async function checkConnectivity(cloudUrl) {
  try {
    const pingUrl = `${cloudUrl}/api/mabsolcrmsync/heartbeat`;
    await axios.post(pingUrl, { status: "ping" }, { timeout: 4000 });
    return true;
  } catch (err) {
    if (err.response) return true; // Server replied with HTTP error, but internet is working
    return false;
  }
}

async function uploadDbfBatch(cloudUrl, destDir, dbfFiles, token, email, licenseKey, companyCode, companyName) {
  if (dbfFiles.length === 0) {
    return { success: true, message: "No database files to upload." };
  }

  // Upload in small chunks of 4 files each to eliminate HTTP 413 Payload Too Large
  const BATCH_SIZE = 4;
  const totalBatches = Math.ceil(dbfFiles.length / BATCH_SIZE);
  let lastSuccessData = null;

  try {
    for (let b = 0; b < totalBatches; b++) {
      const batchFiles = dbfFiles.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const isFinal = (b === totalBatches - 1);

      emitLog("info", `Syncing [${companyCode || "DEFAULT"}] data package ${b + 1} of ${totalBatches}...`);

      const form = new FormData();
      form.append("isFinalBatch", isFinal ? "true" : "false");
      form.append("storeOnly", "true");
      form.append("skipDirectSync", "true");
      if (companyCode) form.append("companyCode", companyCode);
      if (companyName) form.append("companyName", companyName);

      for (const fileName of batchFiles) {
        const filePath = path.join(destDir, fileName);
        if (fs.existsSync(filePath)) {
          form.append("files", fs.createReadStream(filePath), { filename: fileName });
        }
      }

      const hasValidToken = token && !isTokenExpired(token);
      const headers = {
        ...form.getHeaders(),
        ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
        ...(licenseKey ? { "x-license-key": licenseKey } : {}),
        ...(email ? { "x-agent-email": email } : {}),
        ...(companyCode ? { "x-company-code": companyCode } : {})
      };

      const targetUrl = `${cloudUrl}/api/mabsolcrmsync/upload-dbf`;
      const res = await axios.post(targetUrl, form, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      });

      if (!res.data || !res.data.success) {
        return { success: false, error: res.data?.error || `Upload error on batch ${b + 1}` };
      }

      lastSuccessData = res.data;
    }

    return {
      success: true,
      message: lastSuccessData?.message || "All database packages synced successfully.",
      data: lastSuccessData
    };
  } catch (err) {
    if (err.response?.status === 403 && err.response?.data?.accountSuspended) {
      const suspMsg = err.response?.data?.error || "Account has been deactivated or suspended. Access denied.";
      emitLog("error", `Access Revoked: ${suspMsg}`);
      saveSession(null);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("auth:session-revoked", { message: suspMsg });
      }
      clearInterval(syncIntervalTimer);
      return { success: false, error: suspMsg, accountSuspended: true };
    }
    const msg = err.response?.data?.error || err.message;
    return { success: false, error: msg };
  }
}

function enqueueOfflineBatch(destDir, dbfFiles, companyCode) {
  const queue = loadQueue();
  queue.push({
    queuedAt: new Date().toISOString(),
    companyCode,
    destDir,
    dbfFiles
  });
  saveQueue(queue);
}

// ---------------------------------------------------------------------------
// Background Network Monitor & Auto-Reconnect Worker
// ---------------------------------------------------------------------------
function startNetworkWatcher() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    const config = loadConfig();
    const session = loadSession();
    const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");

    const online = await checkConnectivity(cloudUrl);
    const wasOffline = !isOnlineState;
    emitNetwork(online);

    if (online) {
      // Send heartbeat
      try {
        await axios.post(`${cloudUrl}/api/mabsolcrmsync/heartbeat`, {
          workerId: `electron-agent-${config.companyCode || "A01"}`,
          status: isSyncing ? "syncing" : "online",
          dataDir: config.destDir,
          email: session?.email || config.userEmail || ""
        }, {
          headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
          timeout: 5000
        });
      } catch (hbErr) {
        if (hbErr.response?.status === 403 && hbErr.response?.data?.accountSuspended) {
          const suspMsg = hbErr.response?.data?.error || "Account has been deactivated or suspended.";
          emitLog("error", `Access Revoked: ${suspMsg}`);
          saveSession(null);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("auth:session-revoked", { message: suspMsg });
          }
          clearInterval(syncIntervalTimer);
          return;
        }
      }

      // If internet was just restored and we have queued files, auto-sync all batches!
      if (wasOffline && !isSyncing) {
        const queue = loadQueue();
        if (queue.length > 0) {
          emitLog("success", `Internet restored! Automatically syncing ${queue.length} queued offline batch(es) to Cloud Database...`);
          (async () => {
            isSyncing = true;
            let currentQueue = [...queue];
            while (currentQueue.length > 0) {
              const batch = currentQueue[0];
              try {
                const res = await uploadDbfBatch(
                  cloudUrl,
                  batch.destDir,
                  batch.dbfFiles,
                  session?.token || "",
                  session?.email || "",
                  config.licenseKey || "",
                  batch.companyCode || config.companyCode || "",
                  config.companyName || ""
                );
                if (res.success) {
                  emitLog("success", `Offline Batch Synced: [${batch.companyCode || "DEFAULT"}] (${batch.dbfFiles?.length || 0} tables).`);
                  currentQueue.shift();
                  saveQueue(currentQueue);
                } else {
                  emitLog("warn", `Offline batch sync paused: ${res.error}. Will retry on next check.`);
                  break;
                }
              } catch (batchErr) {
                emitLog("error", `Offline batch upload error: ${batchErr.message}`);
                break;
              }
            }
            if (currentQueue.length === 0) {
              emitLog("success", "All offline batches synced to server successfully!");
              saveQueue([]);
              emitStatus({ isOnline: true, lastStatus: "synced", message: "All queued offline files synchronized." });
            }
            isSyncing = false;
          })();
        }
      }
    }
  }, 15000);
}

function setupAutoSyncTimer(intervalMins) {
  clearInterval(syncIntervalTimer);
  const mins = Math.max(1, Number(intervalMins) || 10);
  emitLog("info", `Auto-sync schedule updated: running every ${mins} minute(s).`);
  syncIntervalTimer = setInterval(() => {
    if (!isSyncing) {
      emitLog("info", "[Auto-Schedule] Triggering scheduled sync...");
      executeDecryptionAndSync("schedule").catch(() => {});
    }
  }, mins * 60 * 1000);
}
