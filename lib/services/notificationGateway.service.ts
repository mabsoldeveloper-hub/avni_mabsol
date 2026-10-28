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
      const metaAccessToken =
        activeConfig?.whatsapp?.metaAccessToken ||
        process.env.WHATSAPP_TOKEN ||
        process.env.META_ACCESS_TOKEN ||
        "";
      const metaPhoneNumberId =
        activeConfig?.whatsapp?.metaPhoneNumberId ||
        process.env.PHONE_NUMBER_ID ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        process.env.META_PHONE_NUMBER_ID ||
        "";

      if (metaAccessToken && metaPhoneNumberId) {
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
          `https://graph.facebook.com/v19.0/${metaPhoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${metaAccessToken}`,
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

      // If credentials are not configured, log and return informative error
      console.warn(`[WHATSAPP CONFIG] Meta PHONE_NUMBER_ID is not configured for automatic background dispatch to ${to}.`);
      return {
        success: false,
        channel: "whatsapp",
        recipient: to,
        error: "Meta WhatsApp PHONE_NUMBER_ID is not configured in settings or .env file. Please use the 1-Click 'Open in WhatsApp Web/App' button to send directly to customer.",
      };
    } catch (err: any) {
      console.error("WhatsApp Send Error:", err);
      return { success: false, channel: "whatsapp", recipient: to, error: err.message || "Failed to send WhatsApp" };
    }
  }

  /**
   * Send Email Message (SMTP / Mock)
   */
  // static async sendEmail({
  //   to,
  //   subject,
  //   html,
  //   text,
  //   config,
  // }: {
  //   to: string;
  //   subject: string;
  //   html: string;
  //   text?: string;
  //   config?: INotificationGatewayConfig | null;
  // }): Promise<ISendMessageResult> {
  //   if (!to || !to.includes("@")) {
  //     return {
  //       success: false,
  //       channel: "email",
  //       recipient: to,
  //       error: "Invalid email address",
  //     };
  //   }
  
  //   try {
  //     const activeConfig =
  //       config || (await this.getConfig());
  
  //     if (!activeConfig) {
  //       return {
  //         success: false,
  //         channel: "email",
  //         recipient: to,
  //         error:
  //           "Email gateway configuration not found",
  //       };
  //     }
  
  //     const emailConfig =
  //       activeConfig.email;
  
  //     const provider =
  //       emailConfig?.provider || "";
  
  //     /* =====================================================
  //        SMTP EMAIL
  //        ===================================================== */
  
  //     if (provider === "smtp") {
  //       if (
  //         !emailConfig?.smtpHost ||
  //         !emailConfig?.smtpUser ||
  //         !emailConfig?.smtpPass
  //       ) {
  //         return {
  //           success: false,
  //           channel: "email",
  //           recipient: to,
  //           error:
  //             "SMTP configuration is incomplete. Please check SMTP host, username and password.",
  //         };
  //       }
  
  //       try {
  //         const nodemailer =
  //           require("nodemailer");
  
  //         const transporter =
  //           nodemailer.createTransport({
  //             host: emailConfig.smtpHost,
  
  //             port:
  //               emailConfig.smtpPort || 587,
  
  //             secure:
  //               !!emailConfig.smtpSecure,
  
  //             auth: {
  //               user:
  //                 emailConfig.smtpUser,
  
  //               pass:
  //                 emailConfig.smtpPass,
  //             },
  
  //             // Helps prevent hanging forever
  //             connectionTimeout: 15000,
  //             greetingTimeout: 15000,
  //             socketTimeout: 20000,
  //           });
  
  //         /* =================================================
  //            VERIFY SMTP CONNECTION FIRST
  //            ================================================= */
  
  //         await transporter.verify();
  
  //         /* =================================================
  //            SEND EMAIL
  //            ================================================= */
  
  //         const info =
  //           await transporter.sendMail({
  //             from: `"${emailConfig.fromName || "Mabsol Pharma"}" <${
  //               emailConfig.fromEmail ||
  //               emailConfig.smtpUser
  //             }>`,
  //             to,
  //             subject,
  //             text: text || subject,
  //             html,
  //           });
  
  //         console.log(
  //           "[SMTP EMAIL SENT]",
  //           {
  //             to,
  //             subject,
  //             messageId:
  //               info?.messageId,
  //             accepted:
  //               info?.accepted,
  //             rejected:
  //               info?.rejected,
  //           }
  //         );
  
  //         return {
  //           success: true,
  //           channel: "email",
  //           recipient: to,
  //           messageId:
  //             info?.messageId ||
  //             `smtp_${Date.now()}`,
  //         };
  //       } catch (smtpErr: any) {
  //         console.error(
  //           "[SMTP EMAIL ERROR]",
  //           {
  //             to,
  //             subject,
  //             error:
  //               smtpErr?.message,
  //             code:
  //               smtpErr?.code,
  //             command:
  //               smtpErr?.command,
  //             response:
  //               smtpErr?.response,
  //           }
  //         );
  
  //         return {
  //           success: false,
  //           channel: "email",
  //           recipient: to,
  //           error:
  //             smtpErr?.response ||
  //             smtpErr?.message ||
  //             "SMTP email sending failed",
  //         };
  //       }
  //     }
  
  //     /* =====================================================
  //        NO SMTP CONFIGURATION
  //        ===================================================== */
  
  //     return {
  //       success: false,
  //       channel: "email",
  //       recipient: to,
  //       error:
  //         `Email provider is not configured for SMTP. Current provider: ${
  //           provider || "not configured"
  //         }`,
  //     };
  //   } catch (err: any) {
  //     console.error(
  //       "Email Send Error:",
  //       err
  //     );
  
  //     return {
  //       success: false,
  //       channel: "email",
  //       recipient: to,
  //       error:
  //         err?.message ||
  //         "Failed to send email",
  //     };
  //   }
  // }
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
      const smtpHost = activeConfig?.email?.smtpHost || process.env.SMTP_HOST;
      const smtpPort = Number(activeConfig?.email?.smtpPort || process.env.SMTP_PORT || 465);
      const smtpSecure =
        activeConfig?.email?.smtpSecure !== undefined
          ? !!activeConfig.email.smtpSecure
          : (process.env.BACKUP_SMTP_SECURE === "true" || smtpPort === 465);
      const smtpUser = activeConfig?.email?.smtpUser || process.env.SMTP_USER;
      const smtpPass = activeConfig?.email?.smtpPass || process.env.SMTP_PASS;
      const fromEmail = activeConfig?.email?.fromEmail || process.env.EMAIL_FROM || smtpUser || "";
      const fromName = activeConfig?.email?.fromName || "Mabsol Pharma CRM";

      let lastError = "";

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = require("nodemailer");
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 12000,
            socketTimeout: 12000,
          });

          const info = await transporter.sendMail({
            from: fromEmail.includes("<") ? fromEmail : `"${fromName}" <${smtpUser}>`,
            to,
            subject,
            text: text || subject,
            html,
          });

          console.log(`[SMTP EMAIL DELIVERED] To: ${to} | ID: ${info.messageId}`);
          return { success: true, channel: "email", recipient: to, messageId: info.messageId };
        } catch (smtpErr: any) {
          lastError = smtpErr?.message || "Primary SMTP failure";
          console.warn("[PRIMARY SMTP FAILED] Trying backup SMTP fallback...", smtpErr.message);
        }
      }

      // Check Backup SMTP (e.g. Gmail fallback)
      const backupHost = process.env.BACKUP_SMTP_HOST || "smtp.gmail.com";
      const backupUser = process.env.BACKUP_SMTP_USER || "mabsoldeveloper@gmail.com";
      const backupPass = (process.env.BACKUP_SMTP_PASS || "xfox dvce xbrl jgqk").replace(/\s+/g, "");
      const backupPort = Number(process.env.BACKUP_SMTP_PORT || 465);
      const backupSecure = process.env.BACKUP_SMTP_SECURE !== "false";

      if (backupHost && backupUser && backupPass && (backupUser !== smtpUser || backupHost !== smtpHost)) {
        try {
          const nodemailer = require("nodemailer");
          const backupTransporter = nodemailer.createTransport({
            host: backupHost,
            port: backupPort,
            secure: backupSecure,
            auth: {
              user: backupUser,
              pass: backupPass,
            },
            connectionTimeout: 12000,
            socketTimeout: 12000,
          });

          const info = await backupTransporter.sendMail({
            from: `"${fromName}" <${backupUser}>`,
            to,
            subject,
            text: text || subject,
            html,
          });

          console.log(`[BACKUP SMTP EMAIL DELIVERED] To: ${to} | ID: ${info.messageId}`);
          return { success: true, channel: "email", recipient: to, messageId: info.messageId };
        } catch (backupErr: any) {
          console.error("Backup SMTP also failed:", backupErr.message);
          return {
            success: false,
            channel: "email",
            recipient: to,
            error: `Primary SMTP error: ${lastError} | Backup error: ${backupErr.message}`,
          };
        }
      }

      if (lastError) {
        return { success: false, channel: "email", recipient: to, error: `SMTP Error: ${lastError}` };
      }

      console.warn("[EMAIL CONFIG] SMTP credentials not found in config or .env.");
      return {
        success: false,
        channel: "email",
        recipient: to,
        error: "SMTP server credentials not configured. Please check SMTP_HOST and SMTP_USER in .env or settings.",
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
      const apiKey =
        activeConfig?.sms?.apiKey ||
        process.env.FAST2SMS_API_KEY ||
        process.env.SMS_API_KEY ||
        "";
      const provider = activeConfig?.sms?.provider || (apiKey ? "fast2sms" : "none");

      if ((provider === "fast2sms" || apiKey) && apiKey) {
        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: activeConfig?.sms?.route || "q",
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
          return { success: false, channel: "sms", recipient: to, error: data?.message?.[0] || "Fast2SMS API error" };
        }
      }

      // No active SMS Gateway configured
      console.warn(`[SMS NOT CONFIGURED] Attempted SMS to ${cleanPhone}, but no active SMS gateway API key is configured.`);
      return {
        success: false,
        channel: "sms",
        recipient: to,
        error: "SMS gateway is not configured. Please add FAST2SMS_API_KEY or SMS_API_KEY in .env or settings, or send via WhatsApp / Email.",
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
