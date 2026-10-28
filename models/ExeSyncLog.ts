import mongoose from "mongoose";

const ExeSyncLogSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    companyName: {
      type: String,
      default: "",
    },
    companyCode: {
      type: String,
      default: "",
    },
    isHeadOffice: {
      type: Boolean,
      default: true,
    },
    parentCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    parentCompanyName: {
      type: String,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    licenseKey: {
      type: String,
      default: "",
      index: true,
    },
    deviceId: {
      type: String,
      default: "",
    },
    deviceName: {
      type: String,
      default: "",
    },
    syncType: {
      type: String,
      enum: ["desktop_agent_auto", "desktop_agent_manual", "portal_triggered", "cloud_worker"],
      default: "desktop_agent_auto",
    },
    status: {
      type: String,
      enum: ["success", "failed", "rejected_suspended", "partial", "running"],
      default: "success",
      index: true,
    },
    tablesSynced: [{ type: String }],
    totalRecords: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    error: {
      type: String,
      default: "",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.ExeSyncLog) {
  delete (mongoose.models as any).ExeSyncLog;
}

export default mongoose.models.ExeSyncLog ||
  mongoose.model("ExeSyncLog", ExeSyncLogSchema, "exesynclogs");
