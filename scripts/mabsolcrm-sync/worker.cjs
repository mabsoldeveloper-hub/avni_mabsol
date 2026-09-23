/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");

const WORKER_ID = `${os.hostname()}-${process.pid}`;
let isRunning = false;
let scheduledTimer = null;
const activeWatchers = new Map();

// ---------------------------------------------------------------------------
// Load env file helper (reads key=value lines)
// ---------------------------------------------------------------------------
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // Ignore env parse errors
  }
}

// ---------------------------------------------------------------------------
// Load configuration
// ---------------------------------------------------------------------------
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(process.cwd(), ".env"));

// Load worker-config.json if present (written by batch script at download time)
let workerConfigFile = {};
const configJsonPath = path.join(process.cwd(), "worker-config.json");
if (fs.existsSync(configJsonPath)) {
  try {
    workerConfigFile = JSON.parse(fs.readFileSync(configJsonPath, "utf-8"));
  } catch {
    // Ignore JSON error
  }
}

const CLOUD_URL = (
  process.env.CLOUD_URL ||
  workerConfigFile.cloudUrl ||
  "https://mbh.crm.mabsolinfotech.cloud"
).replace(/\/+$/, "");

// VFP_DATA_DIR starts from config but MUST be dynamically updated from cloud dashboard heartbeat
let VFP_DATA_DIR =
  process.env.VFP_DATA_DIR ||
  workerConfigFile.dataDir ||
  "";

const USER_EMAIL =
  process.env.USER_EMAIL ||
  workerConfigFile.email ||
  "";

const SYNC_INTERVAL_MS = Number(process.env.VFP_SYNC_INTERVAL_MS || 30000);

// Optional: Direct MongoDB mode (if .env has MONGODB_URI available locally)
const MONGODB_URI = process.env.MONGODB_URI;
let mongoose = null;
if (MONGODB_URI) {
  try {
    mongoose = require("mongoose");
  } catch {
    mongoose = null;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
main().catch((error) => {
  console.error("[vfp-worker] Fatal error:", error);
  process.exitCode = 1;
});

async function main() {
  console.log("========================================================");
  console.log("  Mabsol Pharma CRM - Desktop DBF Sync Worker");
  console.log("========================================================");
  console.log(`[vfp-worker] Cloud URL    : ${CLOUD_URL}`);
  console.log(`[vfp-worker] Account Email: ${USER_EMAIL || "(fetched dynamically)"}`);
  console.log(`[vfp-worker] Worker ID    : ${WORKER_ID}`);

  if (VFP_DATA_DIR) {
    console.log(`[vfp-worker] Local DBF Dir: ${VFP_DATA_DIR}`);
  } else {
    console.log(`[vfp-worker] Local DBF Dir: (Waiting for SELECTED FILES FOLDER LOCATION from dashboard)`);
  }
  console.log("");

  if (MONGODB_URI && mongoose) {
    try {
      await mongoose.connect(MONGODB_URI, { maxPoolSize: 3 });
      console.log(`[vfp-worker] Direct MongoDB connection active`);
    } catch (err) {
      console.warn(`[vfp-worker] MongoDB direct mode unavailable, using Cloud HTTP mode:`, err.message);
    }
  } else {
    console.log(`[vfp-worker] Mode: Standalone HTTP Cloud Sync`);
  }

  // Send initial heartbeat and get cloud-configured folder path
  const initialResponse = await sendHeartbeat("online", "startup", "");
  applyCloudConfig(initialResponse);

  // Setup watcher on current VFP_DATA_DIR (if valid)
  if (VFP_DATA_DIR) setupWatcher(VFP_DATA_DIR);

  // Heartbeat + dynamic config refresh every 10 seconds
  setInterval(async () => {
    const response = await sendHeartbeat(isRunning ? "syncing" : "online", "heartbeat", "");
    applyCloudConfig(response);
  }, 10000);

  // Auto-sync on interval
  setInterval(() => {
    scheduleSync("interval");
  }, SYNC_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Apply Dynamic Config from Cloud Heartbeat Response
// ---------------------------------------------------------------------------
function applyCloudConfig(response) {
  if (!response || !response.success) return;

  const cloudDir = (response.configuredDir || "").trim();

  if (cloudDir && cloudDir !== VFP_DATA_DIR) {
    console.log(`[vfp-worker] Dynamic path updated from dashboard: ${cloudDir}`);
    VFP_DATA_DIR = cloudDir;

    // Persist to local worker-config.json
    try {
      const existingConfig = fs.existsSync(configJsonPath)
        ? JSON.parse(fs.readFileSync(configJsonPath, "utf-8"))
        : {};
      existingConfig.dataDir = cloudDir;
      fs.writeFileSync(configJsonPath, JSON.stringify(existingConfig, null, 2), "utf-8");
    } catch {
      // Ignore write error
    }

    // Update directory watcher to new path
    setupWatcher(VFP_DATA_DIR);

    // Immediately trigger sync with new path
    scheduleSync("path_updated");
  }

  if (cloudDir && !fs.existsSync(cloudDir)) {
    console.log(
      `[vfp-worker] Configured folder does not exist yet on this PC: ${cloudDir}`
    );
    console.log(
      `[vfp-worker] Please make sure your DBF folder exists at: ${cloudDir}`
    );
  }

  // Check pending sync commands from cloud dashboard
  if (Array.isArray(response.pendingCommands) && response.pendingCommands.length > 0) {
    console.log(`[vfp-worker] Cloud queued command received! Triggering immediate sync...`);
    scheduleSync("cloud_command");
  }
}

// ---------------------------------------------------------------------------
// HTTP Cloud API Communication (Zero External NPM Dependencies)
// ---------------------------------------------------------------------------
function sendHeartbeat(status, lastRunReason, lastError) {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${CLOUD_URL}/api/mabsolcrmsync/heartbeat`);
      const transport = url.protocol === "https:" ? https : http;
      const payload = JSON.stringify({
        workerId: WORKER_ID,
        status,
        dataDir: VFP_DATA_DIR,
        lastRunReason,
        lastError,
        email: USER_EMAIL,
      });

      const req = transport.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const responseJson = JSON.parse(data);
              resolve(responseJson);
            } catch {
              resolve({ success: false });
            }
          });
        }
      );

      req.on("error", (err) => {
        console.warn(`[vfp-worker] Heartbeat failed (will retry in 10s):`, err.message);
        resolve({ success: false });
      });

      req.setTimeout(8000, () => {
        req.destroy();
        resolve({ success: false });
      });

      req.write(payload);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

function uploadDbfFilesToCloud(dataDir) {
  return new Promise((resolve, reject) => {
    if (!dataDir) {
      return reject(new Error("No folder path configured. Please set SELECTED FILES FOLDER LOCATION in the dashboard."));
    }
    if (!fs.existsSync(dataDir)) {
      return reject(new Error(`Folder does not exist on this PC: ${dataDir}. Please check SELECTED FILES FOLDER LOCATION on dashboard.`));
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith(".dbf"));
    if (files.length === 0) {
      console.log(`[vfp-worker] No .DBF files found in ${dataDir}`);
      return resolve({ success: true, count: 0 });
    }

    console.log(`[vfp-worker] Uploading ${files.length} DBF file(s) from ${dataDir} to Cloud...`);

    const url = new URL(`${CLOUD_URL}/api/mabsolcrmsync/upload-dbf`);
    const boundary = "----MabsolWorkerBoundary" + Math.random().toString(16).substring(2);
    const transport = url.protocol === "https:" ? https : http;

    const postDataBuffers = [];

    for (const fileName of files) {
      const filePath = path.join(dataDir, fileName);
      if (!fs.existsSync(filePath)) continue;

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
        postDataBuffers.push(Buffer.from(header));
        postDataBuffers.push(fileBuffer);
        postDataBuffers.push(Buffer.from("\r\n"));
      } catch (readErr) {
        console.warn(`[vfp-worker] File locked/busy: ${fileName}, skipping:`, readErr.message);
      }
    }

    if (postDataBuffers.length === 0) {
      return resolve({ success: true, count: 0 });
    }

    postDataBuffers.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(postDataBuffers);

    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payload.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch {
            resolve({ success: false, error: data });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error("Upload timed out after 120 seconds"));
    });

    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// File Watcher
// ---------------------------------------------------------------------------
function setupWatcher(dirPath) {
  if (!dirPath) return;

  // Close old watchers that are no longer needed
  for (const [watchedPath, watcher] of activeWatchers.entries()) {
    if (watchedPath !== dirPath) {
      try { watcher.close(); } catch { }
      activeWatchers.delete(watchedPath);
      console.log(`[vfp-worker] Stopped watching old path: ${watchedPath}`);
    }
  }

  if (activeWatchers.has(dirPath)) return;

  if (!fs.existsSync(dirPath)) {
    console.warn(`[vfp-worker] Folder not found on this PC: ${dirPath}`);
    console.warn(`[vfp-worker] Set the correct path in the dashboard "SELECTED FILES FOLDER LOCATION" field.`);
    return;
  }

  try {
    const watcher = fs.watch(dirPath, { recursive: true }, (_eventType, fileName) => {
      if (!fileName) return;
      if (!fileName.toLowerCase().endsWith(".dbf")) return;
      console.log(`[vfp-worker] File change detected: ${fileName}`);
      scheduleSync(`file:${fileName}`);
    });
    activeWatchers.set(dirPath, watcher);
    console.log(`[vfp-worker] Watching for DBF changes in: ${dirPath}`);
  } catch (err) {
    console.warn(`[vfp-worker] Could not set up watcher on ${dirPath}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Sync Scheduling
// ---------------------------------------------------------------------------
function scheduleSync(reason) {
  clearTimeout(scheduledTimer);
  scheduledTimer = setTimeout(() => {
    runSync(reason).catch((err) => {
      console.error("[vfp-worker] Sync error:", err.message);
    });
  }, 2000);
}

async function runSync(reason) {
  if (isRunning) return;

  if (!VFP_DATA_DIR) {
    console.log(`[vfp-worker] Skipping sync - no folder path configured yet.`);
    console.log(`[vfp-worker] Please set "SELECTED FILES FOLDER LOCATION" on the dashboard.`);
    return;
  }

  isRunning = true;
  try {
    await sendHeartbeat("syncing", reason, "");
    console.log(`[vfp-worker] Starting sync from: ${VFP_DATA_DIR} (reason: ${reason})`);

    const result = await uploadDbfFilesToCloud(VFP_DATA_DIR);
    if (result.success) {
      console.log(`[vfp-worker] Sync complete! ${result.message || "Cloud database updated."}`);
      await sendHeartbeat("online", reason, "");
    } else {
      const errMsg = result.error || "Upload failed";
      console.error(`[vfp-worker] Sync error:`, errMsg);
      await sendHeartbeat("error", reason, errMsg);
    }
  } catch (err) {
    console.error(`[vfp-worker] Sync failed:`, err.message);
    await sendHeartbeat("error", reason, err.message);
  } finally {
    isRunning = false;
  }
}
