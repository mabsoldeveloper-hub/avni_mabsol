import mongoose from "mongoose";

const VfpConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "vfp_sync_config",
    },
    email: {
      type: String,
      required: false,
    },
    dataDir: {
      type: String,
      required: false,
    },
    sourceDir: {
      type: String,
      required: false,
    },
    consoleSyncDir: {
      type: String,
      required: false,
      default: "",
    },
    enabledFiles: {
      type: [String],
      required: false,
      default: [],
    },
    autoSync: {
      type: Boolean,
      required: false,
      default: false,
    },
    autoSyncInterval: {
      type: Number,
      required: false,
      default: 10,
    },
    useVfpEngine: {
      type: Boolean,
      required: false,
      default: false,
    },
    vfpExePath: {
      type: String,
      required: false,
      default: "",
    },
    prgPath: {
      type: String,
      required: false,
      default: "",
    },
    userName: {
      type: String,
      required: false,
      default: "",
    },
    companyName: {
      type: String,
      required: false,
      default: "",
    },
    license: {
      type: String,
      required: false,
      default: "",
    },
    licenseExpiresAt: {
      type: Date,
      required: false,
    },
    licenseIssuedAt: {
      type: Date,
      required: false,
    },
    licenseStatus: {
      type: String,
      required: false,
      default: "active",
    },
    boundDeviceId: {
      type: String,
      required: false,
      default: "",
    },
    boundDeviceName: {
      type: String,
      required: false,
      default: "",
    },
    boundAt: {
      type: Date,
      required: false,
    },
    usedLicenses: {
      type: [
        {
          key: { type: String, required: true },
          issuedAt: { type: Date },
          expiredAt: { type: Date },
          boundDeviceId: { type: String, default: "" },
          status: { type: String, default: "retired" },
        },
      ],
      required: false,
      default: [],
    },
    startupCommand: {
      type: String,
      required: false,
      default: "",
    },
    autoVfpExtract: {
      type: Boolean,
      required: false,
      default: false,
    },
    autoVfpExtractInterval: {
      type: Number,
      required: false,
      default: 10,
    },
    lastVfpExtractedAt: {
      type: Date,
      required: false,
    },
    uploadedSourceFilesCount: {
      type: Number,
      required: false,
      default: 0,
    },
    lastSourceUploadedAt: {
      type: Date,
      required: false,
    },
    lastUploadedByUserId: {
      type: String,
      required: false,
    },
    lastUploadedByUserName: {
      type: String,
      required: false,
    },
    lastUploadedByUserEmail: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.VfpConfig) {
  delete mongoose.models.VfpConfig;
}
export default mongoose.model("VfpConfig", VfpConfigSchema, "vfpconfigs");
