import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: String, // Can be user ObjectId string or empty for role-wide notifications
      default: "",
    },
    type: {
      type: String,
      enum: [
        "OUTSTANDING_OVERDUE",
        "CREDIT_LIMIT_EXCEEDED",
        "TARGET_MILESTONE",
        "GIFT_UNLOCKED",
        "LOW_STOCK",
        "NEAR_EXPIRY",
        "NEW_ORDER",
        "ORDER_APPROVAL",
        "SYNC_ALERT",
        "AI_INSIGHT",
        "BRIEFING",
        "FIELD_ALERT",
        "FORM_ALERT",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    category: {
      type: String,
      enum: [
        "FINANCIAL",
        "TARGETS",
        "INVENTORY",
        "ORDERS",
        "SYSTEM",
        "AI_INSIGHT",
        "CUSTOM_FORMS",
        "FIELD_FORCE",
      ],
      default: "SYSTEM",
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "success"],
      default: "info",
    },
    targetRole: {
      type: String,
      enum: ["MR", "RSM", "ZSM", "Admin", "All"],
      default: "All",
    },
    entityId: {
      type: String,
      default: "",
    },
    actionUrl: {
      type: String,
      default: "",
    },
    suggestedAction: {
      type: String,
      default: "",
    },
    impactScore: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", ""],
      default: "",
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Notification) {
  delete (mongoose.models as any).Notification;
}

export default mongoose.model("Notification", NotificationSchema);
