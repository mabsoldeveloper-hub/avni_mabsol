import mongoose, { Schema, Document } from "mongoose";

export interface IBroadcastRecipientLog {
  recipientId?: string;
  recipientName: string;
  recipientRole?: string;
  recipientArea?: string;
  phone?: string;
  email?: string;
  channels: {
    whatsapp?: { status: "sent" | "failed" | "skipped"; error?: string; messageId?: string; sentAt?: Date };
    email?: { status: "sent" | "failed" | "skipped"; error?: string; messageId?: string; sentAt?: Date };
    sms?: { status: "sent" | "failed" | "skipped"; error?: string; messageId?: string; sentAt?: Date };
    inApp?: { status: "sent" | "failed" | "skipped"; error?: string; sentAt?: Date };
  };
}

export interface IBroadcastMessage extends Document {
  tenantId: string;
  companyId?: string;
  title: string;
  messageBody: string;
  channels: ("whatsapp" | "email" | "sms" | "inApp")[];
  targetRoles: string[]; // e.g. ["All", "Salesman", "Customer", "Manager"]
  targetAreaIds: string[];
  targetAreaNames: string[];
  
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "processing" | "completed" | "failed";
  
  recipientLogs: IBroadcastRecipientLog[];
  createdBy?: string;
  senderName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastRecipientLogSchema = new Schema<IBroadcastRecipientLog>(
  {
    recipientId: { type: String },
    recipientName: { type: String, required: true },
    recipientRole: { type: String },
    recipientArea: { type: String },
    phone: { type: String },
    email: { type: String },
    channels: {
      whatsapp: {
        status: { type: String, enum: ["sent", "failed", "skipped"] },
        error: { type: String },
        messageId: { type: String },
        sentAt: { type: Date },
      },
      email: {
        status: { type: String, enum: ["sent", "failed", "skipped"] },
        error: { type: String },
        messageId: { type: String },
        sentAt: { type: Date },
      },
      sms: {
        status: { type: String, enum: ["sent", "failed", "skipped"] },
        error: { type: String },
        messageId: { type: String },
        sentAt: { type: Date },
      },
      inApp: {
        status: { type: String, enum: ["sent", "failed", "skipped"] },
        error: { type: String },
        sentAt: { type: Date },
      },
    },
  },
  { _id: false }
);

const BroadcastMessageSchema = new Schema<IBroadcastMessage>(
  {
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: String, default: "" },
    title: { type: String, required: true },
    messageBody: { type: String, required: true },
    channels: [{ type: String, enum: ["whatsapp", "email", "sms", "inApp"] }],
    targetRoles: [{ type: String }],
    targetAreaIds: [{ type: String }],
    targetAreaNames: [{ type: String }],

    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "processing", "completed", "failed"],
      default: "completed",
    },

    recipientLogs: [BroadcastRecipientLogSchema],
    createdBy: { type: String },
    senderName: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BroadcastMessage ||
  mongoose.model<IBroadcastMessage>("BroadcastMessage", BroadcastMessageSchema);
