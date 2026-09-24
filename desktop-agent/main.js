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

// Engine directory (contains MabsolCRM.EXE, security core, and dependencies)
const ENGINE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "engine")
  : path.join(__dirname, "engine");

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
    path.join(USER_DATA_DIR, ".env")
  ];
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
  if (env.CLOUD_URL) return env.CLOUD_URL.replace(/\/+$/, "");
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (!app.isPackaged) return "http://localhost:3000";
  return "https://phcrm.mabsolinfotech.cloud";
}

function resolveCloudUrl(candidateUrl) {
  let url = (candidateUrl || "").trim().replace(/\/+$/, "");
  if (!url) {
    return getDefaultCloudUrl();
  }
  return url;
}

function loadConfig() {
  const defaultUrl = getDefaultCloudUrl();
  const defaults = {
    cloudUrl: defaultUrl,
    companyName: "",
    companyCode: "E10",
    sourceDir: "",
    destDir: path.join(USER_DATA_DIR, "staging"),
    autoSync: true,
    intervalMins: "realtime",
    licenseKey: ""
  };
  if (!fs.existsSync(CONFIG_PATH)) return defaults;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    parsed.cloudUrl = resolveCloudUrl(parsed.cloudUrl);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveConfig(cfg) {
  try {
    if (cfg && cfg.cloudUrl) {
      cfg.cloudUrl = resolveCloudUrl(cfg.cloudUrl);
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
    const isSuspended = err.response?.status === 403 || err.response?.data?.suspended;
    const isPendingApproval = errorMsg.toLowerCase().includes("pending approval") || errorMsg.toLowerCase().includes("pending");
    emitLog("error", `Login error (${err.response?.status || "network"}): ${errorMsg}`);
    return { success: false, message: errorMsg, accountSuspended: isSuspended, pendingApproval: isPendingApproval };
  }
});

ipcMain.handle("auth:register", async (_event, { cloudUrl, name, companyName, email, mobile, password }) => {
  const cleanUrl = resolveCloudUrl(cloudUrl);
  try {
    emitLog("info", `Submitting registration request to cloud server (${cleanUrl})...`);
    const res = await axios.post(
      `${cleanUrl}/api/mabsolcrmsync/auth/register`,
      { name, companyName, email, mobile, password },
      { timeout: 25000 }
    );

    if (res.data && res.data.success) {
      emitLog("success", `Account created for ${email}. Status: Pending Superadmin Approval.`);
      return {
        success: true,
        pendingApproval: true,
        message: res.data.message || "Account created! Awaiting Superadmin approval."
      };
    }

    const msg = res.data?.message || "Failed to create account.";
    emitLog("error", `Registration failed: ${msg}`);
    return { success: false, message: msg };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || "Registration failed";
    emitLog("error", `Registration network error: ${errorMsg}`);
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
  const cloudUrl = resolveCloudUrl(merged.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();

  // If a license key is provided, verify and bind to this hardware device immediately!
  if (merged.licenseKey && merged.licenseKey.trim()) {
    try {
      const bindUrl = `${cloudUrl}/api/mabsolcrmsync/license/bind`;
      const bindRes = await axios.post(
        bindUrl,
        {
          licenseKey: merged.licenseKey.trim(),
          deviceId: getMachineIdentifier(),
          deviceName: getMachineName(),
          userEmail: merged.userEmail || session?.email || ""
        },
        {
          headers: {
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            "x-license-key": merged.licenseKey.trim(),
            "x-device-id": getMachineIdentifier(),
            "x-device-name": getMachineName()
          },
          timeout: 10000
        }
      );

      if (!bindRes.data || !bindRes.data.success) {
        const errMsg = bindRes.data?.error || "Failed to verify license key.";
        emitLog("error", `License verification failed: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      emitLog("success", `License verified & locked to this machine: ${getMachineName()}`);
    } catch (bindErr) {
      const errMsg = bindErr.response?.data?.error || bindErr.message || "License verification failed.";
      emitLog("error", `License Binding Error: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
        deviceMismatch: bindErr.response?.data?.deviceMismatch,
        licenseExpired: bindErr.response?.data?.licenseExpired
      };
    }
  }

  const res = saveConfig(merged);
  if (merged.autoSync) {
    setupAutoSyncTimer(merged.intervalMins);
  } else {
    stopAutoSync();
  }
  emitLog("info", "Configuration saved successfully.");
  return res;
});

ipcMain.handle("license:get-details", async () => {
  const current = loadConfig();
  const cloudUrl = resolveCloudUrl(current.cloudUrl || getDefaultCloudUrl());
  const session = loadSession();
  try {
    const res = await axios.get(`${cloudUrl}/api/mabsolcrmsync/license`, {
      headers: {
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(current.licenseKey ? { "x-license-key": current.licenseKey.trim() } : {})
      },
      timeout: 8000
    });
    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to fetch license details"
    };
  }
});

ipcMain.handle("dialog:select-folder", async (_event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

let isAutoSyncPaused = false;

ipcMain.handle("sync:start", async () => {
  if (isSyncing) return { success: false, message: "Sync is already in progress." };
  return await executeDecryptionAndSync("manual");
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
  const licenseKey = config.licenseKey || "";

  // Check connectivity right before processing:
  const isCloudReachable = await checkConnectivity(cloudUrl);
  emitNetwork(isCloudReachable);
  if (isCloudReachable) {
    emitLog("info", "Cloud connection active. Converted data will sync directly to server (no local files stored).");
  } else {
    emitLog("warn", "No internet connection detected. Extraction will proceed and store files in local hidden vault.");
  }

  let totalUploadedTables = 0;
  let totalOfflineTables = 0;
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

    // 2. Prepare destination: Ensure core extraction library is available
    const destFllPath = path.join(compDestDir, "efWin11.fll");
    if (!fs.existsSync(destFllPath)) {
      try {
        fs.copyFileSync(engineFllPath, destFllPath);
      } catch (copyErr) { }
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

    // 5. Run MabsolCRM.EXE headless
    try {
      await new Promise((resolve, reject) => {
        const engineProcess = spawn(engineBinaryPath, ["-t", `-c${fpwPath}`], {
          cwd: compDestDir,
          stdio: "ignore",
          windowsHide: true,
          detached: false
        });

        const timer = setTimeout(() => {
          try { engineProcess.kill(); } catch { }
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
            if (!lower.endsWith(".dbf") && !lower.endsWith(".fll")) {
              const entryPath = path.join(compDestDir, entry);
              if (fs.statSync(entryPath).isFile()) fs.unlinkSync(entryPath);
            }
          }
        }
      } catch { }
    }

    const destFiles = fs.readdirSync(compDestDir);
    const dbfFiles = destFiles.filter(f => f.toLowerCase().endsWith(".dbf"));
    emitLog("success", `[${compCode}] Extraction finished. ${dbfFiles.length} database table(s) ready.`);

    if (dbfFiles.length === 0) continue;

    // SCENARIO 1: ONLINE -> Upload directly from staging to Cloud Server
    if (isCloudReachable) {
      emitLog("info", `Uploading [${compCode}] tables directly to Cloud Server...`);
      const uploadResult = await uploadDbfBatch(cloudUrl, compDestDir, dbfFiles, authToken, userEmail, licenseKey, compCode, config.companyName);

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

      // If upload failed midway (e.g. connection reset or DNS failure), fallback to moving to offline vault
      emitLog("warn", `Upload interrupted for [${compCode}] (${uploadResult.error}). Moving to secure local vault.`);
    }

    // SCENARIO 2: OFFLINE (or upload failed) -> Move files into Hidden Offline Vault
    const vaultCompDir = path.join(getHiddenVaultDir(), compCode);
    fs.mkdirSync(vaultCompDir, { recursive: true });
    for (const file of dbfFiles) {
      const srcFp = path.join(compDestDir, file);
      const dstFp = path.join(vaultCompDir, file);
      try {
        fs.copyFileSync(srcFp, dstFp);
        if (fs.existsSync(srcFp)) fs.unlinkSync(srcFp);
      } catch {}
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
    emitLog("warn", `Sync finished in Offline Mode (${totalOfflineTables} tables saved locally). Not waiting for internet.`);
    return { success: true, offline: true, message: summaryMessages.join(" | ") };
  }

  // If all were uploaded directly to server:
  saveQueue([]);
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

      const hasValidToken = token && !isTokenExpired(token);
      const headers = {
        ...form.getHeaders(),
        ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
        ...(licenseKey ? { "x-license-key": licenseKey } : {}),
        "x-device-id": getMachineIdentifier(),
        "x-device-name": getMachineName(),
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
    if (err.response?.status === 403 && err.response?.data?.deviceMismatch) {
      const devMsg = err.response?.data?.error || "License key is bound to another device. Only 1 device allowed per key.";
      emitLog("error", `Device Binding Notice: ${devMsg}`);
      return { success: false, error: devMsg, deviceMismatch: true };
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
  const isRealtime = intervalMins === "realtime" || intervalMins === "real-time" || intervalMins === 0.5 || String(intervalMins) === "0.5";

  if (isRealtime) {
    emitLog("info", "⚡ Real-Time Auto-Sync active: Live file watcher & continuous sync engaged.");

    // 1. File system watcher on source directory for instant real-time sync
    if (cfg.sourceDir && fs.existsSync(cfg.sourceDir)) {
      try {
        sourceDirWatcher = fs.watch(cfg.sourceDir, { recursive: false }, (eventType, filename) => {
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
        emitLog("info", `[Real-Time Watcher] Watching source folder: ${cfg.sourceDir}`);
      } catch (watchErr) {
        emitLog("warn", `Could not attach live file watcher on ${cfg.sourceDir}: ${watchErr.message}. Fallback to 30s heartbeat.`);
      }
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
