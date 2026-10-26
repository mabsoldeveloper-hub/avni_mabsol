import mongoose from "mongoose";

export interface IFinancialYearItem {
  exten: number;
  companyDataCode: string; // e.g. "B01", "B02"
  startDate?: string;
  endDate?: string;
  fyName?: string; // e.g. "2025-2026"
  device?: string; // e.g. "data"
}

export interface ICompanyCatalog {
  tenantId?: string;
  ccode: string; // "A", "B", "C"
  gstNo: string; // 15-char GSTIN
  companyName: string;
  shortCode?: string; // Branch Code / Short Code e.g. "MABNEW", "CHEMIST"
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  jurisdiction?: string;
  drugLicNo?: string;
  financialYears: IFinancialYearItem[];
  activeCompanyDataCode: string;
  totalFinancialYears: number;
  sourceFiles?: string[];
  lastSyncedAt: Date;
}

const FinancialYearItemSchema = new mongoose.Schema(
  {
    exten: { type: Number, required: true },
    companyDataCode: { type: String, required: true, trim: true, uppercase: true },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    fyName: { type: String, default: "" },
    device: { type: String, default: "data" },
  },
  { _id: false }
);

const CompanyCatalogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
      index: true,
    },
    ccode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    gstNo: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    shortCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    jurisdiction: {
      type: String,
      default: "",
      trim: true,
    },
    drugLicNo: {
      type: String,
      default: "",
      trim: true,
    },
    financialYears: {
      type: [FinancialYearItemSchema],
      default: [],
    },
    activeCompanyDataCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    totalFinancialYears: {
      type: Number,
      default: 0,
    },
    sourceFiles: {
      type: [String],
      default: [],
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup and single document deduplication
CompanyCatalogSchema.index({ gstNo: 1, ccode: 1 });

if (mongoose.models && mongoose.models.CompanyCatalog) {
  delete (mongoose.models as any).CompanyCatalog;
}

export default mongoose.model<ICompanyCatalog>("CompanyCatalog", CompanyCatalogSchema);
