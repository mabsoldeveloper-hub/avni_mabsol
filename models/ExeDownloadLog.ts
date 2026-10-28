import mongoose from "mongoose";

const ExeDownloadLogSchema = new mongoose.Schema(
  {
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
      default: "Anonymous / Guest",
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    userRole: {
      type: String,
      default: "User",
    },
    downloadFormat: {
      type: String,
      enum: ["setup", "portable", "zip"],
      default: "portable",
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    os: {
      type: String,
      default: "Windows",
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.ExeDownloadLog) {
  delete (mongoose.models as any).ExeDownloadLog;
}

export default mongoose.models.ExeDownloadLog ||
  mongoose.model("ExeDownloadLog", ExeDownloadLogSchema, "exedownloadlogs");
