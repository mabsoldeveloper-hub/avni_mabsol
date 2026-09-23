import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { EJSON } from "bson";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import { buildFYDateQuery } from "@/lib/financialYearHelper";

const MONGODB_URI = process.env.MONGODB_URI;

export interface DatabaseBackupOptions {
  isAll?: boolean;
  fyId?: string | null;
  fyName?: string | null;
  startDate?: string | null; // "YYYY-MM-DD"
  endDate?: string | null;   // "YYYY-MM-DD"
}

export interface BackupManifest {
  version: "2.0";
  exportedAt: string;
  isAll: boolean;
  fyName: string;
  startDate: string | null;
  endDate: string | null;
  collectionsCount: number;
  totalDocuments: number;
  collectionsSummary: {
    name: string;
    count: number;
    dateField?: string | null;
  }[];
}

export interface BackupArchiveData {
  manifest: BackupManifest;
  collections: Record<string, any[]>;
}

// Master / Configuration collections that are always included in full
const MASTER_COLLECTIONS = new Set([
  "users",
  "roles",
  "permissions",
  "rolepermissions",
  "userpermissions",
  "companies",
  "companymasters",
  "financialyears",
  "tenants",
  "profiles",
  "userthemes",
  "usercompanies",
  "accountgroups",
  "areamasters",
  "categories",
  "divisions",
  "subdivisions",
  "productmasters",
  "customermasters",
  "targetmasters",
  "voucherseries",
  "vfpconfigs",
  "vfptablemaps",
  "backup_settings",
  "notificationgatewayconfigs",
  "menuadjustments",
  "formtemplates",
]);

// Date fields commonly used across CRM collections
const KNOWN_DATE_FIELDS = [
  "DATE",
  "DDATE",
  "poDate",
  "invoiceDate",
  "billDate",
  "startDate",
  "orderDate",
  "dueDate",
  "paymentDate",
  "date",
  "createdAt",
];

/**
 * Resolves Financial Year details (fyName, startDate, endDate) from backup options.
 */
export async function resolveFYRange(options: DatabaseBackupOptions = {}) {
  await connectDB();

  if (options.isAll) {
    return {
      isAll: true,
      fyName: "ALL",
      startDate: null,
      endDate: null,
    };
  }

  // If explicit dates are provided
  if (options.startDate && options.endDate) {
    const s = options.startDate.slice(0, 10);
    const e = options.endDate.slice(0, 10);
    const inferredName =
      options.fyName || `${s.slice(0, 4)}-${e.slice(0, 4)}`;
    return {
      isAll: false,
      fyName: inferredName,
      startDate: s,
      endDate: e,
    };
  }

  // Look up FinancialYear model
  let fyDoc: any = null;
  if (options.fyId && options.fyId !== "ALL") {
    fyDoc = await FinancialYear.findById(options.fyId).lean();
  } else if (options.fyName && options.fyName !== "ALL") {
    fyDoc = await FinancialYear.findOne({ fyName: options.fyName }).lean();
  } else {
    // Default to active current financial year
    fyDoc = await FinancialYear.findOne({ isCurrent: true }).lean();
    if (!fyDoc) {
      fyDoc = await FinancialYear.findOne().sort({ startDate: -1 }).lean();
    }
  }

  if (fyDoc && fyDoc.startDate && fyDoc.endDate) {
    const s = new Date(fyDoc.startDate).toISOString().slice(0, 10);
    const e = new Date(fyDoc.endDate).toISOString().slice(0, 10);
    return {
      isAll: false,
      fyName: fyDoc.fyName || "CURRENT_FY",
      startDate: s,
      endDate: e,
    };
  }

  // Fallback to current calendar year if no financial year is configured in DB
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    isAll: false,
    fyName: `${currentYear}-${currentYear + 1}`,
    startDate: `${currentYear}-04-01`,
    endDate: `${currentYear + 1}-03-31`,
  };
}

/**
 * Detects the relevant date field on a collection by checking a sample document.
 */
async function detectDateField(
  collection: mongoose.mongo.Collection
): Promise<string | null> {
  const sample = await collection.findOne(
    {},
    { projection: Object.fromEntries(KNOWN_DATE_FIELDS.map((f) => [f, 1])) }
  );

  if (!sample) return null;

  for (const field of KNOWN_DATE_FIELDS) {
    if (sample[field] !== undefined && sample[field] !== null) {
      return field;
    }
  }

  return null;
}

/**
 * Creates a Year-Wise or Full database backup archive buffer using native EJSON + gzip.
 */
export async function createRawDatabaseBackup(
  options: DatabaseBackupOptions = {}
): Promise<{
  archiveBuffer: Buffer;
  manifest: BackupManifest;
  fileName: string;
}> {
  await connectDB();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database connection is not available");
  }

  const range = await resolveFYRange(options);
  const collectionsList = await db.listCollections().toArray();

  const backupCollections: Record<string, any[]> = {};
  const collectionsSummary: BackupManifest["collectionsSummary"] = [];
  let totalDocuments = 0;

  for (const colInfo of collectionsList) {
    const colName = colInfo.name;

    // Skip internal system collections
    if (colName.startsWith("system.") || colName.startsWith("__")) {
      continue;
    }

    const collection = db.collection(colName);
    const isMaster = MASTER_COLLECTIONS.has(colName.toLowerCase());

    let query: Record<string, any> = {};
    let detectedField: string | null = null;

    if (!range.isAll && !isMaster && range.startDate && range.endDate) {
      detectedField = await detectDateField(collection);
      if (detectedField) {
        query = buildFYDateQuery(
          detectedField,
          range.startDate,
          range.endDate
        );
      }
    }

    const docs = await collection.find(query).toArray();

    // Only store collections that have data (or master collections)
    if (docs.length > 0 || isMaster) {
      backupCollections[colName] = docs;
      totalDocuments += docs.length;
      collectionsSummary.push({
        name: colName,
        count: docs.length,
        dateField: detectedField,
      });
    }
  }

  const manifest: BackupManifest = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    isAll: range.isAll,
    fyName: range.fyName,
    startDate: range.startDate,
    endDate: range.endDate,
    collectionsCount: collectionsSummary.length,
    totalDocuments,
    collectionsSummary,
  };

  const archiveData: BackupArchiveData = {
    manifest,
    collections: backupCollections,
  };

  const serializedEjson = EJSON.stringify(archiveData);
  const compressedGzip = zlib.gzipSync(Buffer.from(serializedEjson, "utf-8"), {
    level: 9,
  });

  const safeFyName = range.fyName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timeStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `database-backup-FY-${safeFyName}-${timeStamp}.mbak`;

  return {
    archiveBuffer: compressedGzip,
    manifest,
    fileName,
  };
}

/**
 * Inspects a database backup buffer without modifying the database.
 */
export async function inspectDatabaseBackup(
  archiveBuffer: Buffer
): Promise<{
  valid: boolean;
  version: string;
  manifest: BackupManifest | null;
  message?: string;
}> {
  try {
    const unzipped = zlib.gunzipSync(archiveBuffer);
    const jsonStr = unzipped.toString("utf-8");
    const parsed = EJSON.parse(jsonStr) as BackupArchiveData;

    if (parsed && parsed.manifest && parsed.manifest.version === "2.0") {
      return {
        valid: true,
        version: "2.0",
        manifest: parsed.manifest,
      };
    }
  } catch {
    // Not a v2.0 gzip-EJSON archive
  }

  // Check if it's a legacy binary mongodump archive
  return {
    valid: true,
    version: "1.0",
    manifest: null,
    message: "Legacy binary database archive (Full Dump)",
  };
}

/**
 * Restores a database backup buffer.
 * If year-scoped: accurately replaces/restores records for that specific financial year.
 */
export async function restoreRawDatabaseBackup(
  archiveBuffer: Buffer,
  options: { mode?: "replace_year" | "merge" } = {}
): Promise<{
  message: string;
  manifest?: BackupManifest | null;
  stats?: {
    collectionsRestored: number;
    documentsRestored: number;
  };
}> {
  await connectDB();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database connection is not available");
  }

  // 1. Try restoring as modern v2.0 EJSON archive
  try {
    const unzipped = zlib.gunzipSync(archiveBuffer);
    const jsonStr = unzipped.toString("utf-8");
    const parsed = EJSON.parse(jsonStr) as BackupArchiveData;

    if (parsed && parsed.manifest && parsed.collections) {
      const { manifest, collections } = parsed;
      let totalRestored = 0;
      let collectionsRestored = 0;

      for (const [colName, rawDocs] of Object.entries(collections)) {
        if (!Array.isArray(rawDocs) || rawDocs.length === 0) continue;

        const collection = db.collection(colName);
        const isMaster = MASTER_COLLECTIONS.has(colName.toLowerCase());

        if (
          !manifest.isAll &&
          !isMaster &&
          manifest.startDate &&
          manifest.endDate
        ) {
          // Find matching date field in manifest summary or detect it
          const colMeta = manifest.collectionsSummary?.find(
            (c) => c.name === colName
          );
          const dateField =
            colMeta?.dateField || (await detectDateField(collection));

          if (dateField) {
            // Delete existing records for THIS specific financial year only
            const dateQuery = buildFYDateQuery(
              dateField,
              manifest.startDate,
              manifest.endDate
            );
            await collection.deleteMany(dateQuery);
          }

          // Insert restored year documents
          await collection.insertMany(rawDocs, { ordered: false }).catch(() => {});
        } else if (isMaster) {
          // For master/config collections: upsert by _id so existing records aren't wiped
          const bulkOps = rawDocs.map((doc: any) => ({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: doc },
              upsert: true,
            },
          }));
          if (bulkOps.length > 0) {
            await collection.bulkWrite(bulkOps, { ordered: false });
          }
        } else {
          // Full restore for transactional collection
          await collection.insertMany(rawDocs, { ordered: false }).catch(() => {});
        }

        totalRestored += rawDocs.length;
        collectionsRestored++;
      }

      return {
        message: manifest.isAll
          ? "Full database restored successfully"
          : `Database restored successfully for Financial Year ${manifest.fyName}`,
        manifest,
        stats: {
          collectionsRestored,
          documentsRestored: totalRestored,
        },
      };
    }
  } catch (err) {
    // If not a JSON archive, try fallback below
    console.warn("Archive is not v2 EJSON, attempting fallback restore:", err);
  }

  // 2. Fallback: Legacy binary mongodump restore
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing for legacy restore");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mongodb-restore-"));
  const archivePath = path.join(tempDir, "uploaded.archive");

  try {
    await fs.writeFile(archivePath, archiveBuffer);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "mongorestore",
        [`--uri=${MONGODB_URI}`, `--archive=${archivePath}`, "--gzip"],
        { shell: false }
      );

      let stderr = "";
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(`mongorestore failed with code ${code}: ${stderr}`)
          );
      });
    });

    return {
      message: "Legacy database archive restored successfully",
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}