import mongoose, { Schema, models, model } from "mongoose";

const SalesHierarchySchema = new Schema(
  {
    // The executive (User)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeCode: {
      type: String,
      default: "",
      trim: true,
    },

    // Hierarchy Role Level
    roleLevel: {
      type: String,
      required: true,
      trim: true,
    },

    // Geographic Jurisdiction
    state: {
      type: String,
      default: "",
      trim: true,
    },
    zone: {
      type: String,
      default: "",
      trim: true,
    },
    region: {
      type: String,
      default: "",
      trim: true,
    },
    territory: {
      type: String,
      default: "",
      trim: true,
    },

    // Reporting Chain (Parent Executive in the hierarchy)
    reportsTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reportsToName: {
      type: String,
      default: "",
      trim: true,
    },

    // Assigned Business Scope
    assignedCompanyCodes: {
      type: [String],
      default: [],
    },
    assignedDivisionCodes: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate hierarchy assignment for the same user and role level
SalesHierarchySchema.index(
  {
    userId: 1,
    roleLevel: 1,
  },
  {
    unique: true,
  }
);

// Index for fast hierarchy parent lookup
SalesHierarchySchema.index({ reportsTo: 1, status: 1 });

export default models.SalesHierarchy || model("SalesHierarchy", SalesHierarchySchema);
