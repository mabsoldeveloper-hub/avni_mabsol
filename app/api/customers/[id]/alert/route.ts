import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Company from "@/models/Company";
import Notification from "@/models/Notification";
import Pendings from "@/models/Pendings";
import mongoose from "mongoose";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";

export const dynamic = "force-dynamic";

function cleanDigits(val: any): string {
  if (!val) return "";
  return String(val).replace(/\D/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer id" },
        { status: 400 }
      );
    }

    const restriction = await getMrTerritoryRestriction();
    const customer: any = await Customer.findById(id).lean();

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    if (restriction.isMrRestricted && !restriction.isPartyAllowed(customer)) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const channel = body.channel || "whatsapp"; // "whatsapp" | "sms" | "email" | "all"
    const alertType = body.alertType || "credit_limit"; // "credit_limit" | "days_expiring" | "bill_limit" | "overdue_days"
    const customMessage = body.customMessage;

    const customerName = (customer.PARNAM || "Valued Customer").trim();
    const phone = body.recipientPhone || customer.PHONE1 || customer.PHONE2 || "";
    
    // First, lookup Marg ERP support collection email (SNO=2, REMARK)
    let supportEmail = "";
    const possibleCodes = Array.from(
      new Set(
        [
          String(customer.ORDNO || ""),
          String(customer.CODEP || ""),
          String(customer.SCODE || ""),
        ]
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      )
    );

    if (possibleCodes.length > 0) {
      try {
        const supportCollection = mongoose.connection.collection("vfp_new_folder_support");
        const regexList = possibleCodes.map(
          (c) => new RegExp(`^\\s*${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i")
        );

        const supportRows: any[] = await supportCollection
          .find({
            $or: [
              { LCODE: { $in: possibleCodes } },
              { LCODE: { $in: possibleCodes.map((c) => c.toLowerCase()) } },
              { LCODE: { $in: regexList } },
            ],
            SNO: { $in: [2, "2"] },
            _vfpDeleted: { $ne: true },
          })
          .toArray();

        for (const row of supportRows) {
          const remark = String(row?.REMARK || "").trim();
          if (remark) {
            const match = remark.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
            if (match?.[0]) {
              supportEmail = match[0].trim();
              break;
            } else if (remark.includes("@")) {
              supportEmail = remark;
              break;
            }
          }
        }
      } catch (supErr: any) {
        console.warn("Support email lookup error in alert route:", supErr.message);
      }
    }

    // Determine final recipient email: supportEmail > clean custom body.recipientEmail > customer.EMAIL
    let email = "";
    const adminPattern = /admin\.mabsolinfotech|support@mabsolinfotech/i;

    if (
      typeof body.recipientEmail === "string" &&
      body.recipientEmail.includes("@") &&
      !adminPattern.test(body.recipientEmail)
    ) {
      email = body.recipientEmail.trim();
    } else if (supportEmail) {
      email = supportEmail;
    } else if (
      typeof customer.EMAIL === "string" &&
      customer.EMAIL.includes("@") &&
      !adminPattern.test(customer.EMAIL)
    ) {
      email = customer.EMAIL.trim();
    }

    const balance = Number(customer.BALANCE ?? customer.FINAL ?? 0);
    const credit = Number(customer.CREDIT ?? 0);
    const dueDays = Number(customer.DUEDAYS ?? customer.DAYS ?? 0);
    const billLimit = Number(customer.BILL_LIMIT ?? customer.BILLLIMIT ?? customer.MAXBILLS ?? 0);

    const isCreditLimitExceeded = credit > 0 && balance > credit;
    const excess = isCreditLimitExceeded ? Math.round(balance - credit) : 0;

    // Check pending bills count
    let totalPendingBills = 0;
    try {
      const orderKeys = [String(customer.ORDNO || ""), String(customer.CODEP || "")].filter(Boolean);
      if (orderKeys.length) {
        totalPendingBills = await Pendings.countDocuments({
          ORD: { $in: orderKeys },
          BALANCE: { $ne: 0 },
        });
      }
    } catch (e) {
      console.warn("Could not fetch pending bills count:", e);
    }

    // Resolve sender company name (from request body or Company collection)
    let senderCompanyName = (typeof body.companyName === "string" ? body.companyName : "").trim();
    if (!senderCompanyName) {
      try {
        const compDoc: any =
          (await Company.findOne({ isHeadOffice: true }).lean()) ||
          (await Company.findOne().lean());
        if (compDoc?.companyName) {
          senderCompanyName = String(compDoc.companyName).trim();
        }
      } catch (e) {}
    }
    if (!senderCompanyName) {
      senderCompanyName = "Mabsol Infotech Private Limited";
    }

    // Build standard alert message if customMessage is not supplied
    let messageText = customMessage;
    if (!messageText) {
      if (alertType === "credit_limit") {
        messageText = `📢 *URGENT: CREDIT LIMIT EXCEEDED ALERT*
Dear *${customerName}*,

This is an important update regarding your account with *${senderCompanyName}*:

• *Current Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}
• *Sanctioned Credit Limit:* ₹${credit.toLocaleString("en-IN")}
${excess > 0 ? `• *Excess Over Limit:* ₹${excess.toLocaleString("en-IN")} ⚠️\n` : ""}• *Credit Days Term:* ${dueDays} Days

⚠️ *Notice:* Your account balance has exceeded the sanctioned credit limit. Please arrange for prompt payment clearance to avoid order dispatch delays or account holds.

For payment queries or bank account details, please contact our accounts department.
Thank you!`;
      } else if (alertType === "bill_limit") {
        messageText = `📑 *ALERT: NUMBER OF BILLS LIMIT EXCEEDED*
Dear *${customerName}*,

Greetings from *${senderCompanyName}*.

• *Current Pending Invoices:* ${totalPendingBills || "Multiple"} Bills
• *Allowed Bill Limit:* ${billLimit || "Sanctioned"} Bills
• *Total Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}

⚠️ *Notice:* The number of pending invoices in your account has exceeded the allowed limit. Please settle prior outstanding invoices to enable processing of new orders.

Thank you!`;
      } else if (alertType === "days_expiring" || alertType === "overdue_days") {
        messageText = `⏰ *PAYMENT REMINDER - CREDIT TERM EXPIRING SOON*
Dear *${customerName}*,

Greetings from *${senderCompanyName}*.

• *Credit Term Allowed:* ${dueDays} Days
• *Pending Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}

⚠️ *Notice:* The credit period for your outstanding invoices is expiring shortly. Please arrange payment clearance on or before the due date to ensure uninterrupted supplies and maintain a healthy credit rating.

Thank you!`;
      } else {
        messageText = `📋 *ACCOUNT STATEMENT & PAYMENT UPDATE*
Dear *${customerName}*,

Here is your current account balance summary with *${senderCompanyName}*:

• *Total Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}
• *Sanctioned Credit Limit:* ₹${credit.toLocaleString("en-IN")}
• *Agreed Credit Term:* ${dueDays} Days

Please review the statement above and schedule payment clearance as per agreed terms.
Thank you!`;
      }
    }

    // Format phone for direct WhatsApp link
    let rawPhone = cleanDigits(phone);
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }

    const directWhatsAppUrl = rawPhone
      ? `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(messageText)}`
      : "";

    const dispatchResults: any[] = [];

    if (channel === "email" && (!email || !email.includes("@"))) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid recipient email address for this customer.",
        },
        { status: 400 }
      );
    }

    // 1. WhatsApp Dispatch
    if ((channel === "whatsapp" || channel === "all") && phone) {
      try {
        const waRes = await NotificationGatewayService.sendWhatsApp({
          to: phone,
          message: messageText,
        });
        dispatchResults.push(waRes);
      } catch (err: any) {
        dispatchResults.push({
          channel: "whatsapp",
          success: false,
          error: err.message,
        });
      }
    }

    // 2. SMS Dispatch
    if ((channel === "sms" || channel === "all") && phone) {
      try {
        const smsRes = await NotificationGatewayService.sendSms({
          to: phone,
          message: messageText.replace(/[*_~]/g, ""), // clean markdown characters
        });
        dispatchResults.push(smsRes);
      } catch (err: any) {
        dispatchResults.push({
          channel: "sms",
          success: false,
          error: err.message,
        });
      }
    }

    // 3. Email Dispatch
    if ((channel === "email" || channel === "all") && email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #343872; margin-top: 0;">${senderCompanyName} — Account & Payment Alert</h2>
            <p>Dear <strong>${customerName}</strong>,</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #f43f5e; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Outstanding Balance:</strong> ₹${balance.toLocaleString("en-IN")}</p>
              <p style="margin: 5px 0;"><strong>Credit Limit:</strong> ₹${credit.toLocaleString("en-IN")}</p>
              ${excess > 0 ? `<p style="margin: 5px 0; color: #e11d48;"><strong>Excess Over Limit:</strong> ₹${excess.toLocaleString("en-IN")}</p>` : ""}
              <p style="margin: 5px 0;"><strong>Credit Term:</strong> ${dueDays} Days</p>
              ${billLimit > 0 ? `<p style="margin: 5px 0;"><strong>Pending Bills / Limit:</strong> ${totalPendingBills} / ${billLimit}</p>` : ""}
            </div>
            <p style="white-space: pre-line;">${messageText}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px;">This is an automated communication from ${senderCompanyName} ERP & CRM system.</p>
          </div>
        `;

        const emailRes = await NotificationGatewayService.sendEmail({
          to: email,
          subject: `⚠️ Account Alert: Payment & Credit Terms Notice - ${customerName} (${senderCompanyName})`,
          html: emailHtml,
          text: messageText,
        });
        dispatchResults.push(emailRes);
      } catch (err: any) {
        dispatchResults.push({
          channel: "email",
          success: false,
          error: err.message,
        });
      }
    }

    // Record internal audit Notification
    try {
      await Notification.create({
        title: `📢 Customer Alert Sent: ${customerName}`,
        message: `Alert (${alertType} via ${channel}) sent to customer ${customerName}. Balance: ₹${balance.toLocaleString("en-IN")}, Limit: ₹${credit.toLocaleString("en-IN")}.`,
        type: alertType === "credit_limit" ? "CREDIT_LIMIT_EXCEEDED" : "OUTSTANDING_OVERDUE",
        category: "FINANCIAL",
        severity: "info",
        targetRole: "All",
        entityId: String(id),
        actionUrl: `/dashboard/customers/view/${id}`,
        metadata: {
          channel,
          alertType,
          phone,
          email,
          balance,
          credit,
          excess,
          dueDays,
          billLimit,
          totalPendingBills,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to create audit notification:", notifErr);
    }

    // Check if requested channels actually succeeded
    const waResult = dispatchResults.find((r) => r.channel === "whatsapp");
    const emailResult = dispatchResults.find((r) => r.channel === "email");
    const smsResult = dispatchResults.find((r) => r.channel === "sms");

    if (channel === "whatsapp" && waResult && !waResult.success) {
      return NextResponse.json({
        success: false,
        message:
          waResult.error ||
          "Meta WhatsApp Cloud API is not configured. Please use 1-Click 'Open in WhatsApp' button.",
        directWhatsAppUrl,
        previewMessage: messageText,
        dispatchResults,
        recipient: { name: customerName, phone, email },
      });
    }

    if (channel === "email" && emailResult && !emailResult.success) {
      return NextResponse.json({
        success: false,
        message: emailResult.error || "Failed to send email via SMTP.",
        directWhatsAppUrl,
        previewMessage: messageText,
        dispatchResults,
        recipient: { name: customerName, phone, email },
      });
    }

    const anySuccess = dispatchResults.some((r) => r.success);
    const allFailed = dispatchResults.length > 0 && !anySuccess;

    return NextResponse.json({
      success: !allFailed,
      message: allFailed
        ? `Alert could not be dispatched via ${channel}. Please check channel settings or use direct WhatsApp.`
        : `Alert dispatched to ${customerName} (${channel})`,
      directWhatsAppUrl,
      previewMessage: messageText,
      dispatchResults,
      recipient: {
        name: customerName,
        phone,
        email,
      },
    });
  } catch (error: any) {
    console.error("POST /api/customers/[id]/alert error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to dispatch customer alert",
      },
      { status: 500 }
    );
  }
}
