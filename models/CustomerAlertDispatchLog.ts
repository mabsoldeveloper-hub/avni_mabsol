import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerAlertDispatchLog extends Document {
  customerId: string;
  customerName: string;
  email: string;
  phone?: string;
  triggers: string[];
  channels: string[];
  balance: number;
  creditLimit: number;
  pendingBillsCount: number;
  minDaysRemaining: number;
  status: "success" | "partial" | "failed";
  errorDetails?: string;
  createdAt: Date;
}

const CustomerAlertDispatchLogSchema = new Schema<ICustomerAlertDispatchLog>(
  {
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    triggers: [{ type: String }],
    channels: [{ type: String }],
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    pendingBillsCount: { type: Number, default: 0 },
    minDaysRemaining: { type: Number, default: 0 },
    status: { type: String, enum: ["success", "partial", "failed"], default: "success" },
    errorDetails: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CustomerAlertDispatchLogSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.models.CustomerAlertDispatchLog ||
  mongoose.model<ICustomerAlertDispatchLog>("CustomerAlertDispatchLog", CustomerAlertDispatchLogSchema);

