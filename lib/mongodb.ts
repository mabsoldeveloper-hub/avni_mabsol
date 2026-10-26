import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// Normalize deprecated `new: true` option to `returnDocument: 'after'` in Mongoose 8/9
const proto = mongoose.Query.prototype as any;
if (!proto.__mabsolNormalizedOptions) {
  proto.__mabsolNormalizedOptions = true;

  const normalizeOptions = (opts: any) => {
    if (opts && typeof opts === "object" && "new" in opts) {
      if (opts.new) {
        opts.returnDocument = "after";
      }
      delete opts.new;
    }
  };

  const origFindOneAndUpdate = proto.findOneAndUpdate;
  proto.findOneAndUpdate = function (this: any, ...args: any[]) {
    if (args.length >= 3 && args[2]) normalizeOptions(args[2]);
    return origFindOneAndUpdate.apply(this, args);
  };

  const origFindOneAndReplace = proto.findOneAndReplace;
  proto.findOneAndReplace = function (this: any, ...args: any[]) {
    if (args.length >= 3 && args[2]) normalizeOptions(args[2]);
    return origFindOneAndReplace.apply(this, args);
  };

  const origSetOptions = proto.setOptions;
  proto.setOptions = function (this: any, options: any, overwrite: boolean) {
    normalizeOptions(options);
    return origSetOptions.call(this, options, overwrite);
  };
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalForMongoose.mongoose ||
  (globalForMongoose.mongoose = {
    conn: null,
    promise: null,
  });

let legacyIndexesCleaned = false;

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { maxPoolSize: 10 }).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;

  // Drop legacy indexes once to avoid duplicate key errors during multi-user transition
  if (!legacyIndexesCleaned) {
    legacyIndexesCleaned = true;
    try {
      const db = cached.conn.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      const colNames = collections.map(c => c.name);
      
      if (colNames.includes("users")) {
        await db.collection("users").dropIndex("mrCustomerId_1").catch(() => {});
      }
      if (colNames.includes("roles")) {
        await db.collection("roles").dropIndex("roleName_1").catch(() => {});
      }
      if (colNames.includes("vfpsyncstates")) {
        await db.collection("vfpsyncstates").dropIndex("tableName_1").catch(() => {});
        await db.collection("vfpsyncstates").dropIndex("tableName_1_email_1").catch(() => {});
      }
      if (colNames.includes("vfptablemaps")) {
        await db.collection("vfptablemaps").dropIndex("fileName_1").catch(() => {});
        await db.collection("vfptablemaps").dropIndex("fileName_1_email_1").catch(() => {});
      }
      if (colNames.includes("vfpfileassets")) {
        await db.collection("vfpfileassets").dropIndex("relativePath_1").catch(() => {});
      }
      if (colNames.includes("vfp_new_folder_gledger")) {
        await db.collection("vfp_new_folder_gledger").dropIndex("_vfpTable_1__vfpSourceKey_1").catch(() => {});
      }
      if (colNames.includes("gledger")) {
        await db.collection("gledger").dropIndex("_vfpTable_1__vfpSourceKey_1").catch(() => {});
      }
      if (colNames.includes("vfp_new_folder_salesmdis")) {
        await db.collection("vfp_new_folder_salesmdis").dropIndex("_vfpTable_1__vfpSourceKey_1").catch(() => {});
      }
      if (colNames.includes("vfp_new_folder_salesdis")) {
        await db.collection("vfp_new_folder_salesdis").dropIndex("_vfpTable_1__vfpSourceKey_1").catch(() => {});
      }
      if (colNames.includes("vfp_new_folder_pendings")) {
        await db.collection("vfp_new_folder_pendings").dropIndex("_vfpTable_1__vfpSourceKey_1").catch(() => {});
      }
    }
  } catch (e) {
    console.error("Failed to drop legacy unique indexes:", e);
  }

  // Start VFP Sync Background Worker automatically in the background
  const globalForWorker = globalThis as typeof globalThis & {
    vfpWorkerStarted?: boolean;
  };
  if (!globalForWorker.vfpWorkerStarted) {
    globalForWorker.vfpWorkerStarted = true;
    try {
      const nodeRequire = eval("require");
      const { spawn } = nodeRequire("child_process");
      const path = nodeRequire("path");
      const fs = nodeRequire("fs");
      const workerScript = path.join(process.cwd(), "scripts", "mabsolcrm-sync", "worker.cjs");
      
      if (fs.existsSync(workerScript)) {
        const child = spawn("node", [workerScript], {
          detached: true,
          stdio: "ignore",
          cwd: process.cwd(),
        });
        child.unref();
      }
    } catch (workerErr) {
      console.error("[server] Failed to auto-launch VFP background worker:", workerErr);
    }
  }

  // Ensure high-performance indexes for VFP tables in background
  const globalForIndexes = globalThis as typeof globalThis & {
    vfpIndexesEnsured?: boolean;
  };
  if (!globalForIndexes.vfpIndexesEnsured) {
    globalForIndexes.vfpIndexesEnsured = true;
    (async () => {
      try {
        const db = cached.conn?.connection?.db;
        if (db) {
          await Promise.all([
            db.collection("vfp_new_folder_mdis").createIndex({ DATE: 1, COMPANY: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_mdis").createIndex({ TYPE: 1, DATE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_mdis").createIndex({ CODEP: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_gledger").createIndex({ DATE: 1, COMPANY: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_gledger").createIndex({ BOOK: 1, CD: 1, DATE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_gledger").createIndex({ CODE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_dis").createIndex({ DATE: 1, COMPANY: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_dis").createIndex({ CODE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_pend").createIndex({ DDATE: 1, COMPANY: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_pend").createIndex({ ACGROUP: 1, INVTYPE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_pend").createIndex({ ORD: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_order").createIndex({ ORDNO: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_order").createIndex({ SALDR: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_pro").createIndex({ CODE: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_pro").createIndex({ COMPANY: 1 }, { background: true }).catch(() => {}),
            db.collection("vfp_new_folder_probat").createIndex({ EXP: 1, BALANCE: 1 }, { background: true }).catch(() => {}),
          ]);
        }
      } catch {}
    })();
    }
  }

  return cached.conn;
}

export { dbConnect, dbConnect as connectDB };
export default dbConnect;
