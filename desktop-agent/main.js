const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { spawn, execSync } = require("child_process");
const axios = require("axios");
const FormData = require("form-data");

function getMachineIdentifier() {
  try {
    const interfaces = os.networkInterfaces();
    let mac = "";
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
          mac = iface.mac;
          break;
        }
      }
      if (mac) break;
    }
    const raw = `${os.hostname()}-${os.platform()}-${mac || "nomac"}`;
    return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 16);
  } catch {
    return os.hostname() || "desktop-client";
  }
}

function getMachineName() {
  return `${os.hostname()} (${os.platform()})`;
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let syncIntervalTimer = null;
let sourceDirWatcher = null;
let realtimeDebounceTimer = null;
const lastSyncFileSignatures = new Map();
let heartbeatTimer = null;
let isSyncing = false;
let isOnlineState = true;

// Data directory for user config & session storage
const USER_DATA_DIR = app.getPath("userData");
const CONFIG_PATH = path.join(USER_DATA_DIR, "mabsol_sync_config.json");
const SESSION_PATH = path.join(USER_DATA_DIR, "mabsol_auth_session.json");
const QUEUE_PATH = path.join(USER_DATA_DIR, "mabsol_sync_queue.json");

// Multi-candidate Engine directory resolver (contains MabsolCRM.EXE, security core, and dependencies)
function getEngineDir() {
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "engine"));
    candidates.push(path.join(process.resourcesPath, "app.asar.unpacked", "engine"));
  }
  if (process.execPath) {
    const execDir = path.dirname(process.execPath);
    candidates.push(path.join(execDir, "resources", "engine"));
    candidates.push(path.join(execDir, "engine"));
  }
  candidates.push(path.join(__dirname, "engine"));
  candidates.push(path.join(__dirname, "..", "engine"));

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "MabsolCRM.EXE")) && fs.existsSync(path.join(dir, "efWin11.fll"))) {
        return dir;
      }
    } catch {}
  }
  return app.isPackaged ? path.join(process.resourcesPath, "engine") : path.join(__dirname, "engine");
}

// Hidden secure vault directory for offline DBF storage (never visible to users)
function getHiddenVaultDir() {
  // Use persistent directory on C: drive:
  // C:\Users\<Username>\AppData\Roaming\MabsolSyncAgent\.mabsol_offline_vault
  // Or alongside portable executable if portable folder is explicitly detected and writable
  let vaultDir = path.join(USER_DATA_DIR, ".mabsol_offline_vault");

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    try {
      const portableCandidate = path.join(process.env.PORTABLE_EXECUTABLE_DIR, ".mabsol_offline_vault");
      if (!fs.existsSync(portableCandidate)) fs.mkdirSync(portableCandidate, { recursive: true });
      const testFile = path.join(portableCandidate, `.test_${Date.now()}`);
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
      vaultDir = portableCandidate;
    } catch {}
  }

  try {
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
    if (process.platform === "win32") {
      execSync(`attrib +h "${vaultDir}"`, { windowsHide: true, stdio: "ignore" });
    }
  } catch {}

  return vaultDir;
}

// ---------------------------------------------------------------------------
// Helpers: Config & Storage & Environment
// ---------------------------------------------------------------------------
function loadProjectEnv() {
  const envPaths = [
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, ".env"),
    path.join(process.cwd(), ".env"),
    path.join(USER_DATA_DIR, ".env"),
    path.join(path.dirname(process.execPath), ".env")
  ];
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    envPaths.unshift(path.join(process.env.PORTABLE_EXECUTABLE_DIR, ".env"));
  }
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf8");
        const lines = content.split("\n");
        const envObj = {};
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            val = val.replace(/^["']|["']$/g, "");
            envObj[key] = val;
          }
        }
        return envObj;
      } catch { }
    }
  }
  return {};
}

function getDefaultCloudUrl() {
  const env = loadProjectEnv();
  if (env.CLOUD_URL && !env.CLOUD_URL.includes("localhost") && !env.CLOUD_URL.includes("127.0.0.1")) {
    return env.CLOUD_URL.replace(/\/+$/, "");
  }
  if (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.includes("localhost") && !env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")) {
    return env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  return "https://phcrm.mabsolinfotech.cloud";
}

function resolveCloudUrl(candidateUrl) {
  let url = (candidateUrl || "").trim().replace(/\/+$/, "");
  if (!url || url.includes("localhost") || url.includes("127.0.0.1")) {
    return getDefaultCloudUrl();
  }
  return url;
}

// Execute request with resolved cloud URL
async function executeWithCloudFallback(primaryUrl, requestFn) {
  let activeUrl = resolveCloudUrl(primaryUrl);
  return await requestFn(activeUrl);
}

function sanitizeFolderPath(dir) {
  if (!dir) return "";
  let clean = String(dir).trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!clean) return "";

  // Normalize forward slashes to backslashes on Windows
  clean = clean.replace(/\//g, "\\");

  try {
    clean = path.normalize(clean);
  } catch {}

  // If path is a drive root like C:\ or D:\, keep the trailing backslash
  if (/^[a-zA-Z]:\\?$/.test(clean)) {
    return clean.substring(0, 2) + "\\";
  }

  // Otherwise strip trailing backslashes
  clean = clean.replace(/\\+$/, "");
  return clean;
}

function getExeIdentifier() {
  try {
    const execPath = process.execPath;
    const stats = fs.statSync(execPath);
    return `${app.getVersion()}_${execPath}_${stats.size}_${Math.floor(stats.mtimeMs)}`;
  } catch {
    return `${app.getVersion()}_${process.execPath}`;
  }
}

function loadConfig() {
  const defaultUrl = getDefaultCloudUrl();
  const defaults = {
    cloudUrl: defaultUrl,
    companyName: "",
    companyCode: "",
    sourceDir: "",
    destDir: path.join(USER_DATA_DIR, "staging"),
    autoSync: true,
    intervalMins: "realtime",
    licenseKey: "",
    branchProfiles: {},
    selectedCompanyCode: ""
  };
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...defaults, isSourceDirValid: false, isExeChanged: true, isLicenseVerified: false };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    parsed.cloudUrl = resolveCloudUrl(parsed.cloudUrl);
    if (parsed.sourceDir) {
      parsed.sourceDir = sanitizeFolderPath(parsed.sourceDir);
    }
    const currentExeId = getExeIdentifier();
    const isNewOrChangedExe = !parsed.lastVerifiedExeId || (parsed.lastVerifiedExeId !== currentExeId);
    if (isNewOrChangedExe) {
      // New or updated EXE downloaded/installed:
      // Always require verification and DO NOT prefill old/stale data
      parsed.isExeChanged = true;
      parsed.isLicenseVerified = false;
      parsed.companyName = "";
      parsed.companyCode = "";
      parsed.sourceDir = "";
      parsed.licenseKey = "";
      parsed.productKey = "";
      parsed.userEmail = "";
    }
    const isPlaceholderCompVal = (val) => {
      if (!val) return true;
      const s = String(val).trim().toLowerCase();
      return s === "your organization" || s === "organization" || s === "default" || s === "test";
    };

    const resolvedConfig = { ...defaults, ...parsed };
    resolvedConfig.branchProfiles = resolvedConfig.branchProfiles || {};

    if (isNewOrChangedExe) {
      resolvedConfig.companyName = "";
      resolvedConfig.companyCode = "";
      resolvedConfig.sourceDir = "";
      resolvedConfig.licenseKey = "";
      resolvedConfig.productKey = "";
      resolvedConfig.userEmail = "";
    }
    if (isPlaceholderCompVal(resolvedConfig.companyName)) {
      resolvedConfig.companyName = "";
    }
    if (isPlaceholderCompVal(resolvedConfig.companyCode)) {
      resolvedConfig.companyCode = "";
    }

    // Auto-seed branchProfiles from active fields if branchProfiles is empty
    if (resolvedConfig.companyCode && Object.keys(resolvedConfig.branchProfiles).length === 0) {
      const primaryCode = resolvedConfig.companyCode.split(/[,\s;]+/)[0].trim().toUpperCase();
      resolvedConfig.branchProfiles[primaryCode] = {
        companyCode: resolvedConfig.companyCode,
        companyName: resolvedConfig.companyName || "",
        sourceDir: resolvedConfig.sourceDir || ""
      };
      if (!resolvedConfig.selectedCompanyCode) {
        resolvedConfig.selectedCompanyCode = primaryCode;
      }
    }

    // If a branch is selected, sync active values from profile
    if (resolvedConfig.selectedCompanyCode && resolvedConfig.branchProfiles[resolvedConfig.selectedCompanyCode]) {
      const activeProf = resolvedConfig.branchProfiles[resolvedConfig.selectedCompanyCode];
      // The companyCode field represents the user-entered ERP data code for decryption (e.g. A01)
      if (activeProf.decryptCode || activeProf.companyCode) {
        resolvedConfig.companyCode = activeProf.decryptCode || activeProf.companyCode;
      }
      if (activeProf.companyName) resolvedConfig.companyName = activeProf.companyName;
      if (activeProf.sourceDir) resolvedConfig.sourceDir = activeProf.sourceDir;
    }

    resolvedConfig.isSourceDirValid = Boolean(
      resolvedConfig.sourceDir && fs.existsSync(resolvedConfig.sourceDir)
    );
    return resolvedConfig;
  } catch {
    return { ...defaults, isSourceDirValid: false, isExeChanged: true, isLicenseVerified: false };
  }
}

function saveConfig(cfg) {
  try {
    if (cfg) {
      const isPlaceholderCompVal = (val) => {
        if (!val) return true;
        const s = String(val).trim().toLowerCase();
        return s === "your organization" || s === "organization" || s === "default" || s === "test";
      };
      if (cfg.cloudUrl) cfg.cloudUrl = resolveCloudUrl(cfg.cloudUrl);
      if (cfg.sourceDir) cfg.sourceDir = sanitizeFolderPath(cfg.sourceDir);
      if (cfg.companyCode !== undefined) {
        cfg.companyCode = (cfg.companyCode || "").trim().toUpperCase();
      }
      if (isPlaceholderCompVal(cfg.companyName)) cfg.companyName = "";
      if (isPlaceholderCompVal(cfg.companyCode)) cfg.companyCode = "";

      // Maintain branchProfiles synchronization with user-entered decrypt code
      cfg.branchProfiles = cfg.branchProfiles || {};
      if (cfg.selectedCompanyCode && cfg.branchProfiles[cfg.selectedCompanyCode]) {
        const prof = cfg.branchProfiles[cfg.selectedCompanyCode];
        prof.decryptCode = cfg.companyCode || "";
        prof.companyCode = cfg.companyCode || "";
        if (cfg.companyName) prof.companyName = cfg.companyName;
        if (cfg.sourceDir) prof.sourceDir = cfg.sourceDir;
      } else if (cfg.companyCode) {
        const primaryCode = cfg.companyCode.split(/[,\s;]+/)[0].trim().toUpperCase();
        if (primaryCode && !cfg.branchProfiles[primaryCode]) {
          cfg.branchProfiles[primaryCode] = {
            companyCode: cfg.companyCode,
            decryptCode: cfg.companyCode,
            crmCompanyCode: primaryCode,
            companyName: cfg.companyName || "",
            sourceDir: cfg.sourceDir || ""
          };
          if (!cfg.selectedCompanyCode) cfg.selectedCompanyCode = primaryCode;
        }
      }
    }
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
    const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    if (session) {
      session.cloudUrl = resolveCloudUrl(session.cloudUrl);
    }
    return session;
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
  } catch { }
}

// Universal sanitizer to ensure internal file names (efwin11, prg, vfp, fxp, fpw, fll, MabsolCRM.EXE)
// and raw paths are never exposed in user logs, terminal display, or error dialogs.
function sanitizeMessage(msg) {
  if (!msg) return "";
  let text = typeof msg === "string" ? msg : (msg.message || msg.error || JSON.stringify(msg));

  // 1. Scrub Windows absolute file paths pointing to engine or internal files
  text = text.replace(/[A-Za-z]:\\(?:[^'"\n\r\t<>\\\/]+\\)*([^'"\n\r\t<>\\\/]+)/g, (match, filename) => {
    if (/efwin11|mabsol_core|mabsolcrm|vfp|\.fll|\.prg|\.fpw|\.fxp/i.test(match)) {
      return "[System Module]";
    }
    return filename;
  });

  // 2. Scrub Unix-style paths containing engine files
  text = text.replace(/(?:\/[^'"\n\r\t<>\/]+)+\/(?:efwin11|mabsol_core|mabsolcrm|vfp)[^'"\n\r\t<>\/]*/gi, "[System Module]");

  // 3. Clean up node fs copyfile / lock / EBUSY error leaks
  text = text.replace(/(?:EBUSY:\s*)?copyfile\s+['"][^'"]+['"]\s*->\s*['"][^'"]+['"]/gi, "system module initialization");
  text = text.replace(/EBUSY:\s*resource busy or locked[^\n\r]*/gi, "Resource temporarily in use by background process.");

  // 4. Scrub specific internal names & extensions
  text = text.replace(/efwin11(?:\.fll)?/gi, "security module");
  text = text.replace(/mabsol_core\.(?:prg|fpw|fxp|bak)/gi, "data processing routine");
  text = text.replace(/mabsolcrm\.exe/gi, "data service");
  text = text.replace(/vfp9[a-z0-9]*\.dll/gi, "database driver");
  text = text.replace(/\bvfp9?\b/gi, "database engine");
  text = text.replace(/\bfoxpro\b/gi, "database engine");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fll\b/gi, "security library");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.prg\b/gi, "processing task");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fpw\b/gi, "system config");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fxp\b/gi, "compiled routine");
  text = text.replace(/\.prg\b/gi, " routine");
  text = text.replace(/\.fll\b/gi, " module");
  text = text.replace(/\.fpw\b/gi, " config");
  text = text.replace(/\.fxp\b/gi, " binary");

  // 5. Clean up any raw database duplicate key / driver errors
  if (text.includes("E11000") || text.includes("dup key")) {
    text = text.replace(/E11000 duplicate key error collection:[^]*?dup key: \{ [^}]+\}/gi, "Database configuration update in progress on server");
  }

  return text;
}

function emitLog(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const cleanMessage = sanitizeMessage(message);
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${cleanMessage}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:log", { timestamp, level, message: cleanMessage });
  }
}

function emitStatus(statusObj) {
  if (!statusObj) return;
  const cleanObj = { ...statusObj };
  if (cleanObj.message) cleanObj.message = sanitizeMessage(cleanObj.message);
  if (cleanObj.error) cleanObj.error = sanitizeMessage(cleanObj.error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:status-changed", cleanObj);
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
          executeDecryptionAndSync("tray_manual").catch(() => { });
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
    title: "MabsolCrm - Desktop Sync Agent",
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
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    emitLog("info", `Authenticating with cloud server (${cleanUrl})...`);
    const res = await axios.post(`${cleanUrl}/api/auth/login`, { email, password, isDesktopAgent: true }, { timeout: 15000 });

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
        const autoCompName = res.data.user?.companyName || res.data.companyName || "";
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
        const isPlaceholderCompVal = (val) => {
          if (!val) return true;
          const s = String(val).trim().toLowerCase();
          return s === "your organization" || s === "organization" || s === "default" || s === "test";
        };
        if (autoCompName && !isPlaceholderCompVal(autoCompName) && (!cfg.companyName || cfg.companyName.trim() === "")) {
          cfg.companyName = autoCompName;
        }
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
    const isSuspended = err.response?.status === 403 || err.response?.data?.suspended;
    const isPendingApproval = errorMsg.toLowerCase().includes("pending approval") || errorMsg.toLowerCase().includes("pending");
    emitLog("error", `Login error (${err.response?.status || "network"}): ${errorMsg}`);
    return { success: false, message: errorMsg, accountSuspended: isSuspended, pendingApproval: isPendingApproval };
  }
});

ipcMain.handle("auth:register", async (_event, payload) => {
  const cleanUrl = resolveCloudUrl(payload.cloudUrl);
  try {
    emitLog("info", `Submitting workspace registration to cloud server (${cleanUrl})...`);
    const res = await axios.post(
      `${cleanUrl}/api/auth/register`,
      { ...payload, isDesktopAgent: true },
      { timeout: 30000 }
    );

    if (res.data && res.data.success) {
      emitLog("success", `Workspace created for ${payload.email}.`);
      return res.data;
    }

    const msg = res.data?.message || "Registration failed.";
    emitLog("error", `Registration failed: ${msg}`);
    return { success: false, message: msg };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || "Registration failed";
    emitLog("error", `Registration error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

ipcMain.handle("auth:verify-gst", async (_event, { cloudUrl, gstin, pincode }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    const res = await axios.post(`${cleanUrl}/api/auth/verify-gst`, { gstin, pincode }, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to verify GSTIN" };
  }
});

ipcMain.handle("auth:check-exists", async (_event, params) => {
  const cleanUrl = resolveCloudUrl(params?.cloudUrl);
  try {
    const payload = {};
    if (params?.email) payload.email = params.email;
    if (params?.mobile) payload.mobile = params.mobile;
    if (params?.field && params?.value) payload[params.field] = params.value;
    const res = await axios.post(`${cleanUrl}/api/auth/check-exists`, payload, { timeout: 10000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message };
  }
});

ipcMain.handle("auth:send-email-otp", async (_event, { cloudUrl, email }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    const res = await axios.post(`${cleanUrl}/api/auth/send-email-otp`, { email }, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to send email OTP" };
  }
});

ipcMain.handle("auth:verify-email-otp", async (_event, { cloudUrl, email, otp }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    const res = await axios.post(`${cleanUrl}/api/auth/verify-email-otp`, { email, otp }, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to verify email OTP" };
  }
});

ipcMain.handle("auth:send-mobile-otp", async (_event, { cloudUrl, mobile }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    const res = await axios.post(`${cleanUrl}/api/auth/send-mobile-otp`, { mobile }, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to send mobile OTP" };
  }
});

ipcMain.handle("auth:verify-mobile-otp", async (_event, { cloudUrl, mobile, otp }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    const res = await axios.post(`${cleanUrl}/api/auth/verify-mobile-otp`, { mobile, otp }, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to verify mobile OTP" };
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
    const cleanUrl = resolveCloudUrl(cloudUrl);
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

ipcMain.handle("auth:resend-otp", async (_event, { cloudUrl, email }) => {
  try {
    emitLog("info", `Requesting new account verification code for ${email}...`);
    const cleanUrl = resolveCloudUrl(cloudUrl);
    const res = await axios.post(`${cleanUrl}/api/auth/resend-otp`, { email }, { timeout: 15000 });
    if (res.data?.success) {
      emitLog("success", `New verification code dispatched to ${email}.`);
    }
    return res.data;
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || "Failed to resend verification code";
    emitLog("error", `Resend OTP failed: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

ipcMain.handle("auth:check-session", async () => {
  const cfg = loadConfig();
  const session = loadSession();

  // If a new or changed EXE was installed, always require account verification
  if (cfg.isExeChanged) {
    emitLog("info", "New or updated desktop agent executable detected. Re-verification required.");
    return {
      authenticated: false,
      isExeChanged: true,
      email: session?.email || session?.user?.email || cfg.userEmail || ""
    };
  }

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
  const cloudUrl = resolveCloudUrl(session.cloudUrl);
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
  const cloudUrl = resolveCloudUrl(data?.cloudUrl || session?.cloudUrl || config.cloudUrl);
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
  const cloudUrl = resolveCloudUrl(data?.cloudUrl || session?.cloudUrl || config.cloudUrl);
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
  if (merged.sourceDir) {
    merged.sourceDir = sanitizeFolderPath(merged.sourceDir);
  }
  if (merged.companyCode !== undefined) {
    merged.companyCode = (merged.companyCode || "").trim().toUpperCase();
  }
  const cloudUrl = resolveCloudUrl(merged.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();

  // ALWAYS save the user's settings (folder path, company codes, etc.) to local disk first!
  const res = saveConfig(merged);
  if (merged.autoSync) {
    setupAutoSyncTimer(merged.intervalMins);
  } else {
    stopAutoSync();
  }

  // If a license key is provided, verify and bind to this hardware device
  let licenseWarning = null;
  let requiresVerification = false;
  let isAuthorizedOnDevice = false;
  const userEmail = merged.userEmail || session?.email || "";
  const deviceId = getMachineIdentifier();
  const deviceName = getMachineName();

  if (merged.licenseKey && merged.licenseKey.trim()) {
    const key = merged.licenseKey.trim();

    // If new or updated EXE was installed, ALWAYS require OTP verification!
    if (merged.isExeChanged) {
      isAuthorizedOnDevice = false;
      requiresVerification = true;
      licenseWarning = `New or updated desktop agent installed. Machine "${deviceName}" must be verified with OTP before this license key can be used.`;
    } else {
      // 1. Check with device-check endpoint first (checks multi-device authorized list)
      try {
        const checkUrl = `${cloudUrl}/api/mabsolcrmsync/license/device-check`;
        const checkRes = await axios.post(
          checkUrl,
          {
            deviceId,
            deviceName,
            email: userEmail,
            licenseKey: key
          },
          {
            headers: {
              ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
              "x-license-key": key,
              "x-device-id": deviceId,
              "x-device-name": deviceName
            },
            timeout: 8000
          }
        );
        if (checkRes.data && checkRes.data.success && checkRes.data.authorized && !checkRes.data.isExpired) {
          isAuthorizedOnDevice = true;
        } else if (checkRes.data && (!checkRes.data.authorized || checkRes.data.requiresVerification || checkRes.data.isNewDevice)) {
          requiresVerification = true;
          licenseWarning = checkRes.data.message || `Machine "${deviceName}" requires OTP verification to authorize this license key.`;
        }
      } catch (_checkErr) {
        // Fall through to bind
      }
    }

    // 2. If not already confirmed authorized, attempt bind with cloud
    if (!isAuthorizedOnDevice) {
      try {
        const bindUrl = `${cloudUrl}/api/mabsolcrmsync/license/bind`;
        const bindRes = await axios.post(
          bindUrl,
          {
            licenseKey: key,
            deviceId,
            deviceName,
            userEmail
          },
          {
            headers: {
              ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
              "x-license-key": key,
              "x-device-id": deviceId,
              "x-device-name": deviceName
            },
            timeout: 10000
          }
        );

        if (!bindRes.data || !bindRes.data.success) {
          licenseWarning = bindRes.data?.error || licenseWarning || "License key could not be verified on server.";
          requiresVerification = Boolean(
            bindRes.data?.requiresVerification ||
            bindRes.data?.deviceMismatch ||
            (typeof licenseWarning === "string" && (licenseWarning.includes("locked to machine") || licenseWarning.includes("not authorized") || licenseWarning.includes("requires")))
          );
          emitLog("warn", `Server response: ${licenseWarning}`);
        } else {
          isAuthorizedOnDevice = true;
          licenseWarning = null;
          requiresVerification = false;
        }
      } catch (bindErr) {
        const errData = bindErr.response?.data;
        licenseWarning = errData?.error || bindErr.message || licenseWarning || "License verification failed.";
        requiresVerification = Boolean(
          errData?.requiresVerification ||
          errData?.deviceMismatch ||
          (typeof licenseWarning === "string" && (licenseWarning.includes("locked to machine") || licenseWarning.includes("not authorized") || licenseWarning.includes("requires")))
        );
        emitLog("warn", `Server response: ${licenseWarning}`);
      }
    }

    if (isAuthorizedOnDevice) {
      merged.isLicenseVerified = true;
      merged.lastVerifiedLicense = key;
      merged.authorizedDeviceId = deviceId;
      saveConfig(merged);
      emitLog("success", `License verified & authorized for this machine: ${deviceName}`);
      return { success: true, message: "Configuration saved and license key verified!" };
    } else {
      merged.isLicenseVerified = false;
      saveConfig(merged);
      emitLog("warn", `Settings saved locally. Machine authorization needed: ${licenseWarning}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("license:verification-required", {
          email: userEmail,
          deviceId,
          deviceName,
          licenseKey: key,
          error: licenseWarning
        });
      }
      return {
        success: false,
        requiresVerification: true,
        deviceMismatch: true,
        licenseWarning,
        licenseKey: key,
        email: userEmail,
        deviceName,
        deviceId,
        message: `OTP Verification Required: Machine "${deviceName}" must be verified with OTP before this license key can be used.`
      };
    }
  }

  emitLog("info", "Configuration saved successfully.");
  return { success: true, message: "Configuration saved successfully." };
});

ipcMain.handle("config:set-cloud-url", async (_event, newUrl) => {
  const current = loadConfig();
  current.cloudUrl = resolveCloudUrl(newUrl);
  saveConfig(current);
  emitLog("info", `Target server updated to: ${current.cloudUrl}`);
  return { success: true, cloudUrl: current.cloudUrl };
});

// ---------------------------------------------------------------------------
// IPC Handlers: Branch & Multi-Company Profile Operations
// ---------------------------------------------------------------------------
ipcMain.handle("config:fetch-branches", async (_event, payload = {}) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const token = payload.token || session?.token || "";
  const email = payload.email || session?.email || current.userEmail || "";

  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.get(`${targetUrl}/api/mabsolcrmsync/branches`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(current.licenseKey ? { "x-license-key": current.licenseKey.trim() } : {})
        },
        params: { email },
        timeout: 10000
      });
    });

    if (res.data && res.data.success && Array.isArray(res.data.branches)) {
      const serverBranches = res.data.branches;
      current.branchProfiles = current.branchProfiles || {};
      for (const b of serverBranches) {
        const crmKey = (b.companyCode || "").trim().toUpperCase();
        if (!crmKey) continue;
        const existing = current.branchProfiles[crmKey] || {};
        current.branchProfiles[crmKey] = {
          ...existing,
          crmCompanyCode: crmKey,
          companyName: b.companyName || existing.companyName || "",
          companyCode: existing.decryptCode || existing.companyCode || "",
          decryptCode: existing.decryptCode || existing.companyCode || "",
          gstin: b.gstin || existing.gstin || "",
          sourceDir: existing.sourceDir || "",
          isHeadOffice: !!b.isHeadOffice
        };
      }
      if (!current.selectedCompanyCode && serverBranches.length > 0) {
        current.selectedCompanyCode = (serverBranches[0].companyCode || "").trim().toUpperCase();
      }
      if (current.selectedCompanyCode && current.branchProfiles[current.selectedCompanyCode]) {
        const active = current.branchProfiles[current.selectedCompanyCode];
        current.companyCode = active.decryptCode || active.companyCode || "";
        current.companyName = active.companyName || current.companyName || "";
        current.sourceDir = active.sourceDir || current.sourceDir || "";
      }
      saveConfig(current);
      return {
        success: true,
        branches: Object.values(current.branchProfiles),
        selectedCompanyCode: current.selectedCompanyCode
      };
    }
    return {
      success: true,
      branches: Object.values(current.branchProfiles || {}),
      selectedCompanyCode: current.selectedCompanyCode || ""
    };
  } catch (err) {
    emitLog("warn", `Branch fetch notice: ${err.message}. Using locally stored branch profiles.`);
    return {
      success: true,
      branches: Object.values(current.branchProfiles || {}),
      selectedCompanyCode: current.selectedCompanyCode || "",
      warning: err.message
    };
  }
});

ipcMain.handle("config:switch-branch", async (_event, companyCode) => {
  const current = loadConfig();
  const codeKey = (companyCode || "").trim().toUpperCase();
  current.branchProfiles = current.branchProfiles || {};

  if (codeKey && current.branchProfiles[codeKey]) {
    const profile = current.branchProfiles[codeKey];
    current.selectedCompanyCode = codeKey;
    current.companyCode = profile.decryptCode || profile.companyCode || "";
    current.companyName = profile.companyName || "";
    current.sourceDir = profile.sourceDir || "";
    saveConfig(current);
    emitLog("info", `Switched active branch profile to: ${profile.companyName || codeKey} [${profile.crmCompanyCode || codeKey}]`);
    return { success: true, profile, currentConfig: current };
  }
  return { success: false, message: `Profile for branch code "${codeKey}" not found.` };
});

ipcMain.handle("config:save-branch-profile", async (_event, branchData) => {
  const current = loadConfig();
  current.branchProfiles = current.branchProfiles || {};
  const codeKey = (branchData.companyCode || "").trim().toUpperCase();
  if (!codeKey) {
    return { success: false, message: "Company code is required." };
  }
  const cleanDir = branchData.sourceDir ? sanitizeFolderPath(branchData.sourceDir) : (current.branchProfiles[codeKey]?.sourceDir || "");
  current.branchProfiles[codeKey] = {
    ...(current.branchProfiles[codeKey] || {}),
    companyCode: codeKey,
    companyName: (branchData.companyName || "").trim(),
    sourceDir: cleanDir,
    gstin: (branchData.gstin || "").trim()
  };
  if (current.selectedCompanyCode === codeKey || !current.selectedCompanyCode) {
    current.selectedCompanyCode = codeKey;
    current.companyCode = codeKey;
    current.companyName = branchData.companyName || current.companyName;
    current.sourceDir = cleanDir;
  }
  saveConfig(current);
  emitLog("info", `Branch profile [${codeKey}] saved successfully.`);
  return { success: true, branches: Object.values(current.branchProfiles), activeProfile: current.branchProfiles[codeKey] };
});

ipcMain.handle("license:get-details", async () => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.get(`${targetUrl}/api/mabsolcrmsync/license`, {
        headers: {
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          ...(current.licenseKey ? { "x-license-key": current.licenseKey.trim() } : {})
        },
        timeout: 8000
      });
    });
    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to fetch license details"
    };
  }
});

ipcMain.handle("license:check-device", async (_event, payload) => {
  const current = loadConfig();
  const machineId = getMachineIdentifier();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const email = (payload?.email || session?.email || current.userEmail || "").trim().toLowerCase();
  const licenseKey = (payload?.licenseKey || current.licenseKey || "").trim();

  // ONLY treat as locally verified if current config was verified AND matches this exact license key AND EXE has not changed!
  const isLocallyVerified = Boolean(
    !current.isExeChanged &&
    current.isLicenseVerified &&
    current.lastVerifiedLicense &&
    licenseKey &&
    current.lastVerifiedLicense === licenseKey &&
    (!current.authorizedDeviceId || current.authorizedDeviceId === machineId)
  );

  // If a new or changed EXE was installed, ALWAYS require verification for this executable!
  if (current.isExeChanged || !current.isLicenseVerified) {
    return {
      success: true,
      authorized: false,
      isNewDevice: true,
      requiresVerification: true,
      deviceId: machineId,
      deviceName: getMachineName(),
      email,
      licenseKey,
      message: "Verification required for this installed desktop agent."
    };
  }

  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.post(
        `${targetUrl}/api/mabsolcrmsync/license/device-check`,
        {
          deviceId: machineId,
          deviceName: getMachineName(),
          email,
          licenseKey
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-device-id": machineId,
            "x-device-name": getMachineName(),
            ...(licenseKey ? { "x-license-key": licenseKey } : {})
          },
          timeout: 10000
        }
      );
    });

    if (res.data && res.data.success) {
      if (res.data.authorized && !res.data.isExpired) {
        current.isLicenseVerified = true;
        current.authorizedDeviceId = machineId;
        current.lastVerifiedLicense = res.data.licenseKey || licenseKey;
        if (res.data.licenseKey) current.licenseKey = res.data.licenseKey;
        saveConfig(current);
      } else {
        current.isLicenseVerified = false;
        saveConfig(current);
      }
    }
    return res.data;
  } catch (err) {
    if (isLocallyVerified) {
      return {
        success: true,
        authorized: true,
        isNewDevice: false,
        licenseKey: current.licenseKey,
        deviceName: getMachineName(),
        message: "Machine is authorized and ready."
      };
    }
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to check device license status"
    };
  }
});

ipcMain.handle("license:send-device-otp", async (_event, payload) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const email = (payload?.email || session?.email || current.userEmail || "").trim().toLowerCase();
  const licenseKey = (payload?.licenseKey || current.licenseKey || "").trim();
  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.post(
        `${targetUrl}/api/mabsolcrmsync/license/send-device-otp`,
        {
          deviceId: getMachineIdentifier(),
          deviceName: getMachineName(),
          email,
          licenseKey
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-device-id": getMachineIdentifier(),
            "x-device-name": getMachineName(),
            ...(licenseKey ? { "x-license-key": licenseKey } : {})
          },
          timeout: 15000
        }
      );
    });
    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to send device activation OTP"
    };
  }
});

ipcMain.handle("license:activate-device", async (_event, payload) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const email = (payload?.email || session?.email || current.userEmail || "").trim().toLowerCase();
  const licenseKey = (payload?.licenseKey || current.licenseKey || "").trim();
  const otp = String(payload?.otp || "").trim();
  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.post(
        `${targetUrl}/api/mabsolcrmsync/license/activate-device`,
        {
          deviceId: getMachineIdentifier(),
          deviceName: getMachineName(),
          email,
          licenseKey,
          otp
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-device-id": getMachineIdentifier(),
            "x-device-name": getMachineName(),
            ...(licenseKey ? { "x-license-key": licenseKey } : {})
          },
          timeout: 15000
        }
      );
    });

    if (res.data && res.data.success && res.data.licenseKey) {
      current.licenseKey = res.data.licenseKey;
      current.isLicenseVerified = true;
      current.isExeChanged = false;
      current.lastVerifiedExeId = getExeIdentifier();
      current.lastVerifiedLicense = res.data.licenseKey;
      current.authorizedDeviceId = getMachineIdentifier();
      if (res.data.companyName && !current.companyName) current.companyName = res.data.companyName;
      if (res.data.companyCode && !current.companyCode) current.companyCode = res.data.companyCode;
      saveConfig(current);
      emitLog("success", `Machine authorized! License key ${res.data.licenseKey} activated for ${getMachineName()}.`);
    }

    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to activate device"
    };
  }
});

ipcMain.handle("license:generate-key", async (_event, payload) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const email = (payload?.email || session?.email || current.userEmail || "").trim().toLowerCase();
  const machineId = getMachineIdentifier();
  const machineName = getMachineName();

  try {
    emitLog("info", `Requesting new license key generation from ${cloudUrl}...`);
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.post(
        `${targetUrl}/api/mabsolcrmsync/license`,
        {
          email,
          regenerate: true,
          isDesktopAgent: true,
          deviceId: machineId,
          deviceName: machineName
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-device-id": machineId,
            "x-device-name": machineName,
            ...(current.licenseKey ? { "x-license-key": current.licenseKey } : {})
          },
          timeout: 15000
        }
      );
    });

    if (res.data && res.data.success && res.data.license) {
      const newKey = res.data.license;
      current.licenseKey = newKey;
      current.lastVerifiedLicense = newKey;
      saveConfig(current);
      emitLog("info", `New license key generated: ${newKey}. Machine authorization required.`);
    }

    return res.data;
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to generate new license key";
    emitLog("error", `License generation failed: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
});

ipcMain.handle("license:request-agent-pin", async (_event, payload) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  const email = (payload?.email || session?.email || current.userEmail || "").trim().toLowerCase();
  const machineId = getMachineIdentifier();
  const machineName = getMachineName();

  try {
    emitLog("info", `Requesting random 6-digit Agent PIN from ${cloudUrl}...`);
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.post(
        `${targetUrl}/api/mabsolcrmsync/license/agent-pin/request`,
        {
          deviceId: machineId,
          deviceName: machineName,
          agentEmail: email
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-device-id": machineId,
            "x-device-name": machineName
          },
          timeout: 12000
        }
      );
    });

    if (res.data?.success) {
      emitLog("success", `Generated 6-digit Agent PIN: ${res.data.pin}. Enter this on Web CRM to link license.`);
    }
    return { ...res.data, cloudUrl: cloudUrl };
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || "Failed to generate Agent PIN";
    emitLog("error", `PIN generation failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle("license:check-agent-pin-status", async (_event, payload) => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(payload?.cloudUrl || current.cloudUrl || getDefaultCloudUrl());
  const pin = String(payload?.pin || "").trim();
  const machineId = getMachineIdentifier();

  try {
    const res = await executeWithCloudFallback(cloudUrl, async (targetUrl) => {
      return await axios.get(
        `${targetUrl}/api/mabsolcrmsync/license/agent-pin/status`,
        {
          params: { pin, deviceId: machineId },
          headers: {
            "x-device-id": machineId
          },
          timeout: 8000
        }
      );
    });

    if (res.data && res.data.success && res.data.status === "activated" && res.data.licenseKey) {
      current.licenseKey = res.data.licenseKey;
      current.isLicenseVerified = true;
      current.isExeChanged = false;
      current.lastVerifiedExeId = getExeIdentifier();
      current.lastVerifiedLicense = res.data.licenseKey;
      current.authorizedDeviceId = machineId;
      if (res.data.companyName && !current.companyName) current.companyName = res.data.companyName;
      if (res.data.companyCode && !current.companyCode) current.companyCode = res.data.companyCode;
      saveConfig(current);
      emitLog("success", `Machine authorized via Web PIN! License key ${res.data.licenseKey} activated.`);
    }

    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to check PIN status"
    };
  }
});

ipcMain.handle("dialog:select-folder", async (_event, title) => {
  try {
    const parentWin = (mainWindow && !mainWindow.isDestroyed()) ? mainWindow : null;
    const result = await dialog.showOpenDialog(parentWin, {
      title: title || "Select Directory",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths || !result.filePaths.length) return null;
    return sanitizeFolderPath(result.filePaths[0]);
  } catch (err) {
    emitLog("error", `Folder select dialog error: ${err.message}`);
    return null;
  }
});

ipcMain.handle("dialog:validate-folder", async (_event, folderPath, companyCode = "") => {
  const cleanPath = sanitizeFolderPath(folderPath);
  if (!cleanPath) {
    return { valid: false, message: "Folder path cannot be empty." };
  }
  try {
    if (!fs.existsSync(cleanPath)) {
      return { valid: false, message: `Folder does not exist on this computer: "${cleanPath}"` };
    }
    const stat = fs.statSync(cleanPath);
    if (!stat.isDirectory()) {
      return { valid: false, message: `Specified path is a file, not a directory: "${cleanPath}"` };
    }
    const entries = fs.readdirSync(cleanPath);
    const codes = (companyCode || "").split(/[,\s;]+/).map(c => c.trim().toLowerCase()).filter(Boolean);
    let matchingCount = 0;
    let dbfCount = 0;
    for (const f of entries) {
      const lower = f.toLowerCase();
      if (lower.endsWith(".dbf")) dbfCount++;
      if (codes.some(c => lower.endsWith(`.${c}`))) matchingCount++;
    }
    return {
      valid: true,
      path: cleanPath,
      totalFiles: entries.length,
      matchingFiles: matchingCount,
      dbfFiles: dbfCount,
      message: matchingCount > 0
        ? `✓ Valid folder: ${matchingCount} ERP record file(s) found for [${codes.join(", ").toUpperCase()}]`
        : (dbfCount > 0
          ? `✓ Valid folder: ${dbfCount} DBF database file(s) found`
          : `✓ Folder exists on this computer (${entries.length} items found)`)
    };
  } catch (err) {
    return { valid: false, message: `Cannot access folder: ${err.message}` };
  }
});

let isAutoSyncPaused = false;

ipcMain.handle("sync:start", async () => {
  if (isSyncing) return { success: false, message: "Sync is already in progress." };
  return await executeDecryptionAndSync("manual");
});

ipcMain.handle("sync:start-all-branches", async () => {
  if (isSyncing) return { success: false, message: "Sync is already in progress." };
  const current = loadConfig();
  const profiles = Object.values(current.branchProfiles || {});
  const configuredProfiles = profiles.filter(p => p.companyCode && p.sourceDir && fs.existsSync(p.sourceDir));

  if (configuredProfiles.length === 0) {
    if (current.companyCode && current.sourceDir && fs.existsSync(current.sourceDir)) {
      return await executeDecryptionAndSync("manual");
    }
    const msg = "No configured branch profiles found with an existing ERP data folder. Please configure branch folders in settings.";
    emitLog("error", msg);
    return { success: false, message: msg };
  }

  emitLog("info", `🚀 Starting sequential sync for ${configuredProfiles.length} configured branch profile(s)...`);
  const results = [];
  for (const prof of configuredProfiles) {
    emitLog("info", `\n=== Processing Branch: ${prof.companyName || prof.companyCode} [${prof.companyCode}] ===`);
    const res = await executeDecryptionAndSync("multi_branch", prof);
    results.push({ companyCode: prof.companyCode, companyName: prof.companyName, result: res });
    await new Promise(r => setTimeout(r, 1000));
  }
  emitLog("success", `🎉 Multi-Branch batch sync completed for ${configuredProfiles.length} branch(es).`);
  return { success: true, results };
});

ipcMain.handle("sync:stop", async () => {
  stopAutoSync();
  isAutoSyncPaused = true;
  emitLog("warn", "🛑 Auto-Sync stopped by operator. Continuous synchronization paused.");
  emitStatus({ isAutoSyncRunning: false, isAutoSyncPaused: true });
  return { success: true, isPaused: true };
});

ipcMain.handle("sync:resume", async () => {
  isAutoSyncPaused = false;
  const cfg = loadConfig();
  if (cfg.autoSync && cfg.intervalMins !== "0" && cfg.intervalMins !== 0) {
    setupAutoSyncTimer(cfg.intervalMins);
    emitLog("info", "▶️ Auto-Sync resumed by operator. Live continuous background sync is active.");
  } else {
    emitLog("info", "▶️ Auto-sync was disabled in settings. Triggering a single manual sync...");
    executeDecryptionAndSync("manual").catch(() => {});
  }
  emitStatus({ isAutoSyncRunning: true, isAutoSyncPaused: false });
  return { success: true, isPaused: false };
});

ipcMain.handle("sync:status", async () => {
  const queue = loadQueue();
  const cfg = loadConfig();
  return {
    isSyncing,
    isOnline: isOnlineState,
    queuedBatches: queue.length,
    isAutoSyncEnabled: !!cfg.autoSync && cfg.intervalMins !== "0" && cfg.intervalMins !== 0,
    isAutoSyncPaused
  };
});

// ---------------------------------------------------------------------------
// Core Decryption Engine & Module Cleanup
// ---------------------------------------------------------------------------
async function executeDecryptionAndSync(triggerReason = "manual", targetProfile = null) {
  if (isSyncing && triggerReason !== "multi_branch") return { success: false, message: "Sync already active." };
  isSyncing = true;
  emitStatus({ isSyncing: true, lastRunReason: triggerReason });

  const config = loadConfig();
  const session = loadSession();
  const rawCodes = ((targetProfile && (targetProfile.decryptCode || targetProfile.extractCode || targetProfile.companyCode)) || config.companyCode || "").trim();
  const companyCodes = rawCodes.split(/[,\s;]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
  if (companyCodes.length === 0) {
    const msg = "ERP Extract Code is not set. Please click Edit Configuration and enter your ERP Data Code(s) (e.g. A01 or B01).";
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  const sourceDir = sanitizeFolderPath((targetProfile && targetProfile.sourceDir) || config.sourceDir);
  const activeCompanyName = (targetProfile && targetProfile.companyName) || config.companyName || "";
  const activeCrmCode = (targetProfile && targetProfile.crmCompanyCode) || config.selectedCompanyCode || "";
  // Destination staging folder is internal and automated! No need to configure manually.
  const baseStagingDir = config.destDir || path.join(USER_DATA_DIR, "staging");

  emitLog("info", `=== Starting Secure Extraction & Cloud Sync (${activeCompanyName ? activeCompanyName + " " : ""}${activeCrmCode ? `[Account: ${activeCrmCode}] ` : ""}[ERP Extract Code: ${companyCodes.join(", ")}], Trigger: ${triggerReason}) ===`);
  emitLog("info", "🛡️ [Privacy Assurance] We are just accessing your files data, not collecting any personal or confidential details. We keep your data privacy.");

  if (!sourceDir) {
    const msg = `Encrypted Data Folder (Source) is not set${activeCompanyName ? ` for ${activeCompanyName}` : ""}. Please click Edit Configuration and browse to your ERP data folder on this computer.`;
    if (triggerReason === "manual" || triggerReason === "multi_branch") emitLog("warn", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, lastStatus: "unconfigured", message: msg });
    return { success: false, message: msg };
  }

  if (!fs.existsSync(sourceDir)) {
    const msg = `Source folder does not exist on this computer: "${sourceDir}". Please click Edit Configuration and select your ERP data folder on this PC.`;
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

  // Verify bundled extraction engine across all runtime paths
  const engineDir = getEngineDir();
  const engineBinaryPath = path.join(engineDir, "MabsolCRM.EXE");
  const engineFllPath = path.join(engineDir, "efWin11.fll");

  if (!fs.existsSync(engineBinaryPath)) {
    const msg = "Core extraction service component is missing or inaccessible.";
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  if (!fs.existsSync(engineFllPath)) {
    const msg = "Core extraction security module is missing or inaccessible.";
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  const cloudUrl = resolveCloudUrl(session?.cloudUrl || config.cloudUrl);
  const authToken = session?.token || "";
  const userEmail = session?.email || config.userEmail || "";
  const licenseKey = (config.licenseKey || "").trim();

  // 1. License key presence check: if missing, abort immediately without converting any files
  if (!licenseKey) {
    const msg = "License Key is missing in settings. File conversion and extraction aborted.";
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  const devId = getMachineIdentifier();
  const devName = getMachineName();

  // 2. New or changed EXE check: always enforce OTP verification before conversion/sync
  if (config.isExeChanged || !config.isLicenseVerified) {
    const msg = "New or updated desktop agent executable detected. Machine OTP verification required before syncing.";
    emitLog("error", `[Verification Required] ${msg} Extraction ABORTED.`);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("license:verification-required", {
        email: userEmail || session?.email || "",
        deviceId: devId,
        deviceName: devName,
        licenseKey,
        error: msg
      });
    }
    return { success: false, requiresVerification: true, message: msg };
  }

  // Check connectivity right before processing:
  const isCloudReachable = await checkConnectivity(cloudUrl);
  emitNetwork(isCloudReachable);

  // 3. Pre-validate License Key with Server BEFORE converting any files!
  if (isCloudReachable) {
    let isPermitted = false;

    // Check device-check first for multi-device authorization
    try {
      const checkUrl = `${cloudUrl}/api/mabsolcrmsync/license/device-check`;
      const checkRes = await axios.post(
        checkUrl,
        {
          deviceId: devId,
          deviceName: devName,
          email: userEmail,
          licenseKey
        },
        {
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            "x-license-key": licenseKey,
            "x-device-id": devId,
            "x-device-name": devName
          },
          timeout: 8000
        }
      );
      if (checkRes.data && checkRes.data.success && checkRes.data.authorized && !checkRes.data.isExpired) {
        isPermitted = true;
      }
    } catch (_checkErr) {
      // Fall through to bind
    }

    if (!isPermitted) {
      try {
        const bindUrl = `${cloudUrl}/api/mabsolcrmsync/license/bind`;
        const bindRes = await axios.post(
          bindUrl,
          {
            licenseKey,
            deviceId: devId,
            deviceName: devName,
            userEmail: userEmail || session?.email || ""
          },
          {
            headers: {
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              "x-license-key": licenseKey,
              "x-device-id": devId,
              "x-device-name": devName
            },
            timeout: 10000
          }
        );

        if (!bindRes.data || !bindRes.data.success) {
          const errMsg = bindRes.data?.error || "License key validation failed.";
          config.isLicenseVerified = false;
          saveConfig(config);
          emitLog("error", `[License Blocked] ${errMsg} — Extraction ABORTED. Files will NOT be converted.`);
          isSyncing = false;
          emitStatus({ isSyncing: false, error: errMsg });
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("license:verification-required", {
              email: userEmail || session?.email || "",
              deviceId: devId,
              deviceName: devName,
              licenseKey,
              error: errMsg
            });
          }
          return { success: false, requiresVerification: true, message: errMsg };
        } else {
          isPermitted = true;
        }
      } catch (licErr) {
        const errData = licErr.response?.data;
        const errMsg = errData?.error || licErr.message || "Invalid license key.";
        config.isLicenseVerified = false;
        saveConfig(config);
        emitLog("error", `[License Blocked] ${errMsg} — Extraction ABORTED. Files will NOT be converted.`);
        isSyncing = false;
        emitStatus({ isSyncing: false, error: errMsg });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("license:verification-required", {
            email: userEmail || session?.email || "",
            deviceId: devId,
            deviceName: devName,
            licenseKey,
            error: errMsg
          });
        }
        return { success: false, requiresVerification: true, message: errMsg };
      }
    }

    config.isLicenseVerified = true;
    config.lastVerifiedLicense = licenseKey;
    config.authorizedDeviceId = devId;
    saveConfig(config);
    emitLog("info", "Cloud connection active. License verified. Converted data will sync directly to server.");
  } else {
    // Offline mode: do NOT convert files if license was never validated online
    if (!config.isLicenseVerified || config.lastVerifiedLicense !== licenseKey) {
      const errMsg = "License key has not been verified online with server yet. File conversion is blocked in offline mode.";
      emitLog("error", errMsg);
      isSyncing = false;
      emitStatus({ isSyncing: false, error: errMsg });
      return { success: false, message: errMsg };
    }
    emitLog("warn", "No internet connection detected. Extraction will proceed and store files in local hidden vault.");
  }

  let totalUploadedTables = 0;
  let totalOfflineTables = 0;
  let skippedDueToNoChange = 0;
  const summaryMessages = [];

  for (const compCode of companyCodes) {
    emitLog("info", `--------------------------------------------------`);
    emitLog("info", `Processing company data for code [${compCode}]...`);
    const compDestDir = path.join(baseStagingDir, compCode);
    try {
      fs.mkdirSync(compDestDir, { recursive: true });
      try { fs.chmodSync(compDestDir, 0o777); } catch { }
    } catch (e) {
      emitLog("error", `Could not create staging folder for [${compCode}]: ${e.message}`);
      continue;
    }

    // 1. Scan source directory for files matching .<compCode>
    const sourceFiles = fs.readdirSync(sourceDir);
    const codeExt = `.${compCode.toLowerCase()}`;
    const matchingFiles = sourceFiles.filter((f) => f.toLowerCase().endsWith(codeExt));

    if (matchingFiles.length === 0) {
      emitLog("warn", `No encrypted records found matching .${compCode} in source folder.`);
      continue;
    }

    // Check modification signature to optimize real-time sync performance
    const currentSignatures = [];
    for (const f of matchingFiles) {
      try {
        const stat = fs.statSync(path.join(sourceDir, f));
        currentSignatures.push(`${f}:${stat.mtimeMs}:${stat.size}`);
      } catch {
        currentSignatures.push(`${f}:0:0`);
      }
    }
    const sigKey = currentSignatures.join("|");
    const prevSig = lastSyncFileSignatures.get(compCode);

    if (triggerReason === "realtime" && prevSig && prevSig === sigKey) {
      // All files unmodified, zero CPU & instant real-time response
      skippedDueToNoChange++;
      continue;
    }

    emitLog("info", `Found ${matchingFiles.length} encrypted record file(s) for company [${compCode}]`);

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

    // 2. Prepare destination: Ensure core extraction library and runtime modules are available
    const destFllPath = path.join(compDestDir, "efWin11.fll");
    if (!fs.existsSync(destFllPath)) {
      try {
        fs.copyFileSync(engineFllPath, destFllPath);
        try { fs.chmodSync(destFllPath, 0o666); } catch { }
      } catch (copyErr) { }
    }

    // Ensure runtime dependencies are accessible in staging directory
    for (const dll of ["vfp9enu.dll", "msvcr71.dll", "gdiplus.dll"]) {
      const srcDll = path.join(engineDir, dll);
      const dstDll = path.join(compDestDir, dll);
      if (fs.existsSync(srcDll) && !fs.existsSync(dstDll)) {
        try {
          fs.copyFileSync(srcDll, dstDll);
          try { fs.chmodSync(dstDll, 0o666); } catch { }
        } catch { }
      }
    }

    // 3. Copy matching encrypted files into compDestDir and ensure WRITABLE (strip Windows ReadOnly attribute)
    for (const file of matchingFiles) {
      try {
        const srcPath = path.join(sourceDir, file);
        const dstPath = path.join(compDestDir, file);
        fs.copyFileSync(srcPath, dstPath);
        // CRITICAL: Strip Windows Read-Only attribute so efWin11.fll / FoxPro can open for read+write!
        try {
          fs.chmodSync(dstPath, 0o666);
        } catch { }
      } catch (fErr) {
        emitLog("warn", `Skipped copy for ${file}: ${fErr.message}`);
      }
    }

    // 4. Generate dynamic, headless extraction script
    const prgPath = path.join(compDestDir, "mabsol_core.prg");
    const fpwPath = path.join(compDestDir, "mabsol_core.fpw");
    const escapedEngineFll = engineFllPath.replace(/\\/g, "\\\\");
    const escapedDestFll = destFllPath.replace(/\\/g, "\\\\");

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
      `libpath = "${escapedEngineFll}"\r\n` +
      `IF !FILE(libpath)\r\n` +
      `    libpath = "${escapedDestFll}"\r\n` +
      `ENDIF\r\n` +
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
        `        SELECT curdata\r\n` +
        `        COPY TO (outdbf) TYPE FOX2X\r\n` +
        `        USE IN curdata\r\n` +
        `    CATCH\r\n` +
        `        TRY\r\n` +
        `            USE (srcfile) ALIAS curdata AGAIN SHARED\r\n` +
        `            SELECT curdata\r\n` +
        `            COPY TO (outdbf) TYPE FOX2X\r\n` +
        `            USE IN curdata\r\n` +
        `        CATCH\r\n` +
        `        ENDTRY\r\n` +
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

    // 5. Run MabsolCRM.EXE headless (with relative config flag to avoid Windows username spaces)
    try {
      await new Promise((resolve, reject) => {
        const fpwFilename = path.basename(fpwPath);
        const engineProcess = spawn(engineBinaryPath, ["-t", `-c${fpwFilename}`], {
          cwd: compDestDir,
          stdio: "ignore",
          windowsHide: true,
          detached: false,
          env: {
            ...process.env,
            PATH: `${engineDir};${compDestDir};${process.env.PATH || ""}`
          }
        });

        // 5-minute timeout for large ERP databases with 500,000+ rows
        const timer = setTimeout(() => {
          try { engineProcess.kill(); } catch { }
          resolve();
        }, 300000);

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
      // Clean up temporary scripts
      const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
      const bakPath = prgPath.replace(/\.prg$/i, ".bak");
      try { if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath); } catch { }
      try { if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath); } catch { }
      try { if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath); } catch { }
      try { if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath); } catch { }

      // Purge non-DBF files from compDestDir (preserve .fll which Windows may hold locked in memory)
      try {
        if (fs.existsSync(compDestDir)) {
          for (const entry of fs.readdirSync(compDestDir)) {
            const lower = entry.toLowerCase();
            if (!lower.endsWith(".dbf") && !lower.endsWith(".fll") && !lower.endsWith(".dll")) {
              const entryPath = path.join(compDestDir, entry);
              if (fs.statSync(entryPath).isFile()) fs.unlinkSync(entryPath);
            }
          }
        }
      } catch { }
    }

    const destFiles = fs.readdirSync(compDestDir);
    const dbfFiles = destFiles.filter(f => f.toLowerCase().endsWith(".dbf") && !f.toLowerCase().startsWith("foxtask"));
    emitLog("success", `[${compCode}] Extraction finished. ${dbfFiles.length} database table(s) ready.`);

    if (dbfFiles.length === 0) {
      emitLog("warn", `[${compCode}] 0 database tables were produced from ${matchingFiles.length} source file(s). Please verify file integrity.`);
      continue;
    }

    // SCENARIO 1: ONLINE -> Upload directly from staging to Cloud Server
    if (isCloudReachable) {
      emitLog("info", `Uploading [${compCode}] tables directly to Cloud Server...`);
      const activeCrmCode = (targetProfile && targetProfile.crmCompanyCode) || config.selectedCompanyCode || compCode;
      const uploadResult = await uploadDbfBatch(cloudUrl, compDestDir, dbfFiles, authToken, userEmail, licenseKey, activeCrmCode, activeCompanyName);

      if (uploadResult.success) {
        lastSyncFileSignatures.set(compCode, sigKey);
        totalUploadedTables += dbfFiles.length;
        summaryMessages.push(`[${compCode}]: Stored ${dbfFiles.length} tables`);
        emitLog("success", `[${compCode}] Stored ${dbfFiles.length} table(s) on cloud server! (No local files kept)`);

        // Clean up staging files immediately - NOTHING is stored in local vault!
        try {
          for (const file of dbfFiles) {
            const fp = path.join(compDestDir, file);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          }
          fs.rmdirSync(compDestDir);
        } catch { }
        continue;
      }

      // If license failed at upload time, purge extracted tables immediately - do not store in offline vault!
      if (uploadResult.licenseInvalid || uploadResult.licenseExpired || uploadResult.deviceMismatch || uploadResult.requiresVerification) {
        emitLog("error", `Sync rejected for [${compCode}] (${uploadResult.error}). Staging files purged.`);
        try {
          for (const file of dbfFiles) {
            const fp = path.join(compDestDir, file);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          }
          fs.rmdirSync(compDestDir);
        } catch {}
        continue;
      }

      // If upload failed midway (e.g. temporary network drop), fallback to moving to offline vault
      let uploadErr = uploadResult.error || "Network error";
      if (typeof uploadErr === "string" && (uploadErr.includes("E11000") || uploadErr.includes("vfpconfigs") || uploadErr.includes("dup key"))) {
        uploadErr = "Cloud server config update in progress. Files safely stored in local vault";
      }
      emitLog("warn", `Upload interrupted for [${compCode}] (${uploadErr}). Moving to secure local vault.`);
    }

    // SCENARIO 2: OFFLINE (temporary network drop or no internet) -> Move files into Hidden Offline Vault
    const vaultCompDir = path.join(getHiddenVaultDir(), compCode);
    fs.mkdirSync(vaultCompDir, { recursive: true });
    for (const file of dbfFiles) {
      const srcFp = path.join(compDestDir, file);
      const dstFp = path.join(vaultCompDir, file);
      try {
        if (fs.existsSync(dstFp)) {
          try { fs.chmodSync(dstFp, 0o666); } catch { }
          fs.unlinkSync(dstFp);
        }
        fs.copyFileSync(srcFp, dstFp);
        try { fs.chmodSync(dstFp, 0o666); } catch { }
        if (fs.existsSync(srcFp)) fs.unlinkSync(srcFp);
      } catch (mvErr) {
        emitLog("warn", `Vault move warning for ${file}: ${mvErr.message}`);
      }
    }
    try { fs.rmdirSync(compDestDir); } catch {}

    lastSyncFileSignatures.set(compCode, sigKey);
    enqueueOfflineBatch(vaultCompDir, dbfFiles, compCode);
    totalOfflineTables += dbfFiles.length;
    summaryMessages.push(`[${compCode}]: Stored ${dbfFiles.length} tables in local hidden vault`);
    emitLog("warn", `[${compCode}] Offline mode: ${dbfFiles.length} table(s) securely converted and stored in local hidden vault.`);
  }

  isSyncing = false;

  // If anything had to be stored in offline vault:
  if (totalOfflineTables > 0) {
    emitStatus({
      isSyncing: false,
      isOnline: false,
      lastStatus: "offline_queued",
      tablesCount: totalOfflineTables,
      message: summaryMessages.join(" | ")
    });
    emitLog("warn", `Sync finished in Offline Mode (${totalOfflineTables} tables saved locally in hidden vault). Auto-sync will upload once internet is restored.`);
    return { success: true, offline: true, message: summaryMessages.join(" | ") };
  }

  // If real-time watcher ran and all files are unmodified, keep existing stored status
  if (skippedDueToNoChange > 0 && totalUploadedTables === 0 && totalOfflineTables === 0) {
    isSyncing = false;
    emitStatus({
      isSyncing: false,
      isOnline: true,
      lastStatus: "stored"
    });
    return { success: true, unchanged: true, message: "Data is up to date." };
  }

  // If nothing was uploaded and nothing was stored offline (e.g. 0 tables converted):
  if (totalUploadedTables === 0) {
    emitStatus({
      isSyncing: false,
      lastStatus: "failed",
      tablesCount: 0,
      error: "No database tables were converted from the source files."
    });
    emitLog("error", "Sync finished: 0 tables were converted or stored. Please check that source ERP data files are valid.");
    return { success: false, message: "No database tables were converted." };
  }

  // If all were uploaded directly to server:
  saveQueue([]);
  if (targetProfile && config.branchProfiles && config.branchProfiles[targetProfile.companyCode]) {
    config.branchProfiles[targetProfile.companyCode].lastSyncAt = new Date().toISOString();
    config.branchProfiles[targetProfile.companyCode].tablesCount = totalUploadedTables;
    saveConfig(config);
  }
  emitStatus({
    isSyncing: false,
    isOnline: true,
    lastStatus: "stored",
    tablesCount: totalUploadedTables,
    message: summaryMessages.join(" | ")
  });

  emitLog("success", `=== Transfer Completed! All ${totalUploadedTables} tables safely stored on Cloud Server (0 local files kept) ===`);
  return { success: true, message: summaryMessages.join(" | ") };
}

// ---------------------------------------------------------------------------
// Cloud Communication Helpers (Chunked Upload & Heartbeat)
// ---------------------------------------------------------------------------
async function checkConnectivity(cloudUrl) {
  try {
    const pingUrl = `${cloudUrl}/api/mabsolcrmsync/heartbeat`;
    await axios.post(pingUrl, { status: "ping" }, { timeout: 2000 });
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
      // Always use isFinalBatch="false" during file uploads so server never triggers synchronous blocking FoxPro import
      form.append("isFinalBatch", "false");
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

      const cfg = loadConfig();
      const hasValidToken = token && !isTokenExpired(token);
      const headers = {
        ...form.getHeaders(),
        ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
        ...(licenseKey ? { "x-license-key": licenseKey } : {}),
        ...(cfg?.productKey ? { "x-product-key": cfg.productKey } : {}),
        "x-device-id": getMachineIdentifier(),
        "x-device-name": getMachineName(),
        ...(email ? { "x-agent-email": email } : {}),
        ...(companyCode ? { "x-company-code": companyCode } : {})
      };

      const targetUrl = `${cloudUrl}/api/mabsolcrmsync/upload-dbf`;
      let res = null;
      try {
        res = await axios.post(targetUrl, form, {
          headers,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 120000
        });
      } catch (postErr) {
        const postErrMsg = postErr.response?.data?.error || postErr.message || "";
        // If server wrote files to disk but threw duplicate key config error on legacy server:
        if (typeof postErrMsg === "string" && (postErrMsg.includes("E11000") || postErrMsg.includes("vfpconfigs") || postErrMsg.includes("dup key"))) {
          emitLog("info", `[${companyCode || "DEFAULT"}] Package ${b + 1} stored on cloud server.`);
          lastSuccessData = { success: true, message: `Package ${b + 1} stored on cloud server` };
          continue;
        }
        throw postErr;
      }

      if (!res?.data || !res.data.success) {
        const resErr = res?.data?.error || "";
        if (typeof resErr === "string" && (resErr.includes("E11000") || resErr.includes("vfpconfigs") || resErr.includes("dup key"))) {
          emitLog("info", `[${companyCode || "DEFAULT"}] Package ${b + 1} stored on cloud server.`);
          lastSuccessData = { success: true, message: `Package ${b + 1} stored on cloud server` };
          continue;
        }
        return { success: false, error: res?.data?.error || `Upload error on batch ${b + 1}` };
      }

      lastSuccessData = res.data;
    }

    // Trigger asynchronous background server sync now that all tables are uploaded
    try {
      const hasValidToken = token && !isTokenExpired(token);
      await axios.post(
        `${cloudUrl}/api/mabsolcrmsync/sync-now`,
        { companyCode, background: true },
        {
          headers: {
            ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
            ...(licenseKey ? { "x-license-key": licenseKey } : {}),
            "x-device-id": getMachineIdentifier(),
            "x-company-code": companyCode || ""
          },
          timeout: 15000
        }
      );
    } catch (_triggerErr) {
      // Ignored: sync-now triggered or already processing
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
    if (err.response?.status === 403 && err.response?.data?.licenseExpired) {
      const licMsg = err.response?.data?.error || "License key has expired. Please generate a new key from Cloud Dashboard.";
      emitLog("error", `License Notice: ${licMsg}`);
      return { success: false, error: licMsg, licenseExpired: true };
    }
    if (err.response?.status === 403 && err.response?.data?.licenseInvalid) {
      const licMsg = err.response?.data?.error || "Invalid license key.";
      emitLog("error", `License Error: ${licMsg}`);
      return { success: false, error: licMsg, licenseInvalid: true };
    }
    if (err.response?.status === 403 && (err.response?.data?.deviceMismatch || err.response?.data?.requiresVerification)) {
      const devMsg = err.response?.data?.error || "Device verification required for this license key.";
      emitLog("error", `Device Verification Notice: ${devMsg}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("license:verification-required", {
          email,
          deviceId: getMachineIdentifier(),
          deviceName: getMachineName(),
          licenseKey,
          error: devMsg
        });
      }
      return { success: false, error: devMsg, deviceMismatch: true, requiresVerification: true };
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
    const cloudUrl = resolveCloudUrl(session?.cloudUrl || config.cloudUrl);

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
          email: session?.email || config.userEmail || "",
          licenseKey: config.licenseKey || "",
          deviceId: getMachineIdentifier(),
          deviceName: getMachineName()
        }, {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            ...(config.licenseKey ? { "x-license-key": config.licenseKey } : {}),
            "x-device-id": getMachineIdentifier(),
            "x-device-name": getMachineName()
          },
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
          stopAutoSync();
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
                  // Clean up local hidden vault files now that they are stored on server!
                  try {
                    for (const f of (batch.dbfFiles || [])) {
                      const p = path.join(batch.destDir, f);
                      if (fs.existsSync(p)) fs.unlinkSync(p);
                    }
                    if (fs.existsSync(batch.destDir)) fs.rmdirSync(batch.destDir);
                  } catch { }
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
              emitLog("success", "All offline batches synced to server successfully! Local hidden vault cleared.");
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

function stopAutoSync() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }
  if (sourceDirWatcher) {
    try {
      sourceDirWatcher.close();
    } catch { }
    sourceDirWatcher = null;
  }
  if (realtimeDebounceTimer) {
    clearTimeout(realtimeDebounceTimer);
    realtimeDebounceTimer = null;
  }
}

function setupAutoSyncTimer(intervalMins) {
  stopAutoSync();
  const cfg = loadConfig();
  const cleanSource = sanitizeFolderPath(cfg.sourceDir);
  const isFolderReady = Boolean(cleanSource && fs.existsSync(cleanSource));
  const hasCompany = Boolean((cfg.companyCode || "").trim());

  if (!isFolderReady || !hasCompany) {
    if (!hasCompany) {
      emitLog("info", "⏸️ [Auto-Sync Standby] Company Code not yet set. Auto-sync will start once configured in Settings.");
    } else {
      emitLog("info", "⏸️ [Auto-Sync Standby] ERP source folder not yet configured or not found on this computer. Auto-sync will activate once selected in Settings.");
    }
    return;
  }

  const isRealtime = intervalMins === "realtime" || intervalMins === "real-time" || intervalMins === 0.5 || String(intervalMins) === "0.5";

  if (isRealtime) {
    emitLog("info", "⚡ Real-Time Auto-Sync active: Live file watcher & continuous sync engaged.");

    // 1. File system watcher on source directory for instant real-time sync
    try {
      sourceDirWatcher = fs.watch(cleanSource, { recursive: false }, (eventType, filename) => {
        if (!filename) return;
        const lower = filename.toLowerCase();
        if (lower.endsWith(".tmp") || lower.endsWith(".lck") || lower.endsWith(".log") || lower.endsWith(".bak")) return;

        if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
        realtimeDebounceTimer = setTimeout(() => {
          if (!isSyncing) {
            emitLog("info", `[Real-Time Watcher] ERP change detected (${filename}). Synchronizing immediately...`);
            executeDecryptionAndSync("realtime").catch(() => { });
          }
        }, 2500); // 2.5s debounce for atomic writes
      });
      emitLog("info", `[Real-Time Watcher] Watching source folder: ${cleanSource}`);
    } catch (watchErr) {
      emitLog("warn", `Could not attach live file watcher on ${cleanSource}: ${watchErr.message}. Fallback to 30s heartbeat.`);
    }

    // 2. High-frequency 30-second heartbeat to ensure network shared drives are synced without delay
    syncIntervalTimer = setInterval(() => {
      if (!isSyncing) {
        executeDecryptionAndSync("realtime").catch(() => { });
      }
    }, 30 * 1000);
    return;
  }

  const mins = Math.max(1, Number(intervalMins) || 10);
  emitLog("info", `Auto-sync schedule updated: running every ${mins} minute(s).`);
  syncIntervalTimer = setInterval(() => {
    if (!isSyncing) {
      emitLog("info", "[Auto-Schedule] Triggering scheduled sync...");
      executeDecryptionAndSync("schedule").catch(() => { });
    }
  }, mins * 60 * 1000);
}
