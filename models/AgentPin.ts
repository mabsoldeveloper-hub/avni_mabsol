import mongoose, { Schema, models, model } from "mongoose";

export interface IAgentPin {
  pin: string;              // 6-digit numeric string (e.g. "742918")
  deviceId: string;         // Unique machine hardware hash
  deviceName: string;       // e.g. "Rahul (win32)"
  agentEmail?: string;      // Email of the desktop user (if provided)
  status: "pending" | "activated" | "expired";
  licenseKey?: string;      // License key assigned upon web activation
  licenseExpiresAt?: Date;  // 30-day license expiration date
  companyName?: string;
  companyCode?: string;
  activatedByUserId?: string;
  activatedByEmail?: string;
  expiresAt: Date;          // Auto-expires in 15 minutes
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agentPinSchema = new Schema<IAgentPin>(
  {
    pin: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    deviceName: {
      type: String,
      default: "Desktop Agent",
      trim: true,
    },
    agentEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "activated", "expired"],
      default: "pending",
      index: true,
    },
    licenseKey: {
      type: String,
      trim: true,
    },
    licenseExpiresAt: {
      type: Date,
    },
    companyName: {
      type: String,
      trim: true,
    },
    companyCode: {
      type: String,
      trim: true,
    },
    activatedByUserId: {
      type: String,
      trim: true,
    },
    activatedByEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: documents are automatically deleted when expiresAt passes
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of pending pins for a device
agentPinSchema.index({ deviceId: 1, status: 1 });
agentPinSchema.index({ pin: 1, status: 1 });

const AgentPin = models.AgentPin || model<IAgentPin>("AgentPin", agentPinSchema);
export default AgentPin;
