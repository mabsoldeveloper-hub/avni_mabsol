import mongoose, { Schema, Document } from "mongoose";

export interface INotificationGatewayConfig extends Document {
  tenantId: string;
  companyId?: string;
  
  // Email Configuration (SMTP / SES)
  email: {
    enabled: boolean;
    provider: "smtp" | "ses" | "sendgrid" | "mock";
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPass?: string;
    fromEmail: string;
    fromName: string;
  };

  // WhatsApp Configuration (Meta Cloud API / Twilio)
  whatsapp: {
    enabled: boolean;
    provider: "meta" | "twilio" | "custom_gateway" | "mock";
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
    metaBusinessAccountId?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromPhone?: string;
    customWebhookUrl?: string;
    customApiKey?: string;
  };

  // SMS Configuration (Fast2SMS / MSG91 / Twilio)
  sms: {
    enabled: boolean;
    provider: "fast2sms" | "msg91" | "twilio" | "mock";
    apiKey?: string;
    senderId?: string;
    route?: string; // e.g. "dlt", "v3", "otp"
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromPhone?: string;
  };

  // Event Notification Matrix (Which channels trigger for which events)
  eventTriggers: {
    orderPlaced: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
    orderDispatched: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
    orderDelivered: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
    lowStockAlert: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
    paymentReminder: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
    dcrSubmitted: { email: boolean; whatsapp: boolean; sms: boolean; inApp: boolean };
  };

  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationGatewayConfigSchema = new Schema<INotificationGatewayConfig>(
  {
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: String, default: "" },

    email: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ["smtp", "ses", "sendgrid", "mock"], default: "mock" },
      smtpHost: { type: String, default: "" },
      smtpPort: { type: Number, default: 587 },
      smtpSecure: { type: Boolean, default: false },
      smtpUser: { type: String, default: "" },
      smtpPass: { type: String, default: "" },
      fromEmail: { type: String, default: "notifications@mabsolpharma.com" },
      fromName: { type: String, default: "MabsolCrm" },
    },

    whatsapp: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ["meta", "twilio", "custom_gateway", "mock"], default: "mock" },
      metaPhoneNumberId: { type: String, default: "" },
      metaAccessToken: { type: String, default: "" },
      metaBusinessAccountId: { type: String, default: "" },
      twilioAccountSid: { type: String, default: "" },
      twilioAuthToken: { type: String, default: "" },
      twilioFromPhone: { type: String, default: "" },
      customWebhookUrl: { type: String, default: "" },
      customApiKey: { type: String, default: "" },
    },

    sms: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ["fast2sms", "msg91", "twilio", "mock"], default: "mock" },
      apiKey: { type: String, default: "" },
      senderId: { type: String, default: "MABSOL" },
      route: { type: String, default: "dlt" },
      twilioAccountSid: { type: String, default: "" },
      twilioAuthToken: { type: String, default: "" },
      twilioFromPhone: { type: String, default: "" },
    },

    eventTriggers: {
      orderPlaced: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
      orderDispatched: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      orderDelivered: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
      lowStockAlert: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
      paymentReminder: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      dcrSubmitted: {
        email: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
    },

    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.NotificationGatewayConfig ||
  mongoose.model<INotificationGatewayConfig>(
    "NotificationGatewayConfig",
    NotificationGatewayConfigSchema
  );
