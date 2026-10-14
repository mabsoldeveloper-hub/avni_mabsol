import cron from "node-cron";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import CustomerAlertConfig from "@/models/CustomerAlertConfig";
import CustomerAlertDispatchLog from "@/models/CustomerAlertDispatchLog";
import Pendings from "@/models/Pendings";
import Notification from "@/models/Notification";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";

function clean(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\u0000/g, "").trim();
}

// Persistent global singleton across Next.js reloads
declare global {
  var __customerAlertScheduler: {
    cronTask: any;
    intervalTimer: any;
    watchdogTimer: any;
    isSchedulerRunning: boolean;
    currentCronExpression: string;
    isScanningNow: boolean;
    lastDailyRunDate: string;
  } | undefined;
}

if (!globalThis.__customerAlertScheduler) {
  globalThis.__customerAlertScheduler = {
    cronTask: null,
    intervalTimer: null,
    watchdogTimer: null,
    isSchedulerRunning: false,
    currentCronExpression: "",
    isScanningNow: false,
    lastDailyRunDate: "",
  };
}

const schedulerState = globalThis.__customerAlertScheduler!;

/**
 * Convert user schedule preferences to standard cron expressions
 */
export function resolveCronExpression(config: any): string {
  const frequency = config?.scheduleFrequency || "every_15_mins";

  switch (frequency) {
    case "every_15_mins":
      return "*/15 * * * *";
    case "hourly":
      return "0 * * * *";
    case "every_6_hours":
      return "0 */6 * * *";
    case "daily":
    default: {
      const timeStr = String(config?.scheduledTime || "09:00").trim();
      const [hourStr, minStr] = timeStr.split(":");
      const hour = Math.min(23, Math.max(0, parseInt(hourStr || "9", 10) || 9));
      const min = Math.min(59, Math.max(0, parseInt(minStr || "0", 10) || 0));
      return `${min} ${hour} * * *`;
    }
  }
}

/**
 * Send an immediate verification test email to any specified admin/user Gmail
 */
export async function sendTestEmailToAdmin(targetEmail: string) {
  if (!targetEmail || !targetEmail.includes("@")) {
    return { success: false, error: "Invalid target email address" };
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">⚡ Mabsol CRM — Customer Alert System Test</h2>
        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">SMTP Live Delivery Verification</p>
      </div>
      <p style="font-size: 14px; color: #1e293b;">Hello,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        This test email confirms that your <strong>GoDaddy SMTP</strong> email gateway is active and able to send automated customer alerts directly to your Gmail inbox.
      </p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #15803d; font-weight: bold;">✅ SMTP Delivery Verified</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #166534;">Your background scheduler will automatically send alerts for customers matching your rules to this email.</p>
      </div>
      <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toLocaleString("en-IN")}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mabsol Healthcare ERP & CRM Automation Engine</p>
    </div>
  `;

  return await NotificationGatewayService.sendEmail({
    to: targetEmail,
    subject: `✅ Mabsol CRM: Customer Alert System Test Email (${new Date().toLocaleTimeString("en-IN")})`,
    html: emailHtml,
    text: "Mabsol CRM: Customer Alert System Test Email. Your SMTP is active and working properly.",
  });
}

/**
 * Core scanning and alert dispatch execution function
 */
export async function runCustomerAlertScan(options: { forceIgnoreCooldown?: boolean } = {}) {
  if (schedulerState.isScanningNow) {
    console.warn("[Customer Alert Scanner] Scan already in progress, skipping overlapping tick.");
    return { success: false, message: "Scan already in progress" };
  }

  schedulerState.isScanningNow = true;

  try {
    await connectDB();

    let config = await CustomerAlertConfig.findOne({ tenantId: "TENANT001" });
    if (!config) {
      config = await CustomerAlertConfig.create({
        tenantId: "TENANT001",
        enabled: true,
        daysRemainingThreshold: 3,
        billCountThreshold: 5,
        creditLimitPercentage: 100,
        autoDispatchEmail: true,
        autoDispatchWhatsApp: false,
        schedulerEnabled: true,
        scheduleFrequency: "every_15_mins",
        scheduledTime: "09:00",
        cooldownHours: 24,
        adminNotificationEmail: "",
      });
    }

    if (!config.enabled) {
      console.log("[Customer Alert Scanner] Alerts are globally disabled in config.");
      return { success: false, message: "Alerts are globally disabled" };
    }

    const daysThreshold = Number(config.daysRemainingThreshold ?? 3);
    const billThreshold = Number(config.billCountThreshold ?? 5);
    const creditPct = Number(config.creditLimitPercentage ?? 100);
    const cooldownHours = Number(config.cooldownHours ?? 24);
    const adminEmail = String(config.adminNotificationEmail || "").trim();
    const isTestingSchedule = config.scheduleFrequency === "every_15_mins";

    // Fetch active customer accounts
    const customers: any[] = await Customer.find({
      $or: [{ STATUS: "Y" }, { STATUS: "Active" }, { STATUS: { $exists: false } }],
    })
      .limit(300)
      .lean();

    // Pre-fetch customer email addresses from Marg ERP support collection (vfp_new_folder_support with SNO=2)
    const supportCodes = Array.from(
      new Set(
        customers
          .flatMap((c) => [clean(c.ORDNO), clean(c.CODEP)])
          .map((code) => code.toUpperCase())
          .filter(Boolean)
      )
    );

    const supportEmailMap = new Map<string, string>();
    if (supportCodes.length > 0) {
      try {
        const supportCollection = mongoose.connection.collection("vfp_new_folder_support");
        const supportRows = await supportCollection
          .find(
            {
              LCODE: { $in: supportCodes },
              SNO: { $in: [2, "2"] },
              _vfpDeleted: { $ne: true },
            },
            { projection: { LCODE: 1, REMARK: 1 } }
          )
          .toArray();

        for (const row of supportRows) {
          const remark = clean(row?.REMARK);
          if (remark) {
            const emailMatch = remark.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
            if (emailMatch?.[0]) {
              supportEmailMap.set(clean(row?.LCODE).toUpperCase(), emailMatch[0].trim().toUpperCase());
            }
          }
        }
      } catch (supportErr: any) {
        console.warn("[Customer Alert Scanner] Support email lookup warning:", supportErr.message);
      }
    }

    const todayMs = Date.now();
    let scannedCount = 0;
    let alertsTriggered = 0;
    const triggeredCustomers: any[] = [];

    for (const cust of customers) {
      scannedCount++;
      const custId = String(cust._id);
      const custName = (cust.PARNAM || "Valued Customer").trim();
      const phone = cust.PHONE1 || cust.PHONE2 || "";
      
      let email = "";
      const ord = clean(cust.ORDNO).toUpperCase();
      const codep = clean(cust.CODEP).toUpperCase();
      if (ord && supportEmailMap.has(ord)) {
        email = supportEmailMap.get(ord)!;
      } else if (codep && supportEmailMap.has(codep)) {
        email = supportEmailMap.get(codep)!;
      } else if (clean(cust.EMAIL).includes("@")) {
        email = clean(cust.EMAIL).toUpperCase();
      } else if (clean(cust.E_MAIL).includes("@")) {
        email = clean(cust.E_MAIL).toUpperCase();
      }

      const balance = Number(cust.BALANCE ?? cust.FINAL ?? 0);
      const credit = Number(cust.CREDIT ?? 0);
      const dueDays = Number(cust.DUEDAYS ?? cust.DAYS ?? 0);

      // Fetch pending invoices count & calculate days
      const orderKeys = [clean(cust.ORDNO), clean(cust.CODEP)].filter(Boolean);
      let pendingBillsCount = 0;
      let minDaysRemaining = 999;
      let maxOverdueDays = 0;

      if (orderKeys.length) {
        try {
          const invoices = await Pendings.find({
            ORD: { $in: orderKeys },
            BALANCE: { $ne: 0 },
          }).lean();

          pendingBillsCount = invoices.length;

          for (const inv of invoices) {
            if (inv.DDATE) {
              const billMs = new Date(inv.DDATE).getTime();
              const diffDays = Math.floor((todayMs - billMs) / (1000 * 60 * 60 * 24));
              const allowed = dueDays > 0 ? dueDays : Number(inv.DUEDAYS || 0);
              const remaining = allowed - diffDays;
              if (remaining < minDaysRemaining) {
                minDaysRemaining = remaining;
              }
              if (diffDays > allowed && diffDays - allowed > maxOverdueDays) {
                maxOverdueDays = diffDays - allowed;
              }
            }
          }
        } catch (err) {
          console.warn("[Customer Alert Scanner] Pendings fetch error:", err);
        }
      }

      if (minDaysRemaining === 999) minDaysRemaining = dueDays;

      // Evaluate the 3 configured rules
      const triggers: string[] = [];

      // Rule 1: Credit Limit Threshold
      const creditThresholdAmt = (credit * creditPct) / 100;
      if (credit > 0 && balance >= creditThresholdAmt) {
        triggers.push(
          `Credit Limit Exceeded: Outstanding ₹${balance.toLocaleString("en-IN")} reaches ${creditPct}% of credit limit (₹${credit.toLocaleString("en-IN")})`
        );
      }

      // Rule 2: Days Remaining Threshold
      if (dueDays > 0 && pendingBillsCount > 0 && (minDaysRemaining <= daysThreshold || maxOverdueDays > 0)) {
        if (maxOverdueDays > 0) {
          triggers.push(`Payment Overdue: Invoices overdue by ${maxOverdueDays} days`);
        } else {
          triggers.push(`Credit Term Expiring Soon: ${minDaysRemaining} days remaining (Threshold: ${daysThreshold} days)`);
        }
      }

      // Rule 3: Pending Bill Count Threshold
      if (billThreshold > 0 && pendingBillsCount >= billThreshold) {
        triggers.push(`Invoice Count Exceeded: ${pendingBillsCount} pending invoices (Threshold: ${billThreshold})`);
      }

      // If customer matches any rule, process alert
      if (triggers.length > 0) {
        alertsTriggered++;

        // Cooldown Check
        if (!options.forceIgnoreCooldown && !isTestingSchedule) {
          let cooldownCutoff: Date;

          if (config.scheduleFrequency === "daily") {
            const todayIstStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            cooldownCutoff = new Date(`${todayIstStr}T00:00:00.000+05:30`);
          } else if (cooldownHours > 0) {
            cooldownCutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
          } else {
            cooldownCutoff = new Date(0);
          }

          if (cooldownCutoff.getTime() > 0) {
            const recentLog = await CustomerAlertDispatchLog.findOne({
              customerId: custId,
              createdAt: { $gte: cooldownCutoff },
              status: "success",
            }).lean();

            if (recentLog) {
              console.log(
                `[Customer Alert Scanner] Skipped duplicate alert for ${custName} (Already dispatched on/since ${cooldownCutoff.toISOString()}).`
              );
              continue;
            }
          }
        }

        const channelsSent: string[] = [];

        // Build professional alert message
        const messageText = `📢 *AUTOMATED ACCOUNT & PAYMENT ALERT*
Dear *${custName}*,

This is an automated notification from *Mabsol Healthcare*:

• *Outstanding Balance:* ₹${balance.toLocaleString("en-IN")}
• *Sanctioned Credit Limit:* ₹${credit.toLocaleString("en-IN")}
• *Pending Invoices:* ${pendingBillsCount} Invoices
• *Credit Term Allowed:* ${dueDays} Days (${minDaysRemaining > 0 ? `${minDaysRemaining} days remaining` : "Due / Overdue"})

⚠️ *Reason for Alert:*
${triggers.map((t) => `• ${t}`).join("\n")}

Please arrange payment clearance promptly to ensure uninterrupted supplies and healthy credit terms.
Thank you!`;

        // 1. Dispatch Email via GoDaddy SMTP to Customer AND Admin Notification Email
        if (config.autoDispatchEmail) {
          const emailRecipients: string[] = [];

          if (email && email.includes("@")) {
            emailRecipients.push(email);
          }
          if (adminEmail && adminEmail.includes("@") && !emailRecipients.includes(adminEmail)) {
            emailRecipients.push(adminEmail);
          }

          for (const recipientTo of emailRecipients) {
            try {
              const emailRes = await NotificationGatewayService.sendEmail({
                to: recipientTo,
                subject: `⚠️ Payment Alert: Account Notice - ${custName}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="border-bottom: 2px solid #343872; padding-bottom: 12px; margin-bottom: 16px;">
                      <h2 style="color: #343872; margin: 0; font-size: 20px;">Mabsol Healthcare — Payment & Account Alert</h2>
                      <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Automated Credit Terms & Invoice Notice</p>
                    </div>
                    <p style="font-size: 14px; color: #1e293b;">Dear <strong>${custName}</strong>,</p>
                    <p style="font-size: 13px; color: #475569; line-height: 1.5;">This is an automated notification regarding your account ledger status:</p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Outstanding Balance:</strong> ₹${balance.toLocaleString("en-IN")}</p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Sanctioned Credit Limit:</strong> ₹${credit.toLocaleString("en-IN")}</p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Pending Invoices:</strong> ${pendingBillsCount} Invoices</p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Credit Term:</strong> ${dueDays} Days (${minDaysRemaining > 0 ? `${minDaysRemaining} days remaining` : "Due / Overdue"})</p>
                    </div>

                    <h4 style="margin: 16px 0 8px 0; font-size: 13px; color: #b91c1c;">Alert Trigger Reasons:</h4>
                    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 13px; color: #334155;">
                      ${triggers.map((t) => `<li style="margin-bottom: 4px;">${t}</li>`).join("")}
                    </ul>

                    <p style="font-size: 13px; color: #334155; line-height: 1.5;">Please arrange for payment settlement in accordance with your credit terms. For payment receipts or queries, please reply to this email or reach our accounts team.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">This is an automated dispatch from Mabsol Healthcare CRM. Delivered to: ${recipientTo}</p>
                  </div>
                `,
                text: messageText,
              });

              if (emailRes.success) {
                if (!channelsSent.includes("Email")) channelsSent.push("Email");
                console.log(`[Auto Alert Scheduler] Email sent successfully to ${recipientTo} for ${custName}`);
              }
            } catch (mailErr: any) {
              console.error(`[Auto Alert Scheduler] Email send exception for ${recipientTo}:`, mailErr.message);
            }
          }
        }

        // 2. Dispatch WhatsApp (if Meta API credentials exist)
        if (config.autoDispatchWhatsApp && phone && config.metaPhoneNumberId) {
          try {
            const waRes = await NotificationGatewayService.sendWhatsApp({
              to: phone,
              message: messageText,
              config: {
                whatsapp: {
                  enabled: true,
                  provider: "meta",
                  metaPhoneNumberId: config.metaPhoneNumberId,
                  metaAccessToken: config.metaAccessToken,
                },
              } as any,
            });

            if (waRes.success) {
              channelsSent.push("WhatsApp");
            }
          } catch (waErr: any) {
            console.warn("[Auto Alert Scheduler] WhatsApp dispatch error:", waErr.message);
          }
        }

        // 3. Create Internal CRM Notification
        try {
          await Notification.create({
            title: `⚡ Auto Alert: ${custName}`,
            message: `${triggers.join(" | ")}. Outstanding: ₹${balance.toLocaleString("en-IN")}`,
            type: "OUTSTANDING_OVERDUE",
            category: "FINANCIAL",
            severity: "warning",
            targetRole: "All",
            entityId: custId,
            actionUrl: `/dashboard/customers/view/${custId}`,
            metadata: {
              customerId: custId,
              customerName: custName,
              triggers,
              channelsSent,
              balance,
              credit,
              pendingBillsCount,
              minDaysRemaining,
            },
          });
        } catch (notifErr) {
          console.warn("[Auto Alert Scheduler] Internal Notification error:", notifErr);
        }

        // 4. Save Dispatch Log to prevent duplicate spam
        try {
          await CustomerAlertDispatchLog.create({
            customerId: custId,
            customerName: custName,
            email: email || adminEmail,
            phone,
            triggers,
            channels: channelsSent,
            balance,
            creditLimit: credit,
            pendingBillsCount,
            minDaysRemaining,
            status: channelsSent.length > 0 ? "success" : "failed",
          });
        } catch (logErr) {
          console.warn("[Auto Alert Scheduler] Failed to write dispatch log:", logErr);
        }

        triggeredCustomers.push({
          id: custId,
          name: custName,
          email: email || adminEmail,
          phone,
          triggers,
          channelsSent: channelsSent.length ? channelsSent.join(", ") : "In-App Notification",
        });
      }
    }

    // Update scan metadata in config
    await CustomerAlertConfig.updateOne(
      { tenantId: "TENANT001" },
      {
        $set: {
          lastScanAt: new Date(),
          lastScanResults: {
            scannedCount,
            alertsTriggered,
            timestamp: new Date(),
          },
        },
      }
    );

    console.log(
      `[Customer Alert Scheduler] Completed scan: ${scannedCount} customers evaluated, ${alertsTriggered} alerts processed.`
    );

    return {
      success: true,
      scannedCount,
      alertsTriggered,
      results: triggeredCustomers,
    };
  } catch (err: any) {
    console.error("[Customer Alert Scheduler Error]:", err);
    return { success: false, error: err.message };
  } finally {
    schedulerState.isScanningNow = false;
  }
}

/**
 * Initializes and starts the background Customer Alert Scheduler daemon (singleton)
 */
export async function startCustomerAlertScheduler() {
  try {
    await connectDB();
    const config = await CustomerAlertConfig.findOne({ tenantId: "TENANT001" }).lean();

    if (!config || !config.enabled || config.schedulerEnabled === false) {
      console.log("[Customer Alert Scheduler] Scheduler is disabled in configuration.");
      stopCustomerAlertScheduler();
      return;
    }

    const cronExpr = resolveCronExpression(config);

    // If already running with the exact same cron expression, keep running
    if (schedulerState.isSchedulerRunning && schedulerState.currentCronExpression === cronExpr) {
      return;
    }

    // Stop existing task if any
    stopCustomerAlertScheduler();

    // 1. Setup node-cron schedule strictly in Asia/Kolkata timezone
    schedulerState.cronTask = cron.schedule(
      cronExpr,
      () => {
        console.log(`[Customer Alert Scheduler] Cron tick triggered (${cronExpr}) in Asia/Kolkata`);
        const now = new Date();
        const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        schedulerState.lastDailyRunDate = istDateStr;
        CustomerAlertConfig.updateOne({ tenantId: "TENANT001" }, { $set: { lastDailyRunDate: istDateStr } }).catch(() => {});

        runCustomerAlertScan().catch((err) => {
          console.error("[Customer Alert Scheduler Cron Error]:", err);
        });
      },
      {
        timezone: "Asia/Kolkata",
      }
    );

    // 2. Setup interval fallback for short intervals (e.g. 15 minutes)
    if (config.scheduleFrequency === "every_15_mins") {
      schedulerState.intervalTimer = setInterval(() => {
        console.log("[Customer Alert Scheduler] Interval tick triggered (15 mins)");
        runCustomerAlertScan().catch((err) => {
          console.error("[Customer Alert Scheduler Interval Error]:", err);
        });
      }, 15 * 60 * 1000);
    }

    // 3. Setup active Watchdog timer (every 60s) for Daily schedule catch-up
    schedulerState.watchdogTimer = setInterval(async () => {
      try {
        const activeConfig = await CustomerAlertConfig.findOne({ tenantId: "TENANT001" }).lean();
        if (!activeConfig || !activeConfig.enabled || activeConfig.schedulerEnabled === false) {
          return;
        }

        if (activeConfig.scheduleFrequency === "daily") {
          const now = new Date();
          const currentIstDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
          const currentIstTime = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }).slice(0, 5); // HH:mm
          const targetTime = String(activeConfig.scheduledTime || "09:00").trim();

          const alreadyRanToday =
            schedulerState.lastDailyRunDate === currentIstDate ||
            activeConfig.lastDailyRunDate === currentIstDate;

          if (!alreadyRanToday && currentIstTime >= targetTime) {
            console.log(
              `[Customer Alert Watchdog] Triggering scheduled daily scan for ${currentIstDate} (target: ${targetTime}, current: ${currentIstTime})`
            );
            schedulerState.lastDailyRunDate = currentIstDate;

            await CustomerAlertConfig.updateOne(
              { tenantId: "TENANT001" },
              { $set: { lastDailyRunDate: currentIstDate } }
            );

            await runCustomerAlertScan();
          }
        }
      } catch (watchdogErr: any) {
        console.warn("[Customer Alert Watchdog Error]:", watchdogErr.message);
      }
    }, 60 * 1000);

    schedulerState.isSchedulerRunning = true;
    schedulerState.currentCronExpression = cronExpr;

    console.log(
      `[Customer Alert Scheduler] Daemon active in Asia/Kolkata. Schedule: "${cronExpr}" (${config.scheduleFrequency || "every_15_mins"}).`
    );
  } catch (err: any) {
    console.error("[Customer Alert Scheduler Start Error]:", err.message);
  }
}

/**
 * Stops the background Customer Alert Scheduler daemon
 */
export function stopCustomerAlertScheduler() {
  if (schedulerState.cronTask) {
    schedulerState.cronTask.stop();
    schedulerState.cronTask = null;
  }
  if (schedulerState.intervalTimer) {
    clearInterval(schedulerState.intervalTimer);
    schedulerState.intervalTimer = null;
  }
  if (schedulerState.watchdogTimer) {
    clearInterval(schedulerState.watchdogTimer);
    schedulerState.watchdogTimer = null;
  }
  schedulerState.isSchedulerRunning = false;
  schedulerState.currentCronExpression = "";
  console.log("[Customer Alert Scheduler] Daemon stopped.");
}

/**
 * Restart the scheduler to pick up newly saved schedule frequencies
 */
export async function restartCustomerAlertScheduler() {
  stopCustomerAlertScheduler();
  await startCustomerAlertScheduler();
}

/**
 * Query current scheduler daemon status
 */
export function isCustomerAlertSchedulerActive(): boolean {
  return (
    schedulerState.isSchedulerRunning &&
    (schedulerState.cronTask !== null ||
      schedulerState.intervalTimer !== null ||
      schedulerState.watchdogTimer !== null)
  );
}

/**
 * Query detailed status object
 */
export function getCustomerAlertSchedulerStatus() {
  return {
    isSchedulerRunning:
      schedulerState.isSchedulerRunning &&
      (schedulerState.cronTask !== null ||
        schedulerState.intervalTimer !== null ||
        schedulerState.watchdogTimer !== null),
    currentCronExpression: schedulerState.currentCronExpression,
    isScanningNow: schedulerState.isScanningNow,
    lastDailyRunDate: schedulerState.lastDailyRunDate,
  };
}
