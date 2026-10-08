import mongoose from "mongoose";

const VfpTableMapSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    filePath: {
      type: String,
      required: true,
    },
    targetCollection: {
      type: String,
      required: true,
    },
    primaryKeyFields: {
      type: [String],
      default: [],
    },
    columns: {
      type: [
        {
          name: String,
          type: { type: String },
          length: Number,
          decimalCount: Number,
        },
      ],
      default: [],
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    lastFileMtimeMs: Number,
    lastDiscoveredAt: Date,
    enabled: {
      type: Boolean,
      default: true,
    },
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

VfpTableMapSchema.index({ fileName: 1, email: 1, companyCode: 1 });

if (mongoose.models.VfpTableMap) {
  delete mongoose.models.VfpTableMap;
}
export default mongoose.model("VfpTableMap", VfpTableMapSchema, "vfptablemaps");
