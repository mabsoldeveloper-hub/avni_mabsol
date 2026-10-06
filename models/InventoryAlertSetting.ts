import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryAlertSetting extends Document {
  tenantId: string;
  companyId: string;
  enabled: boolean;
  recipients: string[];
  nearExpiry: { enabled: boolean; windowDays: number; minStock: number };
  deadStock: { enabled: boolean; noMovementDays: number; minStock: number };
  movement: { enabled: boolean; analysisDays: number; fastStockCoverDays: number; slowStockCoverDays: number; minSalesQty: number };
  email: { enabled: boolean; frequency: "daily" | "weekly" | "monthly"; sendHour: number; sendMinute: number; weeklyDay: number; monthlyDay: number; includeNearExpiry: boolean; includeDeadStock: boolean; includeFastMoving: boolean; includeSlowMoving: boolean };
  lastRunAt?: Date | null;
  lastSentAt?: Date | null;
  updatedBy?: string;
}

const SchemaDef = new Schema<IInventoryAlertSetting>({
  tenantId: { type: String, required: true, default: "TENANT001", index: true },
  companyId: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  recipients: { type: [String], default: [] },
  nearExpiry: { enabled: { type: Boolean, default: true }, windowDays: { type: Number, default: 90 }, minStock: { type: Number, default: 1 } },
  deadStock: { enabled: { type: Boolean, default: true }, noMovementDays: { type: Number, default: 180 }, minStock: { type: Number, default: 1 } },
  movement: { enabled: { type: Boolean, default: true }, analysisDays: { type: Number, default: 30 }, fastStockCoverDays: { type: Number, default: 15 }, slowStockCoverDays: { type: Number, default: 60 }, minSalesQty: { type: Number, default: 1 } },
  email: { enabled: { type: Boolean, default: true }, frequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "daily" }, sendHour: { type: Number, default: 9 }, sendMinute: { type: Number, default: 0 }, weeklyDay: { type: Number, default: 1 }, monthlyDay: { type: Number, default: 1 }, includeNearExpiry: { type: Boolean, default: true }, includeDeadStock: { type: Boolean, default: true }, includeFastMoving: { type: Boolean, default: true }, includeSlowMoving: { type: Boolean, default: true } },
  lastRunAt: { type: Date, default: null },
  lastSentAt: { type: Date, default: null },
  updatedBy: { type: String, default: "" },
}, { timestamps: true, collection: "inventory_alert_settings" });
SchemaDef.index({ tenantId: 1, companyId: 1 }, { unique: true });
export default mongoose.models.InventoryAlertSetting || mongoose.model<IInventoryAlertSetting>("InventoryAlertSetting", SchemaDef);
