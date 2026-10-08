import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerAlertConfig extends Document {
  tenantId: string;
  enabled: boolean;
  daysRemainingThreshold: number; // e.g. 3 (Alert when remaining days <= 3)
  billCountThreshold: number; // e.g. 5 (Alert when pending bills >= 5)
  creditLimitPercentage: number; // e.g. 100 (Alert when balance >= 100% of credit limit)
  autoDispatchEmail: boolean;
  autoDispatchWhatsApp: boolean;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  schedulerEnabled: boolean;
  scheduleFrequency: "daily" | "hourly" | "every_6_hours" | "every_15_mins";
  scheduledTime?: string;
  cooldownHours: number;
  adminNotificationEmail?: string; // Admin / Manager email to receive alert copy / summary
  lastScanAt?: Date;
  lastScanResults?: {
    scannedCount: number;
    alertsTriggered: number;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CustomerAlertConfigSchema = new Schema<ICustomerAlertConfig>(
  {
    tenantId: { type: String, default: "TENANT001", unique: true },
    enabled: { type: Boolean, default: true },
    daysRemainingThreshold: { type: Number, default: 3 },
    billCountThreshold: { type: Number, default: 5 },
    creditLimitPercentage: { type: Number, default: 100 },
    autoDispatchEmail: { type: Boolean, default: true },
    autoDispatchWhatsApp: { type: Boolean, default: false },
    metaPhoneNumberId: { type: String, default: "" },
    metaAccessToken: { type: String, default: "" },
    schedulerEnabled: { type: Boolean, default: true },
    scheduleFrequency: {
      type: String,
      default: "every_15_mins",
    },
    scheduledTime: { type: String, default: "09:00" },
    cooldownHours: { type: Number, default: 24 },
    adminNotificationEmail: { type: String, default: "" },
    lastScanAt: { type: Date },
    lastScanResults: {
      scannedCount: { type: Number, default: 0 },
      alertsTriggered: { type: Number, default: 0 },
      timestamp: { type: Date },
    },
  },
  { timestamps: true, strict: false }
);

if (mongoose.models && mongoose.models.CustomerAlertConfig) {
  delete (mongoose.models as any).CustomerAlertConfig;
}

export default mongoose.model<ICustomerAlertConfig>(
  "CustomerAlertConfig",
  CustomerAlertConfigSchema
);
