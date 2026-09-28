import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
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
      }
      if (colNames.includes("vfptablemaps")) {
        await db.collection("vfptablemaps").dropIndex("fileName_1").catch(() => {});
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
      const req = eval("require");
      const { spawn } = req("child_process");
      const path = req("path");
      const workerScript = path.join(process.cwd(), "scripts", "vfp-sync", "worker.cjs");
      
      console.log(`[server] Launching VFP background worker automatically: ${workerScript}`);
      const child = spawn("node", [workerScript], {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd(),
      });
      child.unref();
    } catch (workerErr) {
      console.error("[server] Failed to auto-launch VFP background worker:", workerErr);
    }
  }

  return cached.conn;
}

export { dbConnect, dbConnect as connectDB };
export default dbConnect;
