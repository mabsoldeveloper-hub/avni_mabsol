import mongoose from "mongoose";

const VfpSyncLogSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
    },
    tableName: String,
    fileName: String,
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "success", "failed", "locked", "skipped", "cancelled"],
      required: true,
    },
    message: String,
    importedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    error: String,
    startedAt: Date,
    finishedAt: Date,
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

if (mongoose.models.VfpSyncLog) {
  delete mongoose.models.VfpSyncLog;
}
export default mongoose.model("VfpSyncLog", VfpSyncLogSchema, "vfpsynclogs");
