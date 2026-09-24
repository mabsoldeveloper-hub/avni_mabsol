import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Product from "@/models/Product";
import TargetMaster from "@/models/TargetMaster";
import FormSubmission from "@/models/FormSubmission";
import DismissedAlert from "@/models/DismissedAlert";
import mongoose from "mongoose";

export interface GeneratedAiAlert {
  title: string;
  message: string;
  suggestedAction?: string;
  actionUrl?: string;
  type: string;
  category: string;
  severity: "info" | "warning" | "error" | "success";
  impactScore?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  targetRole?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface AiApiMeta {
  tier: "AI Cloud Engine" | "Offline Pharma Engine";
  status: "active" | "quota_exhausted" | "key_invalid" | "key_missing";
  model: string;
  isFreeTier: boolean;
  isQuotaExhausted: boolean;
  alertBanner?: {
    type: "info" | "warning" | "error";
    title: string;
    message: string;
    hint: string;
  };
}

export interface AiScanResult {
  success: boolean;
  mode: string;
  modelUsed: string;
  summary: string;
  totalAlertsEvaluated: number;
  newAlertsCreated: number;
  alerts: GeneratedAiAlert[];
  apiMeta: AiApiMeta;
  warning?: string;
}

// Whitelist of confirmed working dashboard routes in this CRM
export const CONFIRMED_DASHBOARD_ROUTES = new Set([
  "/dashboard",
  "/dashboard/ai-notifications",
  "/dashboard/inventory/dashboard",
  "/dashboard/inventory/products",
  "/dashboard/stock",
  "/dashboard/stock/expiry-liquidator",
  "/dashboard/purchase",
  "/dashboard/purchase/dashboard",
  "/dashboard/purchase/orders",
  "/dashboard/purchase/orders/create",
  "/dashboard/purchase/invoice",
  "/dashboard/purchase/payment",
  "/dashboard/targets",
  "/dashboard/reports/target-vs-actual",
  "/dashboard/reports/outstanding",
  "/dashboard/reports/batch",
  "/dashboard/reports/customer",
  "/dashboard/reports/product",
  "/dashboard/sales",
  "/dashboard/sales/dashboard",
  "/dashboard/sales/invoice",
  "/dashboard/sales/outstanding",
  "/dashboard/custom-forms",
  "/dashboard/custom-forms/builder",
  "/dashboard/mr-reporting",
  "/dashboard/customers",
  "/dashboard/executive-ai",
  "/dashboard/purchase-sales-analytics",
  "/dashboard/whatsapp-campaign",
  "/dashboard/email-campaign",
]);

/**
 * Resolves and validates actionUrl against actual confirmed dashboard routes.
 * Prevents 404s and hallucinated URLs from AI.
 */
export function resolveValidActionUrl(
  rawUrl?: string,
  category: string = "GENERAL",
  type: string = "GENERAL"
): string {
  const clean = String(rawUrl || "").trim();

  // If already an exact confirmed route, return it directly
  if (clean && CONFIRMED_DASHBOARD_ROUTES.has(clean)) {
    return clean;
  }

  const lower = clean.toLowerCase();

  // Common AI hallucinations mapped to verified pages:
  if (lower.includes("setting") && lower.includes("inventory")) {
    return "/dashboard/inventory/dashboard";
  }
  if (lower.includes("expir")) {
    return "/dashboard/stock/expiry-liquidator";
  }
  if (lower.includes("reorder") || lower.includes("po") || lower.includes("purchase/order") || lower.includes("order/create")) {
    return "/dashboard/purchase/orders/create";
  }
  if (lower.includes("product")) {
    return "/dashboard/inventory/products";
  }
  if (lower.includes("stock") || lower.includes("inventory")) {
    return "/dashboard/inventory/dashboard";
  }
  if (lower.includes("target")) {
    return "/dashboard/reports/target-vs-actual";
  }
  if (lower.includes("form")) {
    return "/dashboard/custom-forms";
  }
  if (lower.includes("outstanding") || lower.includes("payment") || lower.includes("credit") || lower.includes("bill")) {
    return "/dashboard/reports/outstanding";
  }
  if (lower.includes("doctor") || lower.includes("mr") || lower.includes("visit") || lower.includes("dcr")) {
    return "/dashboard/mr-reporting";
  }

  // Fallback by Category & Type
  const cat = String(category).toUpperCase();
  const t = String(type).toUpperCase();
  if (cat === "INVENTORY" || t === "LOW_STOCK") return "/dashboard/inventory/dashboard";
  if (cat === "TARGETS" || t === "TARGET_MILESTONE") return "/dashboard/reports/target-vs-actual";
  if (cat === "CUSTOM_FORMS" || t === "FORM_ALERT") return "/dashboard/custom-forms";
  if (cat === "FINANCIAL" || t.includes("OVERDUE")) return "/dashboard/reports/outstanding";
  if (cat === "FIELD_FORCE") return "/dashboard/mr-reporting";

  return "/dashboard";
}

/**
 * Diagnostic parser for Google Gemini API errors
 */
function parseGeminiError(status: number, rawText: string, modelName: string) {
  let parsedMessage = "";
  try {
    const json = JSON.parse(rawText);
    if (json.error?.message) {
      parsedMessage = json.error.message;
    }
  } catch {
    parsedMessage = rawText;
  }

  const lower = parsedMessage.toLowerCase();

  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      title: "AI Engine Quota Limit Reached (HTTP 429)",
      message: `AI Cloud Service quota for model "${modelName}" has been temporarily reached.`,
      hint: "Requests are paced. The offline Pharma Rule Engine is currently active.",
      status: 429,
      isQuota: true,
    };
  }

  if (status === 403 || status === 401 || lower.includes("api_key_invalid") || lower.includes("api key not valid")) {
    return {
      title: "AI API Key Authentication Failed (HTTP 403/401)",
      message: "The AI API key in your .env file is either invalid, unauthorized, or expired.",
      hint: "Please update your AI API key in .env.",
      status: status || 403,
      isQuota: false,
    };
  }

  return {
    title: `AI Service Error (HTTP ${status})`,
    message: parsedMessage || "Failed to communicate with AI Cloud Service.",
    hint: "Switched to built-in Pharma Rule Engine.",
    status,
    isQuota: false,
  };
}

/**
 * Get comprehensive API Status Metadata
 */
export function getGeminiApiStatus(lastErrorMeta?: any, activeModel?: string): AiApiMeta {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      tier: "Offline Pharma Engine",
      status: "key_missing",
      model: "Rule-Based Pharma Engine (Offline)",
      isFreeTier: false,
      isQuotaExhausted: false,
      alertBanner: {
        type: "warning",
        title: "🔑 AI API Key Missing in Server Config (.env)",
        message: "Your CRM is operating on the built-in Pharma Heuristic Engine. All basic operational alerts remain fully functional.",
        hint: "To unlock live operational intelligence, configure your AI API key in .env.",
      },
    };
  }

  if (lastErrorMeta?.isQuota || lastErrorMeta?.status === 429) {
    return {
      tier: "AI Cloud Engine",
      status: "quota_exhausted",
      model: "Rule-Based Pharma Engine (Active Fallback)",
      isFreeTier: true,
      isQuotaExhausted: true,
      alertBanner: {
        type: "warning",
        title: "⚠️ AI Engine Quota Rate-Limited (HTTP 429)",
        message: "AI service limit reached. Don't worry, your CRM has automatically switched to the Built-in Pharma Rule Engine.",
        hint: "Quota automatically resets. Notifications will resume once cleared.",
      },
    };
  }

  if (lastErrorMeta?.status === 403 || lastErrorMeta?.status === 401) {
    return {
      tier: "AI Cloud Engine",
      status: "key_invalid",
      model: "Rule-Based Pharma Engine (Active Fallback)",
      isFreeTier: true,
      isQuotaExhausted: false,
      alertBanner: {
        type: "error",
        title: "🔒 AI API Key Unauthorized / Expired",
        message: "AI Service rejected the configured API key. Built-in Pharma Rule Engine is currently handling alerts.",
        hint: "Please update your AI API key in your .env file.",
      },
    };
  }

  return {
    tier: "AI Cloud Engine",
    status: "active",
    model: activeModel ? String(activeModel).replace(/gemini-?/gi, "AI ") : "AI Smart Engine",
    isFreeTier: true,
    isQuotaExhausted: false,
    alertBanner: {
      type: "info",
      title: `⚡ Live AI Engine Active`,
      message: "Live AI operational anomaly detection & risk assessment is active.",
      hint: "Automatic Fallback Guard: If AI service is busy, the built-in offline Pharma Rule Engine takes over automatically without interrupting operations.",
    },
  };
}

/**
 * Gathers current CRM data snapshots across modules
 */
async function gatherCrmDataSnapshot() {
  await dbConnect();

  // 1. Stock & Inventory Snapshot
  const lowStockItems = await Product.find({
    $or: [
      { BALANCE: { $lte: 0 } },
      {
        $expr: {
          $and: [
            { $gt: ["$MINIMUM", 0] },
            { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
          ],
        },
      },
    ],
  })
    .select("CODE PRODUCT GCODE BALANCE MINIMUM MRP")
    .limit(20)
    .lean()
    .catch(() => []);

  // 2. Sales Targets Snapshot
  const activeTargets = await TargetMaster.find({})
    .sort({ createdAt: -1 })
    .limit(15)
    .lean()
    .catch(() => []);

  // 3. Recent Custom Form Submissions (e.g. Field audits, adverse events, doctor feedback)
  const recentSubmissions = await FormSubmission.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
    .catch(() => []);

  return {
    timestamp: new Date().toISOString(),
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.map((p: any) => ({
      id: String(p._id),
      product: p.PRODUCT || p.PNAME || "Product",
      code: p.CODE,
      group: p.GCODE,
      balance: p.BALANCE ?? 0,
      minimum: p.MINIMUM ?? 10,
      mrp: p.MRP,
    })),
    targetsCount: activeTargets.length,
    targets: activeTargets.map((t: any) => ({
      id: String(t._id),
      type: t.targetType,
      mrName: t.mrName,
      customerName: t.customerName,
      period: t.periodMonth,
      targetAmount: t.targetAmount || 0,
      achievedAmount: t.achievedAmount || 0,
    })),
    formSubmissionsCount: recentSubmissions.length,
    formSubmissions: recentSubmissions.map((s: any) => ({
      id: String(s._id),
      formTitle: s.formTitle || "Custom Form",
      status: s.status,
      submittedBy: s.submittedBy?.userName || "Field Rep",
      role: s.submittedBy?.roleType || "MR",
      date: s.createdAt,
      summary: s.data ? Object.entries(s.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ") : "",
    })),
  };
}

/**
 * Fallback Rule-Based Intelligence when Gemini API is offline or quota exceeded
 */
function generateRuleBasedFallbackAlerts(snapshot: any, mode: string): GeneratedAiAlert[] {
  const alerts: GeneratedAiAlert[] = [];

  // Critical out of stock alerts
  const outOfStock = (snapshot.lowStockItems || []).filter((i: any) => i.balance <= 0);
  if (outOfStock.length > 0) {
    const topItem = outOfStock[0];
    alerts.push({
      title: `❌ Critical Stockout: ${topItem.product}`,
      message: `${topItem.product} is completely exhausted (0 balance). Immediate distributor re-order required to prevent lost doctor prescription sales.`,
      suggestedAction: "Generate a Purchase Order immediately in Inventory Management.",
      actionUrl: resolveValidActionUrl("/dashboard/inventory/dashboard", "INVENTORY", "LOW_STOCK"),
      type: "LOW_STOCK",
      category: "INVENTORY",
      severity: "error",
      impactScore: "CRITICAL",
      targetRole: "Admin",
      entityId: topItem.id,
      metadata: { itemCode: topItem.code },
    });
  }

  // Low stock warning
  const lowItems = (snapshot.lowStockItems || []).filter((i: any) => i.balance > 0);
  if (lowItems.length > 0) {
    const item = lowItems[0];
    alerts.push({
      title: `📦 Reorder Warning: ${item.product}`,
      message: `Stock level (${item.balance} units) is below minimum safety buffer (${item.minimum} units).`,
      suggestedAction: "Contact suppliers to re-fill stock before week-end distribution.",
      actionUrl: resolveValidActionUrl("/dashboard/purchase/orders/create", "INVENTORY", "LOW_STOCK"),
      type: "LOW_STOCK",
      category: "INVENTORY",
      severity: "warning",
      impactScore: "HIGH",
      targetRole: "All",
      entityId: item.id,
    });
  }

  // Sales Target Pace Alert
  if (snapshot.targets && snapshot.targets.length > 0) {
    const t = snapshot.targets[0];
    const name = t.mrName || t.customerName || "Representative";
    alerts.push({
      title: `🎯 Monthly Target Active: ${name}`,
      message: `Active target of ₹${(t.targetAmount || 0).toLocaleString("en-IN")} allocated for ${t.period || "current month"}. Track daily progress.`,
      suggestedAction: "Review daily call reports (DCR) and prioritize primary prescriber visits.",
      actionUrl: resolveValidActionUrl("/dashboard/reports/target-vs-actual", "TARGETS", "TARGET_MILESTONE"),
      type: "TARGET_MILESTONE",
      category: "TARGETS",
      severity: "info",
      impactScore: "MEDIUM",
      targetRole: "All",
      entityId: t.id,
    });
  }

  // Form Submissions pending review
  const pendingForms = (snapshot.formSubmissions || []).filter((s: any) => s.status === "Submitted");
  if (pendingForms.length > 0) {
    const f = pendingForms[0];
    alerts.push({
      title: `📋 Field Submission Awaiting Review: ${f.formTitle}`,
      message: `New field report submitted by ${f.submittedBy} (${f.role}) is pending manager sign-off.`,
      suggestedAction: "Open Custom Forms Hub and review the submitted data.",
      actionUrl: resolveValidActionUrl("/dashboard/custom-forms", "CUSTOM_FORMS", "FORM_ALERT"),
      type: "FORM_ALERT",
      category: "CUSTOM_FORMS",
      severity: "info",
      impactScore: "LOW",
      targetRole: "Admin",
      entityId: f.id,
    });
  }

  // Executive Morning Briefing Alert
  if (mode === "morning_briefing") {
    alerts.unshift({
      title: "🌅 MabsolCrm Morning Briefing",
      message: `Operational Snapshot: ${outOfStock.length} stockout risks identified, ${snapshot.targetsCount} active target portfolios, and ${snapshot.formSubmissionsCount} recent field interactions logged.`,
      suggestedAction: "Prioritize clearing stock bottlenecks and review under-visited doctor territories.",
      actionUrl: "/dashboard",
      type: "BRIEFING",
      category: "AI_INSIGHT",
      severity: "info",
      impactScore: "HIGH",
      targetRole: "All",
    });
  }

  return alerts;
}

/**
 * Main AI Notification Scanner
 */
export async function runAiNotificationScan(options: {
  mode?: "full_audit" | "morning_briefing" | "inventory" | "targets" | "forms";
  userId?: string;
  targetRole?: string;
} = {}): Promise<AiScanResult> {
  const mode = options.mode || "full_audit";
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Gather live operational snapshot
  const snapshot = await gatherCrmDataSnapshot();

  let generatedAlerts: GeneratedAiAlert[] = [];
  let modelUsed = "Rule-Based Pharma Engine (Fallback)";
  let summary = "System operational audit completed.";
  let warningMessage: string | undefined;
  let lastErrorMeta: any = null;

  // 2. Query Gemini API if Key is available
  if (apiKey) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];

    const systemPrompt = `You are an elite Chief Operating Officer & AI Intelligence Engine for an Enterprise Pharmaceutical CRM.
Your objective is to analyze the operational snapshot below and identify critical risks, high-priority actions, stock shortages, sales target milestones, and field rep activities.

Snapshot Data:
${JSON.stringify(snapshot, null, 2)}

Strict Instructions:
1. Generate between 4 to 8 high-impact, actionable notifications.
2. Formulate realistic pharmaceutical insights (mentioning actual product names, amounts, or field rep names from the data).
3. STRICT ROUTING RULE: "actionUrl" MUST be strictly chosen from this exact list of valid CRM routes (DO NOT invent other subpaths):
   - "/dashboard/inventory/dashboard" (for stockout, low stock items)
   - "/dashboard/inventory/products" (for catalog or product specification checks)
   - "/dashboard/stock/expiry-liquidator" (for near-expiry batches)
   - "/dashboard/purchase/orders/create" (to draft a purchase order / re-stock)
   - "/dashboard/purchase/dashboard" (for pending vendor purchase shipments)
   - "/dashboard/reports/target-vs-actual" (to review sales target achievement)
   - "/dashboard/targets" (for setting or updating sales targets)
   - "/dashboard/reports/outstanding" (for overdue payments, credit limits)
   - "/dashboard/custom-forms" (for field reports, audit submissions)
   - "/dashboard/mr-reporting" (for doctor visit logs, MR daily call reports)
   - "/dashboard/executive-ai" (for executive revenue & performance forecasting)
   - "/dashboard" (general operational overview)

Ensure every alert has:
- "title": Clean title starting with an appropriate emoji (e.g., 🚨, 📦, 🎯, 📋, 💡)
- "message": Concise diagnostic of what is happening and business impact
- "suggestedAction": Direct, practical next step the user should execute
- "actionUrl": One of the exact URLs from the list above
- "type": One of "AI_INSIGHT", "BRIEFING", "LOW_STOCK", "TARGET_MILESTONE", "FORM_ALERT", "GENERAL"
- "category": One of "INVENTORY", "TARGETS", "CUSTOM_FORMS", "FINANCIAL", "FIELD_FORCE", "AI_INSIGHT"
- "severity": "error" (for critical stockout/overdue), "warning" (for low stock/delay), "info" (general/briefing), "success" (milestones)
- "impactScore": "CRITICAL", "HIGH", "MEDIUM", or "LOW"
- "targetRole": "Admin", "MR", "RSM", or "All"
- "entityId": string (if linked to a specific item or target ID from snapshot)

Return ONLY valid JSON format matching:
{
  "summary": "Executive one-sentence digest of CRM status",
  "alerts": [
    ...
  ]
}`;

    for (const currentModel of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nTask: Generate ${mode === "morning_briefing" ? "a Morning Executive Briefing and top urgent alerts" : "a Comprehensive AI Operational Risk & Growth Scan"}. Return strictly JSON.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const raw = await res.json();
          const responseText = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed.alerts) && parsed.alerts.length > 0) {
              generatedAlerts = parsed.alerts;
              summary = parsed.summary || summary;
              modelUsed = currentModel;
              lastErrorMeta = null;
              break;
            }
          }
        } else {
          const errBody = await res.text();
          console.warn(`Gemini model ${currentModel} returned ${res.status}:`, errBody);
          lastErrorMeta = parseGeminiError(res.status, errBody, currentModel);
          if (res.status === 429) {
            break; // Rate-limited, don't hammer other models
          }
        }
      } catch (err: any) {
        console.warn(`Gemini model ${currentModel} exception:`, err.message);
        lastErrorMeta = {
          title: "Network Connection Issue",
          message: err.message,
          hint: "Switched to built-in rule fallback.",
          status: 0,
          isQuota: false,
        };
      }
    }
  }

  // 3. Fallback if Gemini did not produce alerts
  if (!generatedAlerts || generatedAlerts.length === 0) {
    generatedAlerts = generateRuleBasedFallbackAlerts(snapshot, mode);
    modelUsed = "Rule-Based Pharma Engine (Fallback)";
    if (!apiKey) {
      warningMessage = "AI API Key not configured in .env. Operating on Built-in Pharma Intelligence Engine.";
    } else if (lastErrorMeta?.isQuota) {
      warningMessage = "AI Service rate-limit reached (HTTP 429). Using Built-in Pharma Rule Engine.";
    }
  }

  // 4. Build API Metadata Status
  const apiMeta = getGeminiApiStatus(lastErrorMeta, modelUsed);

  // 5. Clean up any existing legacy invalid URLs currently in MongoDB
  try {
    await Notification.updateMany(
      { actionUrl: "/dashboard/inventory/settings" },
      { $set: { actionUrl: "/dashboard/inventory/dashboard" } }
    );
  } catch {
    // Ignore migration cleanup error
  }

  // 6. Persist to MongoDB Notification Collection & Deduplicate
  let newAlertsCreated = 0;
  try {
    for (const alert of generatedAlerts) {
      const validatedUrl = resolveValidActionUrl(alert.actionUrl, alert.category, alert.type);

      const existing = await Notification.findOne({
        title: alert.title,
        isRead: false,
        createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      });

      if (!existing) {
        if (alert.entityId) {
          const isDismissed = await DismissedAlert.exists({ entityId: alert.entityId });
          if (isDismissed) continue;
        }

        await Notification.create({
          title: alert.title,
          message: alert.message,
          suggestedAction: alert.suggestedAction || "",
          actionUrl: validatedUrl,
          type: (alert.type || "AI_INSIGHT") as any,
          category: (alert.category || "AI_INSIGHT") as any,
          severity: (alert.severity || "info") as any,
          impactScore: (alert.impactScore || "MEDIUM") as any,
          targetRole: (alert.targetRole || "All") as any,
          entityId: alert.entityId || "",
          aiGenerated: true,
          metadata: {
            model: modelUsed,
            scannedAt: new Date(),
            mode,
            tier: apiMeta.tier,
            ...(alert.metadata || {}),
          },
          isRead: false,
        } as any);

        newAlertsCreated++;
      }
    }
  } catch (dbErr: any) {
    console.error("Failed to persist AI notifications to DB:", dbErr);
  }

  return {
    success: true,
    mode,
    modelUsed,
    summary,
    totalAlertsEvaluated: generatedAlerts.length,
    newAlertsCreated,
    apiMeta,
    alerts: generatedAlerts.map(a => ({
      ...a,
      actionUrl: resolveValidActionUrl(a.actionUrl, a.category, a.type),
    })),
    warning: warningMessage,
  };
}
