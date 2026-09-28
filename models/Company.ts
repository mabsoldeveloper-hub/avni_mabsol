import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
    },

    companyCode: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    gstNo: {
      type: String,
      default: "",
    },

    panNo: {
      type: String,
      default: "",
    },

    drugLicenseNo: {
      type: String,
      default: "",
    },

    businessType: {
      type: String,
      default: "pcd_marketing",
    },

    additionalGstins: [
      {
        branchName: { type: String, default: "" },
        gstNo: { type: String, trim: true },
        state: { type: String, default: "" },
        stateCode: { type: String, default: "" },
        verified: { type: Boolean, default: false },
        address: { type: String, default: "" },
        city: { type: String, default: "" },
        pincode: { type: String, default: "" },
        email: { type: String, default: "" },
        mobile: { type: String, default: "" },
      },
    ],

    enabledModules: [
      {
        type: String,
      },
    ],

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    invoicePrefix: {
      type: String,
      default: null,
    },

    purchasePrefix: {
      type: String,
      default: null,
    },

    currency: {
      type: String,
      default: null,
    },

    logo: {
      type: String,
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isHeadOffice: {
      type: Boolean,
      default: false,
    },

    parentCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    status: {
      type: String,
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Invalidate model cache on hot-reload
if (mongoose.models.Company) {
  delete (mongoose.models as any).Company;
}

export default mongoose.models.Company ||
  mongoose.model("Company", CompanySchema);