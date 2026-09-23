// import mongoose, { Schema, Document } from "mongoose";

// export interface IRole extends Document {
//   tenantId: mongoose.Types.ObjectId;
//   roleName: string;
//   permissions: string[];
//   status: string;
// }

// const RoleSchema = new Schema(
//   {
//     tenantId: {
//       type: Schema.Types.ObjectId,
//       ref: "Tenant",
//       required: true,
//     },

//     roleName: {
//       type: String,
//       required: true,
//     },

//     permissions: {
//       type: [String],
//       default: [],
//     },

//     status: {
//       type: String,
//       default: "Active",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export default mongoose.models.Role ||
//   mongoose.model<IRole>("Role", RoleSchema);

import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IRole extends Document {
  tenantId: string;
  roleName: string;
  description: string;
  dashboardType: "salesman" | "manager" | "admin" | "customer" | "custom";
  permissions: string[];
  assignedAreaIds?: string[];
  assignedAreaNames?: string[];
  colorTag?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },

    roleName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    dashboardType: {
      type: String,
      enum: ["salesman", "manager", "admin", "customer", "custom"],
      default: "salesman",
    },

    permissions: {
      type: [String],
      default: [],
    },

    assignedAreaIds: {
      type: [String],
      default: [],
    },

    assignedAreaNames: {
      type: [String],
      default: [],
    },

    colorTag: {
      type: String,
      default: "indigo",
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Role ||
  mongoose.model<IRole>("Role", RoleSchema);


