import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },

    roleName: {
      type: String,
      default: "",
    },

    roleType: {
      type: String,
      default: "MR",
    },

    role: {
      type: String,
      default: "",
    },

    isSuperAdmin: {
      type: Boolean,
      default: false,
    },

    // Original Customer record for MR / Field Staff mapping
    mrCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },

    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      default: "Active",
    },

    // Super Admin Approval & Time-Bound Access
    isApproved: {
      type: Boolean,
      default: false,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    accessDurationDays: {
      type: Number,
      default: 30,
    },

    accessValidUntil: {
      type: Date,
      default: null,
    },

    isUnlimitedAccess: {
      type: Boolean,
      default: false,
    },

    approvalNotes: {
      type: String,
      default: "",
    },

    // Session Timeout / Login Validity Duration (in Hours: 1hr, 2hr, 4hr, 8hr, etc.)
    sessionTimeoutHours: {
      type: Number,
      default: 1,
    },

    // Profile Fields
    mobile: {
      type: String,
      default: "",
      trim: true,
    },

    gstNo: {
      type: String,
      default: "",
      trim: true,
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    designation: {
      type: String,
      default: "",
    },

    dob: {
      type: Date,
    },

    employeeCode: {
      type: String,
      default: "",
    },

    joiningDate: {
      type: Date,
    },

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

    country: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
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

// Delete cached model in Next.js hot-reload environment so updated schema is always used
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}

export default mongoose.models.User || mongoose.model("User", UserSchema);
