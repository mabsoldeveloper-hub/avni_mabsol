/**
 * MongoDB Data Migration Script
 * 
 * Safely copies all collections, documents, and indexes between:
 * Local MongoDB Community Edition <---> MongoDB Atlas
 *
 * Usage:
 *   node scripts/migrate-mongo.js "<TARGET_ATLAS_URI>"
 *
 * Example:
 *   node scripts/migrate-mongo.js "mongodb+srv://admin:pass@cluster.mongodb.net/mabsol_manchanda_crm?retryWrites=true&w=majority"
 *
 * Custom Source & Target:
 *   node scripts/migrate-mongo.js "<SOURCE_URI>" "<TARGET_URI>"
 */

const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const DEFAULT_LOCAL_URI = process.env.MONGODB_URI?.includes("127.0.0.1") || process.env.MONGODB_URI?.includes("localhost")
  ? process.env.MONGODB_URI
  : "mongodb://127.0.0.1:27017/mabsol_manchanda_crm";

let sourceUri = process.argv[2];
let targetUri = process.argv[3];

if (!targetUri) {
  // If only 1 argument is provided, assume it is the target (Atlas), and source is local Community Edition
  targetUri = sourceUri;
  sourceUri = DEFAULT_LOCAL_URI;
}

if (!targetUri || targetUri.startsWith("--help") || targetUri === "-h") {
  console.log(`
======================================================================
  MongoDB Live Migration Tool (Community Edition <-> Atlas)
======================================================================

Usage:
  node scripts/migrate-mongo.js "<TARGET_ATLAS_URI>"

Example:
  node scripts/migrate-mongo.js "mongodb+srv://admin:MyPassword@cluster0.abcde.mongodb.net/mabsol_manchanda_crm?retryWrites=true&w=majority"

Or specify both Source and Target:
  node scripts/migrate-mongo.js "<SOURCE_URI>" "<TARGET_URI>"

Current Local Source DB:
  ${DEFAULT_LOCAL_URI}
======================================================================
`);
  process.exit(1);
}

function getDbName(uri) {
  try {
    const clean = uri.split("?")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || "mabsol_manchanda_crm";
  } catch {
    return "mabsol_manchanda_crm";
  }
}

const sourceDbName = getDbName(sourceUri);
const targetDbName = getDbName(targetUri);

const BATCH_SIZE = 2000;

async function migrate() {
  console.log("======================================================================");
  console.log("                Starting MongoDB Migration Tool                       ");
  console.log("======================================================================");
  console.log(`📡 Connecting to Source: ${sourceUri.replace(/:([^@]+)@/, ":****@")}`);
  console.log(`🎯 Connecting to Target: ${targetUri.replace(/:([^@]+)@/, ":****@")}`);
  console.log(`📂 Source DB Name: ${sourceDbName}`);
  console.log(`📂 Target DB Name: ${targetDbName}`);
  console.log("----------------------------------------------------------------------");

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    await sourceClient.connect();
    console.log("✅ Successfully connected to Source Database.");

    await targetClient.connect();
    console.log("✅ Successfully connected to Target Database.\n");

    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);

    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections to transfer.\n`);

    let totalDocsTransferred = 0;
    const summary = [];

    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i].name;
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      const totalCount = await sourceCol.countDocuments();
      if (totalCount === 0) {
        summary.push({ collection: colName, status: "Empty (Skipped)", count: 0 });
        continue;
      }

      console.log(`[${i + 1}/${collections.length}] Transferring '${colName}' (${totalCount.toLocaleString()} documents)...`);

      // 1. Copy Indexes (skip _id_)
      try {
        const indexes = await sourceCol.indexes();
        const customIndexes = indexes.filter(idx => idx.name !== "_id_");
        for (const idx of customIndexes) {
          const { key, name, unique, sparse, expireAfterSeconds } = idx;
          const options = {};
          if (name) options.name = name;
          if (unique) options.unique = unique;
          if (sparse) options.sparse = sparse;
          if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds;
          await targetCol.createIndex(key, options).catch(() => {});
        }
      } catch (err) {
        // Continue if index copying encounters non-critical warnings
      }

      // 2. Stream Data in Batches
      const cursor = sourceCol.find({});
      let batch = [];
      let transferredForCol = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          const ops = batch.map(d => ({
            replaceOne: {
              filter: { _id: d._id },
              replacement: d,
              upsert: true,
            },
          }));
          await targetCol.bulkWrite(ops, { ordered: false });
          transferredForCol += batch.length;
          process.stdout.write(`   ↳ Synced ${transferredForCol.toLocaleString()} / ${totalCount.toLocaleString()}\r`);
          batch = [];
        }
      }

      if (batch.length > 0) {
        const ops = batch.map(d => ({
          replaceOne: {
            filter: { _id: d._id },
            replacement: d,
            upsert: true,
          },
        }));
        await targetCol.bulkWrite(ops, { ordered: false });
        transferredForCol += batch.length;
      }

      process.stdout.write(`   ↳ Finished: ${transferredForCol.toLocaleString()} documents synced successfully.\n`);
      totalDocsTransferred += transferredForCol;
      summary.push({ collection: colName, status: "Success", count: transferredForCol });
    }

    console.log("\n======================================================================");
    console.log("                       Migration Complete!                            ");
    console.log("======================================================================");
    console.log(`Total Collections Processed : ${collections.length}`);
    console.log(`Total Documents Migrated   : ${totalDocsTransferred.toLocaleString()}`);
    console.log("======================================================================\n");
    console.log("👉 Next Step: Update your .env file MONGODB_URI with the new Atlas URI:");
    console.log(`   MONGODB_URI="${targetUri}"\n`);

  } catch (error) {
    console.error("\n❌ Migration failed with error:", error.message);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
