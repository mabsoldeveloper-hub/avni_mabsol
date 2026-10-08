import dbConnect from "@/lib/mongodb";
import VfpConflict from "@/models/VfpConflict";
import VfpFileAsset from "@/models/VfpFileAsset";
import VfpOutboundQueue from "@/models/VfpOutboundQueue";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpSyncState from "@/models/VfpSyncState";
import VfpTableMap from "@/models/VfpTableMap";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";
import path from "path";
import Company from "@/models/Company";

export const CORE_16_SYNC_TABLES = new Set([
  "acgroup",
  "billserial",
  "dis",
  "gledger",
  "glmonth",
  "maorder",
  "mdis",
  "mdoc",
  "order",
  "pend",
  "pendings",
  "pro",
  "probat",
  "rate",
  "saletype",
  "slipno",
  "subdis",
  "support",
]);

export function cleanBaseTableName(fileName: string): string {
  let cleaned = fileName.trim().replace(/\.dbf$/i, "");
  cleaned = cleaned.replace(/[\._][a-zA-Z]?\d+$/i, "");
  return cleaned.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
}

export function formatDisplayPath(rawPath?: string): string {
  if (!rawPath) return "";
  const normalized = rawPath.replace(/\\/g, "/").trim().replace(/\/+$/, "");
  const match = normalized.match(/(?:^|\/)(?:data|vfp_uploads)\/(.+)$/i);
  if (match && match[1]) {
    return match[1].replace(/^vfp_uploads\//i, "");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return normalized;
}

type SyncStateSummary = {
  lastSyncedAt?: Date | null;
  status?: string;
  lastImportedCount?: number;
};

type FileTypeSummary = {
  _id?: string;
  count: number;
};

type VfpDateRange = "all" | "day" | "week" | "month";

type VfpStatusFilter = {
  range?: VfpDateRange;
  startDate?: string;
  endDate?: string;
  fileLimit?: number;
  companyCode?: string;
  companyId?: string;
  companyName?: string;
};

function getDateRangeStart(range: VfpDateRange) {
  const now = new Date();
  const start = new Date(now);

  if (range === "day") {
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (range === "week") {
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setUTCDate(now.getUTCDate() - diff);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (range === "month") {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  return undefined;
}

function parseFilterDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseEndOfDay(value?: string) {
  const parsed = parseFilterDate(value);
  if (!parsed) {
    return undefined;
  }

  parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

export async function getVfpStatus(filter: VfpStatusFilter = {}, email?: string) {
  await dbConnect();

  // Clean up stale queued or processing commands older than 1 hour to prevent infinite UI polling loops
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await VfpSyncCommand.updateMany(
      { status: { $in: ["queued", "processing"] }, createdAt: { $lt: oneHourAgo } },
      { $set: { status: "failed", message: "Command timed out" } }
    );
  } catch (err) {
    console.error("Failed to clean up stale VFP sync commands:", err);
  }

  const { range = "all", startDate, endDate, fileLimit = 10 } = filter;
  const rangeFrom = getDateRangeStart(range);
  const parsedStart = parseFilterDate(startDate);
  const parsedEnd = parseEndOfDay(endDate);
  const fromDate = parsedStart ?? rangeFrom;
  const toDate = parsedEnd;

  const stateFilter: Record<string, unknown> = {};
  const fileFilter: Record<string, unknown> = {};
  const logFilter: Record<string, unknown> = {};

  if (email) {
    stateFilter.email = email;
    fileFilter.email = email;
    logFilter.email = email;
  }

  if (fromDate || toDate) {
    const dateQuery: Record<string, Date> = {};

    if (fromDate) {
      dateQuery.$gte = fromDate;
    }
    if (toDate) {
      dateQuery.$lte = toDate;
    }

    stateFilter.lastSyncedAt = dateQuery;
    fileFilter.lastSyncedAt = dateQuery;
    logFilter.createdAt = dateQuery;
  }

  const [
    tableCount,
    states,
    recentLogs,
    conflictCount,
    pendingOutboundCount,
    pendingCommandCount,
    fileCount,
    storedFileCount,
    failedFileCount,
    fileSizeSummary,
    fileTypeSummary,
    recentFiles,
    workerHeartbeat,
  ] = await Promise.all([
    VfpSyncState.countDocuments(stateFilter),
    VfpSyncState.find(stateFilter).sort({ updatedAt: -1 }).lean(),
    VfpSyncLog.find(logFilter).sort({ createdAt: -1 }).limit(50).lean(),
    VfpConflict.countDocuments({ status: "open", ...(email ? { email } : {}) }),
    VfpOutboundQueue.countDocuments({ status: "pending", ...(email ? { email } : {}) }),
    VfpSyncCommand.countDocuments({ status: "queued", ...(email ? { email } : {}) }),
    VfpFileAsset.countDocuments(fileFilter),
    VfpFileAsset.countDocuments({ ...fileFilter, storageStatus: "stored" }),
    VfpFileAsset.countDocuments({ ...fileFilter, storageStatus: "failed" }),
    VfpFileAsset.aggregate([
      { $match: fileFilter },
      { $group: { _id: null, bytes: { $sum: "$size" } } },
    ]),
    VfpFileAsset.aggregate([
      { $match: fileFilter },
      {
        $group: {
          _id: { $ifNull: ["$extension", "no extension"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    VfpFileAsset.find(fileFilter)
      .sort({ lastSyncedAt: -1 })
      .limit(fileLimit)
      .lean(),
    VfpWorkerHeartbeat.findOne({}).sort({ lastSeenAt: -1 }).lean(),
  ]);

  const typedStates = states as unknown as SyncStateSummary[];

  const lastSyncedDates = typedStates
    .map((state) => (state.lastSyncedAt ? new Date(state.lastSyncedAt) : undefined))
    .filter((value): value is Date => Boolean(value))
    .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

  const failedTables = typedStates.filter((state) =>
    ["failed", "locked"].includes(state.status || "")
  );

  const importedRows = typedStates.reduce(
    (total: number, state: SyncStateSummary) =>
      total + (state.lastImportedCount || 0),
    0
  );

  const filteredImportedRows = rangeFrom
    ? typedStates.reduce((total: number, state: SyncStateSummary) => {
        const date = state.lastSyncedAt ? new Date(state.lastSyncedAt) : null;
        return total + (date && date >= rangeFrom ? state.lastImportedCount || 0 : 0);
      }, 0)
    : importedRows;

  const trackedBytes = fileSizeSummary[0]?.bytes || 0;
  const fileTypes = (fileTypeSummary as FileTypeSummary[]).reduce<
    Record<string, number>
  >((acc, fileType) => {
    acc[fileType._id || "no extension"] = fileType.count;
    return acc;
  }, {});
  let dataDir = process.env.VFP_DATA_DIR || "";
  let sourceDir = "";
  let consoleSyncDir = "";
  let enabledFiles: string[] = [];
  let autoSync = false;
  let autoSyncInterval = 10;
  let useVfpEngine = false;
  let vfpExePath = "C:\\Program Files (x86)\\Microsoft Visual FoxPro 9\\vfp9.exe";
  let prgPath = "";

  const config = (
    await VfpConfig.findOne(email ? { email } : { key: "vfp_sync_config" }).lean() ||
    await VfpConfig.findOne({ key: "vfp_sync_config" }).lean()
  ) as any;
  if (config) {
    if (config.dataDir !== undefined) dataDir = config.dataDir;
    if (config.sourceDir) sourceDir = config.sourceDir;
    if (config.consoleSyncDir !== undefined) consoleSyncDir = config.consoleSyncDir;
    if (config.enabledFiles) enabledFiles = config.enabledFiles;
    if (config.autoSync !== undefined) autoSync = config.autoSync;
    if (config.autoSyncInterval !== undefined) autoSyncInterval = config.autoSyncInterval;
    if (config.useVfpEngine !== undefined) useVfpEngine = config.useVfpEngine;
    if (config.vfpExePath) vfpExePath = config.vfpExePath;
    if (config.prgPath) prgPath = config.prgPath;
  }

  // Resolve target company code & name from filter, companyId, or config
  let targetCompanyCode = filter.companyCode || (config as any)?.companyCode || "";
  let targetCompanyName = filter.companyName || (config as any)?.companyName || "";

  if ((!targetCompanyCode || !targetCompanyName) && filter.companyId) {
    try {
      const compDoc: any = await Company.findById(filter.companyId).lean();
      if (compDoc) {
        if (!targetCompanyCode) targetCompanyCode = compDoc.companyCode || compDoc.code || "";
        if (!targetCompanyName) targetCompanyName = compDoc.companyName || compDoc.name || "";
      }
    } catch {}
  }

  if (!targetCompanyCode) {
    targetCompanyCode = "DEFAULT";
  }
  if (!targetCompanyName) {
    targetCompanyName = targetCompanyCode === "DEFAULT" ? "Default Company" : targetCompanyCode;
  }

  const sanitizedEmail = (email || "global").replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedCompany = targetCompanyCode ? targetCompanyCode.replace(/[^a-zA-Z0-9_-]/g, "_") : "DEFAULT";

  // Priority search for server-side DBF directory targeting this company across all storage locations
  const baseDataRoots = [
    "/home/vfpuser/data",
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "data", "vfp_uploads"),
  ];

  const companyCandidates: (string | undefined | null)[] = [
    // 1. Direct path for logged-in user and company
    path.join("/home/vfpuser/data", sanitizedEmail, sanitizedCompany),
    path.join(process.cwd(), "data", sanitizedEmail, sanitizedCompany),
    path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail, sanitizedCompany),
  ];

  // 2. Direct company folder under base roots
  for (const root of baseDataRoots) {
    companyCandidates.push(path.join(root, sanitizedCompany));
  }

  // 3. Search all user folders under base roots for this company folder
  for (const root of baseDataRoots) {
    try {
      if (fs.existsSync(root)) {
        const entries = fs.readdirSync(root, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory()) {
            const compFolder = path.join(root, ent.name, sanitizedCompany);
            if (!companyCandidates.includes(compFolder)) {
              companyCandidates.push(compFolder);
            }
          }
        }
      }
    } catch {}
  }

  // 4. Fallbacks (config paths, user base folders)
  companyCandidates.push(
    path.join("/home/vfpuser/data", sanitizedEmail),
    path.join(process.cwd(), "data", sanitizedEmail),
    path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail),
    config?.consoleSyncDir,
    config?.sourceDir,
    config?.dataDir,
    process.env.VFP_DATA_DIR,
  );

  let serverDataDir = "";
  let serverCompanyFiles: string[] = [];

  for (const c of (companyCandidates.filter(Boolean) as string[])) {
    try {
      if (fs.existsSync(c)) {
        const entries = fs.readdirSync(c);
        const validFiles = entries.filter((f) => {
          if (!f.toLowerCase().endsWith(".dbf")) return false;
          const base = cleanBaseTableName(f);
          return CORE_16_SYNC_TABLES.has(base);
        });
        if (validFiles.length > 0) {
          serverDataDir = c;
          serverCompanyFiles = validFiles;
          break;
        }
      }
    } catch {}
  }

  if (serverDataDir) {
    dataDir = serverDataDir;
    consoleSyncDir = serverDataDir;
    enabledFiles = serverCompanyFiles;
  }

  const dataDirExists = Boolean(dataDir) && fs.existsSync(dataDir);
  const heartbeat = workerHeartbeat as
    | {
        status?: string;
        lastSeenAt?: Date;
        lastError?: string;
        lastRunReason?: string;
      }
    | null;
  const lastSeenAt = heartbeat?.lastSeenAt
    ? new Date(heartbeat.lastSeenAt)
    : undefined;
  const workerOnline =
    dataDirExists || serverCompanyFiles.length > 0 || (Boolean(lastSeenAt) && Date.now() - Number(lastSeenAt) < 30_000);

  return {
    workerConfigured: Boolean(dataDir) || serverCompanyFiles.length > 0,
    workerOnline,
    workerStatus: (dataDirExists || serverCompanyFiles.length > 0) ? "Active" : (heartbeat?.status || "offline"),
    workerLastSeenAt: lastSeenAt,
    workerLastError: heartbeat?.lastError || "",
    workerLastRunReason: heartbeat?.lastRunReason || "",
    dataDir,
    dataDirExists,
    sourceDir,
    consoleSyncDir,
    enabledFiles,
    serverFiles: serverCompanyFiles,
    serverFileCount: serverCompanyFiles.length,
    serverDataDir,
    displayDataDir: formatDisplayPath(serverDataDir || dataDir),
    autoSync,
    autoSyncInterval,
    useVfpEngine,
    vfpExePath,
    prgPath,
    conflictPolicy: process.env.VFP_CONFLICT_POLICY || "vfp_wins",
    tableCount: serverCompanyFiles.length > 0 ? serverCompanyFiles.length : tableCount,
    importedRows: filteredImportedRows,
    failedCount: failedTables.length,
    conflictCount,
    pendingOutboundCount,
    pendingCommandCount,
    companyCode: targetCompanyCode,
    companyName: targetCompanyName,
    fileCount: serverCompanyFiles.length > 0 ? serverCompanyFiles.length : fileCount,
    storedFileCount,
    failedFileCount,
    trackedBytes,
    fileTypes,
    recentFiles,
    lastSyncedAt: lastSyncedDates,
    states,
    recentLogs: (() => {
      const completedKeys = new Set<string>();
      for (const log of recentLogs) {
        if (log.status === "success" || log.status === "failed") {
          const key = `${log.runId || ""}_${log.tableName || log.action || ""}`;
          completedKeys.add(key);
        }
      }
      return recentLogs.filter((log) => {
        // Exclude 0-row empty success logs
        if (log.status === "success" && log.importedCount === 0) return false;
        if (log.message && /0 rows/i.test(log.message)) return false;

        if (log.status === "running") {
          const key = `${log.runId || ""}_${log.tableName || log.action || ""}`;
          if (completedKeys.has(key)) return false;
          if (log.createdAt && Date.now() - new Date(log.createdAt).getTime() > 15 * 60 * 1000) {
            return false;
          }
        }
        return true;
      });
    })(),
    range,
    rangeFrom,
    startDate,
    endDate,
    fileLimit,
  };
}
