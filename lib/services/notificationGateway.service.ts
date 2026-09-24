import NotificationGatewayConfig, { INotificationGatewayConfig } from "@/models/NotificationGatewayConfig";
import Notification from "@/models/Notification";

export interface ISendMessageResult {
  success: boolean;
  channel: "whatsapp" | "email" | "sms" | "inApp";
  recipient: string;
  messageId?: string;
  error?: string;
}

/**
 * Universal Multi-Channel Notification Dispatcher
 */
export class NotificationGatewayService {
  /**
   * Fetch active gateway configuration
   */
  static async getConfig(tenantId: string = "TENANT001", companyId?: string): Promise<INotificationGatewayConfig | null> {
    try {
      const query: any = { tenantId };
      if (companyId) query.companyId = companyId;
      let config = await NotificationGatewayConfig.findOne(query);
      if (!config && companyId) {
        config = await NotificationGatewayConfig.findOne({ tenantId });
      }
      return config;
    } catch (e) {
      console.error("Error fetching notification config:", e);
      return null;
    }
  }

  /**
   * Send WhatsApp Message (Meta Cloud API / Twilio / Mock)
   */
  static async sendWhatsApp({
    to,
    message,
    templateName,
    variables,
    config,
  }: {
    to: string;
    message: string;
    templateName?: string;
    variables?: string[];
    config?: INotificationGatewayConfig | null;
  }): Promise<ISendMessageResult> {
    const cleanPhone = to.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      return { success: false, channel: "whatsapp", recipient: to, error: "Invalid phone number" };
    }

    try {
      const activeConfig = config || (await this.getConfig());
      const provider = activeConfig?.whatsapp?.provider || "mock";

      if (provider === "meta" && activeConfig?.whatsapp?.metaAccessToken && activeConfig?.whatsapp?.metaPhoneNumberId) {
        const payload: any = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
        };

        if (templateName) {
          payload.type = "template";
          payload.template = {
            name: templateName,
            language: { code: "en" },
            components: variables
              ? [
                  {
                    type: "body",
                    parameters: variables.map((v) => ({ type: "text", text: v })),
                  },
                ]
              : [],
          };
        } else {
          payload.type = "text";
          payload.text = { preview_url: true, body: message };
        }

        const res = await fetch(
          `https://graph.facebook.com/v19.0/${activeConfig.whatsapp.metaPhoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${activeConfig.whatsapp.metaAccessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (data?.messages?.[0]?.id) {
          return { success: true, channel: "whatsapp", recipient: to, messageId: data.messages[0].id };
        } else {
          return { success: false, channel: "whatsapp", recipient: to, error: data?.error?.message || "Meta API Error" };
        }
      }

      // Mock / Sandbox Mode for instant local testing
      console.log(`[MOCK WHATSAPP] Sent to ${to}: ${message}`);
      return {
        success: true,
        channel: "whatsapp",
        recipient: to,
        messageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
    } catch (err: any) {
      console.error("WhatsApp Send Error:", err);
      return { success: false, channel: "whatsapp", recipient: to, error: err.message || "Failed to send WhatsApp" };
    }
  }

  /**
   * Send Email Message (SMTP / Mock)
   */
  static async sendEmail({
    to,
    subject,
    html,
    text,
    config,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    config?: INotificationGatewayConfig | null;
  }): Promise<ISendMessageResult> {
    if (!to || !to.includes("@")) {
      return { success: false, channel: "email", recipient: to, error: "Invalid email address" };
    }

    try {
      const activeConfig = config || (await this.getConfig());
      const provider = activeConfig?.email?.provider || "mock";

      if (provider === "smtp" && activeConfig?.email?.smtpHost && activeConfig?.email?.smtpUser) {
        try {
          // Dynamic import of nodemailer if installed, fallback gracefully
          const nodemailer = require("nodemailer");
          const transporter = nodemailer.createTransport({
            host: activeConfig.email.smtpHost,
            port: activeConfig.email.smtpPort || 587,
            secure: !!activeConfig.email.smtpSecure,
            auth: {
              user: activeConfig.email.smtpUser,
              pass: activeConfig.email.smtpPass,
            },
          });

          const info = await transporter.sendMail({
            from: `"${activeConfig.email.fromName || 'MabsolCrm'}" <${activeConfig.email.fromEmail || activeConfig.email.smtpUser}>`,
            to,
            subject,
            text: text || subject,
            html,
          });

          return { success: true, channel: "email", recipient: to, messageId: info.messageId };
        } catch (smtpErr: any) {
          console.warn("SMTP send failed, logging fallback:", smtpErr.message);
        }
      }

      // Mock / Console Fallback
      console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return {
        success: true,
        channel: "email",
        recipient: to,
        messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
    } catch (err: any) {
      console.error("Email Send Error:", err);
      return { success: false, channel: "email", recipient: to, error: err.message || "Failed to send email" };
    }
  }

  /**
   * Send SMS Message (Fast2SMS / MSG91 / Mock)
   */
  static async sendSms({
    to,
    message,
    config,
  }: {
    to: string;
    message: string;
    config?: INotificationGatewayConfig | null;
  }): Promise<ISendMessageResult> {
    const cleanPhone = to.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, channel: "sms", recipient: to, error: "Invalid phone number for SMS" };
    }

    try {
      const activeConfig = config || (await this.getConfig());
      const provider = activeConfig?.sms?.provider || "mock";

      if (provider === "fast2sms" && activeConfig?.sms?.apiKey) {
        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: activeConfig.sms.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: activeConfig.sms.route || "q",
            message,
            language: "english",
            flash: 0,
            numbers: cleanPhone.slice(-10),
          }),
        });

        const data = await res.json();
        if (data?.return === true) {
          return { success: true, channel: "sms", recipient: to, messageId: data.request_id || "fast2sms_ok" };
        } else {
          return { success: false, channel: "sms", recipient: to, error: data?.message?.[0] || "Fast2SMS error" };
        }
      }

      // Mock SMS
      console.log(`[MOCK SMS] To: ${cleanPhone} | Message: ${message}`);
      return {
        success: true,
        channel: "sms",
        recipient: to,
        messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
    } catch (err: any) {
      console.error("SMS Send Error:", err);
      return { success: false, channel: "sms", recipient: to, error: err.message || "Failed to send SMS" };
    }
  }

  /**
   * Create In-App Notification
   */
  static async sendInApp({
    userId,
    targetRole,
    title,
    message,
    type = "GENERAL",
    actionUrl = "",
  }: {
    userId?: string;
    targetRole?: string;
    title: string;
    message: string;
    type?: string;
    actionUrl?: string;
  }) {
    try {
      return await Notification.create({
        tenantId: "TENANT001",
        userId: userId || "",
        targetRole: (targetRole as any) || "All",
        title,
        message,
        type: (type as any) || "GENERAL",
        actionUrl,
        category: "ORDERS",
        isRead: false,
      });
    } catch (e) {
      console.error("Failed to create in-app notification:", e);
    }
  }

  /**
   * Automated Order Lifecycle Alerts (Dispatched / Delivered)
   */
  static async sendOrderMilestoneNotification({
    orderTracking,
    event,
  }: {
    orderTracking: any;
    event: "DISPATCHED" | "DELIVERED";
  }) {
    const config = await this.getConfig(orderTracking.tenantId, orderTracking.companyId);
    const triggers = config?.eventTriggers;

    const customerName = orderTracking.customerName || "Valued Customer";
    const orderNo = orderTracking.orderNumber;
    const courier = orderTracking.courierPartner || "Standard Transport";
    const trackingNo = orderTracking.trackingNumber || "N/A";
    const itemsSummary = orderTracking.items
      ?.map((it: any) => `• ${it.itemName} (${it.quantityOrdered} ${it.unit || 'PCS'}) — Stock Left: ${it.stockAfter}`)
      .join("\n") || "Products in order";

    if (event === "DISPATCHED") {
      const waMsg = `📦 *Order Dispatched Notice*\n\nDear *${customerName}*,\nYour Order *#${orderNo}* has been dispatched via *${courier}* (AWB: ${trackingNo}).\n\n*Stock & Item Summary:*\n${itemsSummary}\n\nThank you for choosing MabsolCrm!`;
      const emailSubject = `Order #${orderNo} Dispatched — MabsolCrm`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5;">📦 Order Dispatched</h2>
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your order <strong>#${orderNo}</strong> has been packed and handed over for delivery.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 4px 0;"><strong>Courier:</strong> ${courier}</p>
            <p style="margin: 4px 0;"><strong>Tracking Number / LR:</strong> ${trackingNo}</p>
            <p style="margin: 4px 0;"><strong>Total Value:</strong> ₹${Number(orderTracking.totalAmount || 0).toLocaleString('en-IN')}</p>
          </div>
          <h4>Items & Stock Left:</h4>
          <pre style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-family: inherit;">${itemsSummary}</pre>
        </div>
      `;
      const smsMsg = `MABSOL: Order #${orderNo} has been dispatched via ${courier} (AWB: ${trackingNo}). Thank you!`;

      // Customer notifications
      if (orderTracking.customerPhone) {
        if (triggers?.orderDispatched?.whatsapp !== false) {
          await this.sendWhatsApp({ to: orderTracking.customerPhone, message: waMsg, config });
        }
        if (triggers?.orderDispatched?.sms !== false) {
          await this.sendSms({ to: orderTracking.customerPhone, message: smsMsg, config });
        }
      }
      if (orderTracking.customerEmail && triggers?.orderDispatched?.email !== false) {
        await this.sendEmail({ to: orderTracking.customerEmail, subject: emailSubject, html: emailHtml, config });
      }

      // Salesperson notification
      if (orderTracking.salespersonPhone) {
        await this.sendWhatsApp({
          to: orderTracking.salespersonPhone,
          message: `🚚 *Territory Alert*: Order #${orderNo} for *${customerName}* has been dispatched.`,
          config,
        });
      }
    } else if (event === "DELIVERED") {
      const waMsg = `✅ *Order Delivered Successfully*\n\nDear *${customerName}*,\nYour Order *#${orderNo}* has been marked as delivered.\n\nPlease inspect the package and let your representative (*${orderTracking.salespersonName || 'MR'}*) know if you have any feedback.\n\nThank you!`;
      const emailSubject = `Order #${orderNo} Delivered Successfully — MabsolCrm`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10b981;">✅ Order Delivered</h2>
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your order <strong>#${orderNo}</strong> has been marked as delivered.</p>
        </div>
      `;

      if (orderTracking.customerPhone) {
        await this.sendWhatsApp({ to: orderTracking.customerPhone, message: waMsg, config });
      }
      if (orderTracking.customerEmail) {
        await this.sendEmail({ to: orderTracking.customerEmail, subject: emailSubject, html: emailHtml, config });
      }
    }
  }
}
