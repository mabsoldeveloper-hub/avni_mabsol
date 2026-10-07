import mongoose from "mongoose";

const VfpSyncStateSchema = new mongoose.Schema(
  {
    tableName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    fileName: String,
    filePath: String,
    targetCollection: String,
    syncDirection: {
      type: String,
      enum: ["dbf_to_crm", "crm_to_dbf", "two_way"],
      default: "two_way",
    },
    status: {
      type: String,
      enum: ["idle", "running", "success", "failed", "locked", "skipped"],
      default: "idle",
    },
    lastStartedAt: Date,
    lastSyncedAt: Date,
    lastSyncedDate: String,
    lastFileMtimeMs: Number,
    lastRecordCount: {
      type: Number,
      default: 0,
    },
    lastImportedCount: {
      type: Number,
      default: 0,
    },
    lastSkippedCount: {
      type: Number,
      default: 0,
    },
    lastHash: String,
    lastError: String,
    companyCode: {
      type: String,
      default: "",
    },
    companyId: {
      type: String,
      default: "",
    },
    companyName: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

VfpSyncStateSchema.index({ tableName: 1, email: 1, companyCode: 1 });

if (mongoose.models.VfpSyncState) {
  delete mongoose.models.VfpSyncState;
}
export default mongoose.model("VfpSyncState", VfpSyncStateSchema, "vfpsyncstates");
