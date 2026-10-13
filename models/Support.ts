import mongoose, { Schema, Document } from "mongoose";

export interface ISupport extends Document {
  ALIASE?: string | null;
  HEADING?: string | null;
  LCODE?: string | null;
  PCODE?: number | null;
  REMARK?: string | null;
  SNO?: number | null;
  TYPE?: string | null;
  VALUE?: number | null;
  VOUCHER?: number | null;

  _vfpTable?: string;
  _vfpSourceKey?: string;
  _vfpDeleted?: boolean;
  _vfpFileMtimeMs?: number;
  _vfpFileName?: string;
  _vfpRowNumber?: number;
  _vfpSyncRunId?: string;
  _vfpSyncedAt?: Date;
}

const SupportSchema = new Schema<ISupport>(
  {
    ALIASE: { type: String, default: null },
    HEADING: { type: String, default: null },
    LCODE: { type: String, default: null, index: true },
    PCODE: { type: Number, default: null },
    REMARK: { type: String, default: null },
    SNO: { type: Number, default: null, index: true },
    TYPE: { type: String, default: null },
    VALUE: { type: Number, default: null },
    VOUCHER: { type: Number, default: null },
    _vfpTable: { type: String, default: "vfp_new_folder_support", index: true },
    _vfpSourceKey: { type: String, default: null },
    _vfpDeleted: { type: Boolean, default: false },
    _vfpFileMtimeMs: { type: Number, default: null },
    _vfpFileName: { type: String, default: "vfp_new_folder_support" },
    _vfpRowNumber: { type: Number, default: null },
    _vfpSyncRunId: { type: String, default: null },
    _vfpSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SupportSchema.index({ LCODE: 1, SNO: 1 });

export default mongoose.models.Support ||
  mongoose.model<ISupport>("Support", SupportSchema, "vfp_new_folder_support");
