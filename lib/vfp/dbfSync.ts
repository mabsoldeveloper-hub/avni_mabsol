import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpTableMap from "@/models/VfpTableMap";
import VfpSyncState from "@/models/VfpSyncState";
import VfpSyncLog from "@/models/VfpSyncLog";

const VFP_ENCODING = process.env.VFP_ENCODING || "latin1";

export async function performDirectServerSync(userEmail: string, customDataDir?: string) {
  await dbConnect();

  const email = userEmail || "global";

  // STRICT USER ISOLATION: Only look up THIS user's own config — never fall back to other users
  const config: any =
    (await VfpConfig.findOne({ email }).lean()) ||
    (await VfpConfig.findOne({ key: "vfp_sync_config", email }).lean()) ||
    null;

  let dataDir: string = customDataDir || config?.consoleSyncDir || config?.sourceDir || config?.dataDir || process.env.VFP_DATA_DIR || "";
  const enabledFiles: string[] = config?.enabledFiles || [];

  const sanitizedEmail = (userEmail || "global").replace(/[^a-zA-Z0-9_-]/g, "_");
  const uploadDir = path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail);

  // Helper to find directory containing DBF files
  const findDbfInDir = (dirPath: string): string | null => {
    try {
      if (!fs.existsSync(dirPath)) return null;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      if (entries.some((e) => !e.isDirectory() && e.name.toLowerCase().endsWith(".dbf"))) {
        return dirPath;
      }
      for (const e of entries) {
        if (e.isDirectory()) {
          const sub = path.join(dirPath, e.name);
          const found = findDbfInDir(sub);
          if (found) return found;
        }
      }
    } catch {}
    return null;
  };

  if (!dataDir || !fs.existsSync(dataDir) || !findDbfInDir(dataDir)) {
    const candidates = [
      uploadDir,
      path.join("/home/vfpuser/data", sanitizedEmail),
      "/home/vfpuser/data",
      path.join(process.cwd(), "data"),
    ];
    for (const c of candidates) {
      const found = findDbfInDir(c);
      if (found) {
        dataDir = found;
        break;
      }
    }
  }

  if (!dataDir || !fs.existsSync(dataDir)) {
    throw new Error(
      `No valid DBF data directory configured for user ${email}. Please set your folder path in the Sync Console or upload DBF files via the browser.`
    );
  }

  const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const startedAt = new Date();

  const runningSyncLog = await VfpSyncLog.create({
    runId,
    email,
    action: "sync",
    status: "running",
    message: `Direct server data sync started for user ${email}`,
    startedAt,
  });

  try {
    let files = listFiles(dataDir).filter((filePath) =>
      isValidTableFile(path.basename(filePath))
    );

    // Only apply the enabledFiles filter when syncing from a non-upload directory
    const isUploadDir = dataDir === uploadDir;
    if (!isUploadDir && enabledFiles && enabledFiles.length > 0) {
      const enabledSet = new Set(
        enabledFiles.map((f) => path.basename(f).toLowerCase())
      );
      files = files.filter((filePath) => {
        const baseName = path.basename(filePath).toLowerCase();
        const baseNameWithoutExt = baseName.replace(/\.[^.]+$/, "");

        if (enabledSet.has(baseName)) return true;
        if (enabledSet.has(`${baseNameWithoutExt}.dbf`)) return true;
        if (enabledSet.has(baseNameWithoutExt)) return true;
        return false;
      });
    }

    const dbfFiles = files.filter((filePath) =>
      filePath.toLowerCase().endsWith(".dbf")
    );

    let totalImportedTables = 0;
    let totalImportedRows = 0;

    for (const filePath of dbfFiles) {
      const importedRows = await importSingleDbfFile(filePath, runId, email, dataDir);
      totalImportedRows += importedRows;
      totalImportedTables++;
    }

    await VfpSyncLog.findByIdAndUpdate(runningSyncLog._id, {
      $set: {
        status: "success",
        message: `Direct server sync completed successfully. ${totalImportedTables} table(s), ${totalImportedRows} row(s) updated in real-time.`,
        finishedAt: new Date(),
      },
    });

    return {
      success: true,
      runId,
      importedTables: totalImportedTables,
      importedRows: totalImportedRows,
    };
  } catch (syncErr: any) {
    await VfpSyncLog.findByIdAndUpdate(runningSyncLog._id, {
      $set: {
        status: "failed",
        error: syncErr?.message || "Sync failed",
        message: `Direct server sync failed: ${syncErr?.message || "Unknown error"}`,
        finishedAt: new Date(),
      },
    });
    throw syncErr;
  }
}

async function importSingleDbfFile(
  filePath: string,
  runId: string,
  email: string,
  dataDir: string
) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const fileName = path.basename(filePath);
  const tableName = baseName;
  const sanitizedTableName = sanitizeCollectionName(baseName);
  const targetCollection = `vfp_new_folder_${sanitizedTableName}`;
  const startedAt = new Date();

  await VfpSyncState.updateOne(
    { tableName, email },
    {
      $set: {
        tableName,
        email,
        fileName,
        filePath,
        targetCollection,
        status: "running",
        lastStartedAt: startedAt,
      },
    },
    { upsert: true }
  );

  // Write a "running" log entry so live progress polling can see this table is active
  const runningTableLog = await VfpSyncLog.create({
    runId,
    email,
    tableName,
    fileName,
    action: "dbf_to_crm",
    status: "running",
    message: `Processing ${fileName}...`,
    startedAt,
  });

  try {
    const stats = fs.statSync(filePath);
    const dbf = readDbf(filePath);
    const primaryKeyFields = guessPrimaryKeyFields(dbf.fields, dbf.rows);

    // Pre-index field names in uppercase once for O(1) row processing
    const fieldUpperMap = new Map<string, string>();
    for (const f of dbf.fields) {
      fieldUpperMap.set(f.name.toUpperCase(), f.name);
    }

    await VfpTableMap.updateOne(
      { fileName, email },
      {
        $set: {
          fileName,
          email,
          filePath,
          targetCollection,
          primaryKeyFields,
          columns: dbf.fields,
          recordCount: dbf.recordCount,
          lastFileMtimeMs: stats.mtimeMs,
          lastDiscoveredAt: new Date(),
          enabled: true,
        },
      },
      { upsert: true }
    );

    const collection = mongoose.connection.collection(targetCollection);
    // Only check and build index if not already present, avoiding heavy aggregation on every sync
    const existingIndexes = await collection.indexes().catch(() => []);
    const hasCompoundIndex = existingIndexes.some(
      (idx: any) => idx.key && idx.key._vfpTable && idx.key._vfpSourceKey
    );
    if (!hasCompoundIndex) {
      await collection.dropIndex("_vfpSourceKey_1").catch(() => { });
      await deduplicateCollection(collection, "_vfpSourceKey");
      await collection.createIndex({ _vfpTable: 1, _vfpSourceKey: 1 }, { unique: true }).catch(() => { });
    }

    const seenCounts = new Map<string, number>();
    const docs = dbf.rows.map((row: any) => {
      const sourceKey = buildSourceKey(row, tableName, primaryKeyFields, seenCounts, fieldUpperMap);
      return {
        ...row.data,
        _vfpTable: tableName,
        _vfpSourceKey: sourceKey,
        _vfpRowNumber: row.rowNumber,
        _vfpFileName: fileName,
        _vfpFileMtimeMs: stats.mtimeMs,
        _vfpDeleted: row.deleted,
        _vfpSyncRunId: runId,
        _vfpSyncedAt: new Date(),
      };
    });

    let importedCount = 0;
    const BATCH_SIZE = 5000;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      if (chunk.length > 0) {
        const ops = chunk.map((doc: any) => ({
          updateOne: {
            filter: {
              _vfpTable: tableName,
              _vfpSourceKey: doc._vfpSourceKey,
            },
            update: { $set: doc },
            upsert: true,
          },
        }));
        await collection.bulkWrite(ops, { ordered: false });
        importedCount += chunk.length;
      }
    }

    const syncDateLabel = getSyncDateLabel(new Date());
    const tableHash = `${stats.mtimeMs}-${dbf.recordCount}`;
    await VfpSyncState.updateOne(
      { tableName, email },
      {
        $set: {
          status: "success",
          lastSyncedAt: new Date(),
          lastSyncedDate: syncDateLabel,
          lastFileMtimeMs: stats.mtimeMs,
          lastRecordCount: dbf.recordCount,
          lastImportedCount: importedCount,
          lastSkippedCount: 0,
          lastHash: tableHash,
          lastError: "",
        },
      },
      { upsert: true }
    );

    // Update running log in-place to success
    await VfpSyncLog.findByIdAndUpdate(runningTableLog._id, {
      $set: {
        status: "success",
        importedCount,
        message: `Imported and updated ${importedCount} row(s) from ${fileName}.`,
        finishedAt: new Date(),
      },
    });

    return importedCount;
  } catch (error: any) {
    await VfpSyncState.updateOne(
      { tableName, email },
      {
        $set: {
          status: "failed",
          lastError: error.message,
        },
      },
      { upsert: true }
    );

    // Update running log in-place to failed
    await VfpSyncLog.findByIdAndUpdate(runningTableLog._id, {
      $set: {
        status: "failed",
        error: error.message,
        message: `Failed to import ${fileName}: ${error.message}`,
        finishedAt: new Date(),
      },
    });

    return 0;
  }
}

function listFiles(rootDir: string): string[] {
  const files: string[] = [];
  function traverse(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isValidDirectory(entry.name)) {
          traverse(entryPath);
        }
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  traverse(rootDir);
  return files;
}

function isValidDirectory(dirName: string) {
  const name = dirName.toLowerCase();
  if (dirName.startsWith("_") || dirName.startsWith("~")) return false;
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) return false;
  return true;
}

function isValidTableFile(fileName: string) {
  const name = fileName.toLowerCase();
  if (fileName.startsWith("_") || fileName.startsWith("~")) return false;
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) return false;
  return true;
}

export function readDbf(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields: any[] = [];

  for (let offset = 32; offset < headerLength; offset += 32) {
    if (buffer[offset] === 0x0d) break;

    const name = decodeText(buffer.subarray(offset, offset + 11)).replace(/\0/g, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimalCount = buffer[offset + 17];

    if (name) {
      const dataOffset = fields.reduce((total, field) => total + field.length, 1);
      fields.push({ name, type, length, decimalCount, dataOffset });
    }
  }

  const ext = path.extname(filePath);
  const baseName = filePath.slice(0, -ext.length);
  const fptPath = baseName + (ext === ext.toUpperCase() ? ".FPT" : ".fpt");
  const hasFpt = fs.existsSync(fptPath);

  const rows: any[] = [];
  for (let index = 0; index < recordCount; index += 1) {
    const base = headerLength + index * recordLength;
    if (base + recordLength > buffer.length) break;

    let cursor = base + 1;
    const data: Record<string, any> = {};

    for (const field of fields) {
      const raw = buffer.subarray(cursor, cursor + field.length);
      let val = parseFieldValue(raw, field);

      if (hasFpt && (field.type === "M" || field.type === "G" || field.type === "P")) {
        const blockNumber = parseMemoPointer(raw);
        if (blockNumber > 0) {
          val = readFptMemo(fptPath, blockNumber, field.type);
        } else {
          val = "";
        }
      }

      data[field.name] = val;
      cursor += field.length;
    }

    rows.push({
      rowNumber: index + 1,
      deleted: buffer[base] === 0x2a,
      data,
    });
  }

  return { fields, rows, recordCount, headerLength, recordLength };
}

function parseFieldValue(raw: Buffer, field: any) {
  const text = decodeText(raw).trim();
  if (text === "") return null;

  switch (field.type) {
    case "N":
    case "F":
      return Number.isNaN(Number(text)) ? text : Number(text);
    case "I":
      return raw.length >= 4 ? raw.readInt32LE(0) : null;
    case "Y":
      return raw.length >= 8 ? Number(raw.readBigInt64LE(0)) / 10000 : null;
    case "D":
      return /^\d{8}$/.test(text)
        ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
        : text;
    case "L":
      return ["Y", "y", "T", "t"].includes(text)
        ? true
        : ["N", "n", "F", "f"].includes(text)
          ? false
          : null;
    case "M":
    case "G":
    case "P":
      return { memoPointer: text };
    default:
      return text;
  }
}

function parseMemoPointer(raw: Buffer) {
  if (raw.length === 4) return raw.readUInt32LE(0);
  const text = raw.toString("latin1").trim();
  const num = Number(text);
  return isNaN(num) ? 0 : num;
}

function readFptMemo(fptPath: string, blockNum: number, fieldType: string) {
  try {
    const fd = fs.openSync(fptPath, "r");
    try {
      const headerBuffer = Buffer.alloc(8);
      fs.readSync(fd, headerBuffer, 0, 8, 0);
      const blockSize = headerBuffer.readUInt16BE(6) || 64;

      const blockOffset = blockNum * blockSize;
      const blockHeader = Buffer.alloc(8);
      fs.readSync(fd, blockHeader, 0, 8, blockOffset);

      const signature = blockHeader.readUInt32BE(0);
      const length = blockHeader.readUInt32BE(4);

      if (length <= 0 || length > 50 * 1024 * 1024) return "";

      const memoBuffer = Buffer.alloc(length);
      fs.readSync(fd, memoBuffer, 0, length, blockOffset + 8);

      if (signature === 1 && fieldType === "M") {
        return memoBuffer.toString(VFP_ENCODING as BufferEncoding).trim();
      } else {
        return memoBuffer.toString("base64");
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

export async function deduplicateCollection(
  collection: any,
  keyField = "_vfpSourceKey"
): Promise<number> {
  try {
    const duplicates = await collection
      .aggregate([
        {
          $match: {
            _vfpTable: { $exists: true, $nin: [null, ""] },
            [keyField]: { $exists: true, $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: { _vfpTable: "$_vfpTable", key: `$${keyField}` },
            count: { $sum: 1 },
            ids: { $push: "$_id" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    let removed = 0;
    for (const dup of duplicates) {
      // Keep the last ID (most recent), remove the previous duplicates
      const toDelete = dup.ids.slice(0, dup.ids.length - 1);
      if (toDelete.length > 0) {
        const res = await collection.deleteMany({ _id: { $in: toDelete } });
        removed += res.deletedCount || 0;
      }
    }
    return removed;
  } catch (err) {
    console.error(`[dbfSync] Error deduplicating ${collection.collectionName}:`, err);
    return 0;
  }
}

export async function deduplicateAllVfpCollections(): Promise<Record<string, number>> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return {};

  const collections = await db.listCollections().toArray();
  const colNames = collections.map((c) => c.name);
  const targetCols = colNames.filter((name) => name.startsWith("vfp_new_folder_"));

  const results: Record<string, number> = {};

  // 1. Deduplicate all raw synced collections (vfp_new_folder_*)
  for (const colName of targetCols) {
    const col = db.collection(colName);
    // Drop single-field unique index if it exists
    await col.dropIndex("_vfpSourceKey_1").catch(() => { });
    const removed = await deduplicateCollection(col, "_vfpSourceKey");
    if (removed > 0) {
      results[colName] = removed;
    }
    // Ensure compound unique index on {_vfpTable: 1, _vfpSourceKey: 1}
    await col.createIndex({ _vfpTable: 1, _vfpSourceKey: 1 }, { unique: true }).catch(() => { });
  }

  // 2. Deduplicate mapped CRM collections if present
  if (colNames.includes("orders")) {
    const col = db.collection("orders");
    const removed = await deduplicateCollection(col, "ORDNO");
    if (removed > 0) results["orders"] = removed;
    await col.createIndex({ ORDNO: 1 }, { unique: true }).catch(() => { });
  }

  if (colNames.includes("products")) {
    const col = db.collection("products");
    const removed = await deduplicateCollection(col, "PCODE");
    if (removed > 0) results["products"] = removed;
    await col.createIndex({ PCODE: 1 }, { unique: true }).catch(() => { });
  }

  if (colNames.includes("pends")) {
    const col = db.collection("pends");
    try {
      const dups = await col
        .aggregate([
          { $match: { ORD: { $exists: true, $nin: [null, ""] }, VOUCHER: { $exists: true, $ne: null } } },
          {
            $group: {
              _id: { ORD: "$ORD", VOUCHER: "$VOUCHER" },
              count: { $sum: 1 },
              ids: { $push: "$_id" },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

      let removed = 0;
      for (const dup of dups) {
        const toDelete = dup.ids.slice(0, dup.ids.length - 1);
        if (toDelete.length > 0) {
          const res = await col.deleteMany({ _id: { $in: toDelete } });
          removed += res.deletedCount || 0;
        }
      }
      if (removed > 0) results["pends"] = removed;
      await col.createIndex({ ORD: 1, VOUCHER: 1 }, { unique: true }).catch(() => { });
    } catch (e) {
      console.error("[dbfSync] Error deduplicating pends:", e);
    }
  }

  return results;
}

function guessPrimaryKeyFields(fields: any[], rows: any[]) {
  const candidateLists = [
    ["CODEP"],
    ["PCODE"],
    ["ORDNO"],
    ["CODE"],
    ["ITEMID"],
    ["CUSTID"],
    ["ID"],
    ["VCN"],
    ["VOUCHER"],
    ["DOCNO"],
    ["BILLNO"],
  ];
  const fieldNamesUpper = fields.map((f) => f.name.toUpperCase());

  for (const cands of candidateLists) {
    const match = cands.find((cand) => fieldNamesUpper.includes(cand));
    if (match) {
      const realName = fields.find((f) => f.name.toUpperCase() === match)?.name;
      if (!realName) continue;

      const values = new Set();
      let unique = true;
      for (const row of rows) {
        const val = row.data[realName];
        if (val === undefined || val === null || String(val).trim() === "" || values.has(val)) {
          unique = false;
          break;
        }
        values.add(val);
      }
      if (unique && rows.length > 0) return [realName];
    }
  }
  return [];
}

export function buildSourceKey(
  row: any,
  tableName: string,
  primaryKeyFields: string[],
  seenCounts?: Map<string, number>,
  fieldUpperMap?: Map<string, string>
): string {
  const normTable = sanitizeCollectionName(tableName);
  const d = row.data || {};

  // High-speed O(1) field getter avoiding expensive Object.keys loops per row
  const getField = (...names: string[]) => {
    for (const name of names) {
      if (fieldUpperMap) {
        const actualKey = fieldUpperMap.get(name.toUpperCase());
        if (actualKey && d[actualKey] !== undefined && d[actualKey] !== null) {
          const s = String(d[actualKey]).trim();
          if (s) return s;
        }
      } else {
        for (const k of Object.keys(d)) {
          if (k.toUpperCase() === name.toUpperCase() && d[k] !== undefined && d[k] !== null) {
            const s = String(d[k]).trim();
            if (s) return s;
          }
        }
      }
    }
    return "";
  };

  let key = "";

  // 1. Table-specific natural business keys
  if (normTable === "order" || normTable === "ledger" || normTable === "party" || normTable === "customer") {
    key = getField("CODEP", "ORDNO", "CODE", "SCODE");
  } else if (normTable === "pro" || normTable === "product" || normTable === "item") {
    key = getField("PCODE", "CODE", "ITEMID");
  } else if (normTable === "probat" || normTable === "batch") {
    const pcode = getField("PCODE", "CODE");
    const batch = getField("BATCHNO", "BATCH", "MYBATCH");
    if (pcode && batch) key = `${pcode}_${batch}`;
    else if (pcode) key = `${pcode}_row_${row.rowNumber}`;
  } else if (normTable === "mdis" || normTable === "invoice" || normTable === "sale" || normTable === "purchase") {
    const type = getField("TYPE") || "S";
    const vcn = getField("VCN", "VOUCHER", "BILLNO", "DOCNO");
    if (vcn) key = `${type}_${vcn}`;
  } else if (normTable === "dis" || normTable === "subdis" || normTable === "dispatch") {
    const vcn = getField("VCN", "VOUCHER");
    const srno = getField("SRNO", "SNO");
    const prod = getField("CODE", "PCODE");
    const batch = getField("BATCH");
    if (vcn && srno) key = `${vcn}_${srno}`;
    else if (vcn && prod && batch) key = `${vcn}_${prod}_${batch}`;
    else if (vcn && prod) key = `${vcn}_${prod}_row_${row.rowNumber}`;
    else if (vcn) key = `${vcn}_row_${row.rowNumber}`;
  } else if (normTable === "gledger") {
    const vcn = getField("VOUCHER", "VCN", "TFVOUCHER");
    const srno = getField("SRNO", "SNO", "VCSNO");
    const code = getField("CODE", "CODE1");
    if (vcn && srno) key = `${vcn}_${srno}`;
    else if (vcn && code) key = `${vcn}_${code}_row_${row.rowNumber}`;
    else if (vcn) key = `${vcn}_row_${row.rowNumber}`;
  } else if (normTable === "pend" || normTable === "pendings") {
    const ord = getField("ORD", "ORDNO", "CODEP");
    const vcn = getField("VOUCHER", "VCN", "BILLNO", "SVOUCHER");
    if (ord && vcn) key = `${ord}_${vcn}`;
    else if (ord) key = `${ord}_row_${row.rowNumber}`;
    else if (vcn) key = `${vcn}_row_${row.rowNumber}`;
  } else if (normTable === "rate") {
    const code = getField("CODE", "PCODE");
    const cat = getField("CATEGORY", "CATG") || "0";
    if (code) key = `${code}_${cat}`;
  } else if (normTable === "saletype") {
    const code = getField("CODE", "SCODE", "TCODE", "STYPE");
    if (code) key = code;
    else {
      const parnam = getField("PARNAM", "SNAME", "TNAME", "NAME");
      if (parnam) key = `${parnam}_row_${row.rowNumber}`;
    }
  } else if (normTable === "maorder") {
    key = getField("ORDNO", "CODEP", "CODE");
  } else if (normTable === "acgroup") {
    key = getField("CODE", "GCODE", "GROUP");
  } else if (normTable === "glmonth") {
    const code = getField("CODE", "PCODE");
    const date = getField("DATE");
    if (code && date) key = `${code}_${date}`;
    else if (code) key = `${code}_row_${row.rowNumber}`;
  } else if (normTable === "slipno") {
    const vcn = getField("VOUCHER", "SVOUCHER", "INVOICE");
    const line = getField("LINE");
    if (vcn && line) key = `${vcn}_${line}`;
    else if (vcn) key = `${vcn}_row_${row.rowNumber}`;
  } else if (normTable === "mdoc") {
    const sno = getField("SNO");
    const field = getField("FIELD", "HEAD");
    if (sno && field) key = `${sno}_${field}`;
    else if (sno) key = sno;
    else if (field) key = `${field}_row_${row.rowNumber}`;
  } else if (normTable === "support") {
    const vcn = getField("VOUCHER");
    const sno = getField("SNO");
    if (vcn && sno) key = `${vcn}_${sno}`;
    else if (vcn) key = `${vcn}_row_${row.rowNumber}`;
  }

  // 2. Candidate primary key fields identified dynamically
  if (!key && primaryKeyFields && primaryKeyFields.length > 0) {
    const parts = primaryKeyFields
      .map((f) => getField(f))
      .filter(Boolean);
    if (parts.length === primaryKeyFields.length) {
      key = parts.join(":");
    }
  }

  // 3. Clean human-readable fallback (NEVER a SHA256 hex hash!)
  // Every record in a DBF file has a fixed 1-based rowNumber.
  // Re-syncing the same file produces identical keys without random hex strings.
  if (!key) {
    key = `row:${row.rowNumber}`;
  }

  // Disambiguate identical natural keys within the same DBF file if present
  let finalKey = key;
  if (seenCounts) {
    const current = (seenCounts.get(finalKey) || 0) + 1;
    seenCounts.set(finalKey, current);
    if (current > 1) {
      finalKey = `${finalKey}#${current}`;
    }
  }

  return finalKey;
}

function hashJson(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sanitizeCollectionName(value: string) {
  // Strip trailing year/financial-year/branch/company suffix
  // e.g. .a01, _a01, _I06, _F17, _E10, _I04, _04, etc.
  // so dis.a01 -> "dis", GLEDGER_I06 -> "gledger" -> collection: "vfp_new_folder_gledger"
  let cleaned = value.trim().replace(/\$/g, "");
  cleaned = cleaned.replace(/[\._][a-z]?\d+$/i, "");
  cleaned = cleaned.replace(/[\$_]+$/, "");
  return cleaned.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
}

function decodeText(buffer: Buffer) {
  return buffer.toString(VFP_ENCODING as BufferEncoding);
}

function getSyncDateLabel(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Unknown date";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
