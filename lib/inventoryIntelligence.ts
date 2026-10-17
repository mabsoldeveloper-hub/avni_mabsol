import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import SalesDis from "@/models/SalesDis";
import Company from "@/models/Company";
import { getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";
import InventoryAlertSetting from "@/models/InventoryAlertSetting";
import InventoryAlertLog from "@/models/InventoryAlertLog";

export type InventoryIntelligenceSettings = {
  tenantId: string;
  companyId: string;
  enabled: boolean;
  recipients: string[];
  nearExpiry: {
    enabled: boolean;
    windowDays: number;
    minStock: number;
  };
  deadStock: {
    enabled: boolean;
    noMovementDays: number;
    minStock: number;
  };
  movement: {
    enabled: boolean;
    analysisDays: number;
    fastStockCoverDays: number;
    slowStockCoverDays: number;
    minSalesQty: number;
  };
  email: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    sendHour: number;
    sendMinute: number;
    weeklyDay: number;
    monthlyDay: number;
    includeNearExpiry: boolean;
    includeDeadStock: boolean;
    includeFastMoving: boolean;
    includeSlowMoving: boolean;
  };
};

const DEFAULT: Omit<InventoryIntelligenceSettings, "tenantId" | "companyId"> = {
  enabled: true,
  recipients: [],
  nearExpiry: {
    enabled: true,
    windowDays: 90,
    minStock: 1,
  },
  deadStock: {
    enabled: true,
    noMovementDays: 180,
    minStock: 1,
  },
  movement: {
    enabled: true,
    analysisDays: 30,
    fastStockCoverDays: 15,
    slowStockCoverDays: 60,
    minSalesQty: 1,
  },
  email: {
    enabled: true,
    frequency: "daily",
    sendHour: 9,
    sendMinute: 0,
    weeklyDay: 1,
    monthlyDay: 1,
    includeNearExpiry: true,
    includeDeadStock: true,
    includeFastMoving: true,
    includeSlowMoving: true,
  },
};

function date(v: any): string | null {
  const s = v ? String(v).slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(s: string, n: number): string {
  const d = new Date(s + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function since(s: string | null, t = today()): number {
  if (!s) return Infinity;
  return Math.floor(
    (new Date(t + "T00:00:00Z").getTime() - new Date(s + "T00:00:00Z").getTime()) / 86400000
  );
}

async function cf(companyId: string, fyId?: string) {
  const sp = new URLSearchParams();
  if (companyId) sp.set("companyId", companyId);
  if (fyId) sp.set("fyId", fyId);
  return getCompanyVfpFilter(sp);
}

export async function getInventorySettings(
  tenantId = "TENANT001",
  companyId = "",
  defaultAdminEmail = ""
): Promise<InventoryIntelligenceSettings> {
  await dbConnect();
  const defaultRecipients = defaultAdminEmail ? [defaultAdminEmail.toLowerCase().trim()] : [];
  if (!companyId) {
    return { ...DEFAULT, recipients: defaultRecipients, tenantId, companyId } as InventoryIntelligenceSettings;
  }
  let d: any = await InventoryAlertSetting.findOne({ tenantId, companyId }).lean();
  if (!d) {
    d = await InventoryAlertSetting.create({
      tenantId,
      companyId,
      ...DEFAULT,
      recipients: defaultRecipients,
    });
  }
  const merged: any = { ...DEFAULT, ...d, tenantId, companyId };

  let recs = Array.isArray(merged.recipients) ? merged.recipients : [];
  if (
    (!recs.length ||
      (recs.length === 1 &&
        recs[0] === "abhishek.mabsolinfotech@gmail.com" &&
        defaultAdminEmail &&
        defaultAdminEmail !== "abhishek.mabsolinfotech@gmail.com")) &&
    defaultAdminEmail
  ) {
    recs = [defaultAdminEmail.toLowerCase().trim()];
    merged.recipients = recs;
  }

  return JSON.parse(JSON.stringify(merged));
}

/**
 * 1. NEAR EXPIRY DATA
 * Fetches batches expiring within windowDays (or custom days parameter)
 */
export async function getNearExpiryData(
  s: InventoryIntelligenceSettings,
  options: {
    q?: string;
    days?: number;
    minStock?: number;
    includeExpired?: boolean;
    fyId?: string;
  } = {}
) {
  await dbConnect();
  const q = String(options.q || "").trim();
  const windowDays = Math.max(1, Number(options.days ?? s.nearExpiry?.windowDays ?? 90));
  const minStock = Math.max(1, Number(options.minStock ?? s.nearExpiry?.minStock ?? 1));
  const includeExpired = Boolean(options.includeExpired ?? true);

  const t = today();
  const u = addDays(t, windowDays);
  const companyMatch = await cf(s.companyId, options.fyId);

  const expFilter = includeExpired
    ? { $lte: u }
    : { $gte: t, $lte: u };

  const f: any = {
    $and: [
      { BALANCE: { $gte: minStock } },
      { EXP: expFilter },
      companyMatch,
    ],
  };

  if (q) {
    f.$and.push({
      $or: [
        { PRODUCT: new RegExp(q, "i") },
        { BATCHNO: new RegExp(q, "i") },
        { BILLNAME: new RegExp(q, "i") },
        { CODE: new RegExp(q, "i") },
      ],
    });
  }

  const rows = await ProductBatch.find(f)
    .sort({ EXP: 1, PRODUCT: 1 })
    .limit(1000)
    .lean();

  const items = rows.map((r: any) => {
    const expStr = date(r.EXP);
    const days = expStr ? Math.round((new Date(expStr + "T00:00:00Z").getTime() - new Date(t + "T00:00:00Z").getTime()) / 86400000) : 0;
    const stock = Number(r.BALANCE || 0);
    const mrp = Number(r.MRP || r.PRATE || 0);
    const totalValue = Number((stock * mrp).toFixed(2));
    const isExpired = days < 0;

    let status: "EXPIRED" | "CRITICAL" | "WARNING" | "ATTENTION" | "SAFE" = "SAFE";
    if (isExpired) status = "EXPIRED";
    else if (days <= 30) status = "CRITICAL";
    else if (days <= 90) status = "WARNING";
    else if (days <= 180) status = "ATTENTION";

    return {
      id: String(r._id),
      code: r.CODE,
      product: r.PRODUCT || r.BILLNAME || "Unknown Product",
      batchNo: r.BATCHNO || "N/A",
      expiry: expStr,
      daysToExpiry: days,
      isExpired,
      status,
      stock,
      mrp,
      totalValue,
    };
  });

  const totalBatches = items.length;
  const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
  const criticalCount = items.filter((item) => item.daysToExpiry <= 30 && !item.isExpired).length;
  const expiredCount = items.filter((item) => item.isExpired).length;

  return {
    items,
    summary: {
      totalBatches,
      totalStock,
      totalValue: Number(totalValue.toFixed(2)),
      criticalCount,
      expiredCount,
      windowDays,
    },
  };
}

/**
 * 2. DEAD / DUMP STOCK DATA
 * Stock with no sales for noMovementDays
 */
export async function getDeadStockData(
  s: InventoryIntelligenceSettings,
  options: {
    q?: string;
    days?: number;
    minStock?: number;
    fyId?: string;
  } = {}
) {
  await dbConnect();
  const q = String(options.q || "").trim().toLowerCase();
  const noMovementDays = Math.max(1, Number(options.days ?? s.deadStock?.noMovementDays ?? 180));
  const minStock = Math.max(1, Number(options.minStock ?? s.deadStock?.minStock ?? 1));

  const companyMatch = await cf(s.companyId, options.fyId);

  const ps: any[] = await Product.find({
    $and: [{ BALANCE: { $gte: minStock } }, companyMatch],
  }).lean();

  const codes = ps.map((p) => Number(p.CODE)).filter(Number.isFinite);

  const ls = await SalesDis.aggregate([
    {
      $match: {
        $and: [{ CODE: { $in: codes } }, { DATE: { $ne: null } }, companyMatch],
      },
    },
    {
      $group: {
        _id: "$CODE",
        lastSale: { $max: "$DATE" },
      },
    },
  ]);

  const map = new Map(ls.map((r: any) => [Number(r._id), r.lastSale]));

  const items = ps
    .map((p: any) => {
      const last = date(map.get(Number(p.CODE)));
      const daysIdle = since(last);
      const stock = Number(p.BALANCE || 0);
      const mrp = Number(p.MRP || p.PRATE || 0);
      const totalValue = Number((stock * mrp).toFixed(2));

      return {
        id: String(p._id),
        code: p.CODE,
        product: p.PRODUCT || p.BILLNAME || "Unknown Product",
        stock,
        mrp,
        totalValue,
        lastSale: last,
        noMovementDays: daysIdle,
      };
    })
    .filter((r) => r.noMovementDays >= noMovementDays)
    .filter(
      (r) =>
        !q ||
        String(r.product).toLowerCase().includes(q) ||
        String(r.code).toLowerCase().includes(q)
    )
    .sort((a, b) => b.noMovementDays - a.noMovementDays)
    .slice(0, 1000);

  const totalProducts = items.length;
  const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

  return {
    items,
    summary: {
      totalProducts,
      totalStock,
      totalValue: Number(totalValue.toFixed(2)),
      thresholdDays: noMovementDays,
    },
  };
}

/**
 * 3. MOVEMENT DATA (Fast / Slow Moving)
 * Classification based on sales velocity and days of stock cover
 */
export async function getMovementData(
  s: InventoryIntelligenceSettings,
  options: {
    q?: string;
    analysisDays?: number;
    fastCoverDays?: number;
    slowCoverDays?: number;
    minSalesQty?: number;
    type?: "ALL" | "FAST" | "SLOW" | "NORMAL";
    fyId?: string;
  } = {}
) {
  await dbConnect();
  const q = String(options.q || "").trim().toLowerCase();
  const analysisDays = Math.max(1, Number(options.analysisDays ?? s.movement?.analysisDays ?? 30));
  const fastStockCoverDays = Number(options.fastCoverDays ?? s.movement?.fastStockCoverDays ?? 15);
  const slowStockCoverDays = Number(options.slowCoverDays ?? s.movement?.slowStockCoverDays ?? 60);
  const minSalesQty = Math.max(1, Number(options.minSalesQty ?? s.movement?.minSalesQty ?? 1));
  const filterType = options.type || "ALL";

  const t = today();
  const from = addDays(t, -analysisDays);
  const companyMatch = await cf(s.companyId, options.fyId);

  const ps: any[] = await Product.find({
    $and: [{ BALANCE: { $gt: 0 } }, companyMatch],
  }).lean();

  const codes = ps.map((p) => Number(p.CODE)).filter(Number.isFinite);

  const rows = await SalesDis.aggregate([
    {
      $match: {
        $and: [
          { CODE: { $in: codes } },
          { DATE: { $gte: from, $lte: t } },
          companyMatch,
        ],
      },
    },
    {
      $group: {
        _id: "$CODE",
        qty: {
          $sum: {
            $convert: { input: "$QTY", to: "double", onError: 0, onNull: 0 },
          },
        },
        lastSale: { $max: "$DATE" },
      },
    },
  ]);

  const map = new Map(rows.map((r: any) => [Number(r._id), r]));

  const allItems = ps
    .map((p: any) => {
      const x = map.get(Number(p.CODE));
      const qty = Number(x?.qty || 0);
      const avg = qty / analysisDays;
      const stock = Number(p.BALANCE || 0);
      const mrp = Number(p.MRP || p.PRATE || 0);
      const totalValue = Number((stock * mrp).toFixed(2));
      const cover = avg > 0 ? stock / avg : Infinity;

      let movement: "FAST" | "SLOW" | "NORMAL" = "NORMAL";
      if (qty >= minSalesQty && cover <= fastStockCoverDays) {
        movement = "FAST";
      } else if (qty >= minSalesQty && cover >= slowStockCoverDays) {
        movement = "SLOW";
      }

      return {
        id: String(p._id),
        code: p.CODE,
        product: p.PRODUCT || p.BILLNAME || "Unknown Product",
        stock,
        mrp,
        totalValue,
        salesQty: qty,
        avgDailySales: Number(avg.toFixed(2)),
        stockCoverDays: Number.isFinite(cover) ? Number(cover.toFixed(1)) : null,
        movement,
        lastSale: date(x?.lastSale),
      };
    })
    .filter(
      (r) =>
        !q ||
        String(r.product).toLowerCase().includes(q) ||
        String(r.code).toLowerCase().includes(q)
    );

  const items =
    filterType === "ALL"
      ? allItems
      : allItems.filter((x) => x.movement === filterType);

  const fastMoving = allItems.filter((x) => x.movement === "FAST");
  const slowMoving = allItems.filter((x) => x.movement === "SLOW");
  const normalMoving = allItems.filter((x) => x.movement === "NORMAL");

  return {
    items,
    summary: {
      totalAnalyzed: allItems.length,
      fastCount: fastMoving.length,
      slowCount: slowMoving.length,
      normalCount: normalMoving.length,
      analysisDays,
    },
    fastMoving,
    slowMoving,
  };
}

/**
 * 4. COMBINED INVENTORY INTELLIGENCE REPORT
 */
export async function buildInventoryReport(
  s: InventoryIntelligenceSettings,
  options: {
    days?: number;
    noMovementDays?: number;
    analysisDays?: number;
  } = {}
) {
  const [nearExpRes, deadStockRes, movementRes] = await Promise.all([
    s.nearExpiry.enabled
      ? getNearExpiryData(s, { days: options.days })
      : Promise.resolve({ items: [], summary: { totalBatches: 0, totalStock: 0, totalValue: 0, criticalCount: 0, expiredCount: 0, windowDays: s.nearExpiry.windowDays } }),
    s.deadStock.enabled
      ? getDeadStockData(s, { days: options.noMovementDays })
      : Promise.resolve({ items: [], summary: { totalProducts: 0, totalStock: 0, totalValue: 0, thresholdDays: s.deadStock.noMovementDays } }),
    s.movement.enabled
      ? getMovementData(s, { analysisDays: options.analysisDays })
      : Promise.resolve({ items: [], summary: { totalAnalyzed: 0, fastCount: 0, slowCount: 0, normalCount: 0, analysisDays: s.movement.analysisDays }, fastMoving: [], slowMoving: [] }),
  ]);

  return {
    nearExpiry: nearExpRes.items,
    nearExpirySummary: nearExpRes.summary,
    deadStock: deadStockRes.items,
    deadStockSummary: deadStockRes.summary,
    fastMoving: movementRes.fastMoving,
    slowMoving: movementRes.slowMoving,
    movementSummary: movementRes.summary,
  };
}

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderHtmlTable(
  title: string,
  badgeText: string,
  badgeBg: string,
  badgeColor: string,
  headers: string[],
  rows: any[][]
): string {
  if (!rows.length) return "";

  return `
    <div style="margin-bottom: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="background: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">
          ${esc(title)}
        </h3>
        <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
          ${esc(badgeText)}
        </span>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569;">
              ${headers
                .map(
                  (h, i) =>
                    `<th style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0; ${
                      i > 1 ? "text-align: center;" : ""
                    }">${esc(h)}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .slice(0, 50)
              .map(
                (r, rowIdx) => `
                <tr style="border-bottom: 1px solid #f1f5f9; ${
                  rowIdx % 2 === 1 ? "background: #fcfcfd;" : ""
                }">
                  ${r
                    .map(
                      (c, i) =>
                        `<td style="padding: 9px 14px; color: #334155; ${
                          i > 1 ? "text-align: center;" : ""
                        }">${esc(c)}</td>`
                    )
                    .join("")}
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${
        rows.length > 50
          ? `<p style="margin: 0; padding: 8px 14px; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0;">Showing top 50 of ${rows.length} items. View the full report in CRM.</p>`
          : ""
      }
    </div>
  `;
}

function periodKey(freq: string, now: Date) {
  const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  if (freq === "daily") return istDateStr;
  if (freq === "monthly") return istDateStr.slice(0, 7); // YYYY-MM
  const d = new Date(istDateStr + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return `week-${d.toISOString().slice(0, 10)}`;
}

/**
 * 5. SEND INVENTORY ALERT EMAIL
 * Dispatches a formatted multi-section email alert to recipients
 */
export async function sendInventoryAlertEmail(
  s: InventoryIntelligenceSettings,
  force = false,
  customRecipients?: string[]
) {
  const targetRecipients = Array.from(
    new Set((customRecipients && customRecipients.length > 0 ? customRecipients : s.recipients).filter(Boolean))
  );

  if (!s.enabled && !force) {
    return { success: false, skipped: true, reason: "Inventory Intelligence is disabled in settings" };
  }
  if (!s.email.enabled && !force) {
    return { success: false, skipped: true, reason: "Email schedule is disabled in settings" };
  }
  if (!targetRecipients.length) {
    return { success: false, skipped: true, reason: "No email recipients configured" };
  }

  const r = await buildInventoryReport(s);

  const sections: string[] = [];
  if (s.email.includeNearExpiry && r.nearExpiry.length) sections.push("Near Expiry");
  if (s.email.includeDeadStock && r.deadStock.length) sections.push("Dead / Dump Stock");
  if (s.email.includeFastMoving && r.fastMoving.length) sections.push("Fast Moving");
  if (s.email.includeSlowMoving && r.slowMoving.length) sections.push("Slow Moving");

  if (!sections.length && !force) {
    return { success: true, skipped: true, reason: "No alert items matching current thresholds" };
  }

  const now = new Date();
  const runKey = force
    ? `MANUAL-${now.getTime()}`
    : `${s.email.frequency}:${periodKey(s.email.frequency, now)}`;

  if (
    !force &&
    (await InventoryAlertLog.findOne({
      tenantId: s.tenantId,
      companyId: s.companyId,
      runKey,
    }).lean())
  ) {
    return {
      success: true,
      skipped: true,
      reason: "Already sent for this period",
      runKey,
    };
  }

  // Fetch active legal company name dynamically
  let senderCompanyName = "";
  try {
    if (s.companyId) {
      const compDoc: any = await Company.findById(s.companyId).lean();
      if (compDoc?.companyName) senderCompanyName = compDoc.companyName.trim();
    }
    if (!senderCompanyName) {
      const headOfficeComp: any =
        (await Company.findOne({ isHeadOffice: true }).lean()) ||
        (await Company.findOne().lean());
      if (headOfficeComp?.companyName) senderCompanyName = headOfficeComp.companyName.trim();
    }
  } catch (e) {}

  if (!senderCompanyName) {
    senderCompanyName = "Mabsol Infotech Private Limited";
  }

  const nearExpiryTableHtml = s.email.includeNearExpiry
    ? renderHtmlTable(
        "🔴 Near Expiry Batches",
        `${r.nearExpiry.length} Batches (₹${r.nearExpirySummary.totalValue.toLocaleString("en-IN")})`,
        "#fef2f2",
        "#b91c1c",
        ["Product Name", "Batch", "Expiry Date", "Days Left", "Stock Units", "MRP (₹)", "Total Value (₹)"],
        r.nearExpiry.map((x: any) => [
          x.product,
          x.batchNo,
          x.expiry || "N/A",
          x.isExpired ? "EXPIRED" : `${x.daysToExpiry} Days`,
          x.stock.toLocaleString("en-IN"),
          `₹${x.mrp.toLocaleString("en-IN")}`,
          `₹${x.totalValue.toLocaleString("en-IN")}`,
        ])
      )
    : "";

  const deadStockTableHtml = s.email.includeDeadStock
    ? renderHtmlTable(
        "⚠️ Dead / Dump Stock (No Movement)",
        `${r.deadStock.length} Products (₹${r.deadStockSummary.totalValue.toLocaleString("en-IN")})`,
        "#fff7ed",
        "#c2410c",
        ["Product Name", "Product Code", "Stock Balance", "Last Sale Date", "Days Idle", "Total Value (₹)"],
        r.deadStock.map((x: any) => [
          x.product,
          x.code,
          x.stock.toLocaleString("en-IN"),
          x.lastSale || "Never Sold",
          x.noMovementDays === Infinity ? "Never" : `${x.noMovementDays} Days`,
          `₹${x.totalValue.toLocaleString("en-IN")}`,
        ])
      )
    : "";

  const fastMovingTableHtml = s.email.includeFastMoving
    ? renderHtmlTable(
        "🟢 Fast Moving Products (High Velocity)",
        `${r.fastMoving.length} Products`,
        "#ecfdf5",
        "#047857",
        ["Product Name", "Current Stock", "Period Sales", "Avg / Day", "Stock Cover (Days)"],
        r.fastMoving.map((x: any) => [
          x.product,
          x.stock.toLocaleString("en-IN"),
          x.salesQty.toLocaleString("en-IN"),
          x.avgDailySales.toFixed(2),
          x.stockCoverDays ? `${x.stockCoverDays} Days` : "Instant Run-out",
        ])
      )
    : "";

  const slowMovingTableHtml = s.email.includeSlowMoving
    ? renderHtmlTable(
        "🟡 Slow Moving Products (Overstocked)",
        `${r.slowMoving.length} Products`,
        "#fefce8",
        "#a16207",
        ["Product Name", "Current Stock", "Period Sales", "Avg / Day", "Stock Cover (Days)"],
        r.slowMoving.map((x: any) => [
          x.product,
          x.stock.toLocaleString("en-IN"),
          x.salesQty.toLocaleString("en-IN"),
          x.avgDailySales.toFixed(2),
          x.stockCoverDays ? `${x.stockCoverDays} Days` : "∞",
        ])
      )
    : "";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.08);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); color: #ffffff; padding: 28px 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a5b4fc; font-weight: 700; margin-bottom: 6px;">
              ⚡ INVENTORY INTELLIGENCE ALERT DISPATCH
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
              ${esc(senderCompanyName)} — Stock Risk & Movement Report
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #cbd5e1;">
              Automated inventory analysis generated on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          </div>

          <!-- Summary Metric Ribbon -->
          <div style="background: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">Near Expiry</div>
              <div style="font-size: 20px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${r.nearExpiry.length}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Batches</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">Dead Stock</div>
              <div style="font-size: 20px; font-weight: 800; color: #c2410c; margin-top: 4px;">${r.deadStock.length}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Stuck Products</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">Fast Moving</div>
              <div style="font-size: 20px; font-weight: 800; color: #047857; margin-top: 4px;">${r.fastMoving.length}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">High Velocity</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">Slow Moving</div>
              <div style="font-size: 20px; font-weight: 800; color: #a16207; margin-top: 4px;">${r.slowMoving.length}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Overstocked</div>
            </div>
          </div>

          <!-- Content Body -->
          <div style="padding: 24px;">
            ${nearExpiryTableHtml}
            ${deadStockTableHtml}
            ${fastMovingTableHtml}
            ${slowMovingTableHtml}
            ${
              !nearExpiryTableHtml && !deadStockTableHtml && !fastMovingTableHtml && !slowMovingTableHtml
                ? `<div style="padding: 32px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600;">✅ Great news! No inventory risks currently breached your configured thresholds.</p>
                  </div>`
                : ""
            }
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span>${esc(senderCompanyName)} ERP & CRM Intelligence Daemon</span>
            </div>
            <div>
              <span>Delivered to: ${esc(targetRecipients.join(", "))}</span>
            </div>
          </div>

        </div>
      </body>
    </html>
  `;

  const config = await NotificationGatewayService.getConfig(s.tenantId, s.companyId);
  const results = [];

  const subject = `⚠️ [Inventory Alert] ${senderCompanyName}: ${sections.join(" & ") || "Status Summary"} (${new Date().toLocaleDateString("en-IN")})`;

  for (const to of targetRecipients) {
    const res = await NotificationGatewayService.sendEmail({
      to,
      subject,
      html: emailHtml,
      text: `Inventory Alert for ${senderCompanyName}. Sections: ${sections.join(", ")}. Please view HTML email.`,
      config,
    });
    results.push(res);
  }

  const success = results.some((x) => x.success);

  await InventoryAlertLog.create({
    tenantId: s.tenantId,
    companyId: s.companyId,
    runKey,
    recipients: targetRecipients,
    sections,
    counts: {
      nearExpiry: r.nearExpiry.length,
      deadStock: r.deadStock.length,
      fastMoving: r.fastMoving.length,
      slowMoving: r.slowMoving.length,
    },
    success,
    error: results.filter((x) => !x.success).map((x) => x.error).join("; "),
  });

  await InventoryAlertSetting.updateOne(
    { tenantId: s.tenantId, companyId: s.companyId },
    {
      $set: {
        lastRunAt: new Date(),
        ...(success ? { lastSentAt: new Date() } : {}),
      },
    }
  );

  return {
    success,
    runKey,
    counts: {
      nearExpiry: r.nearExpiry.length,
      deadStock: r.deadStock.length,
      fastMoving: r.fastMoving.length,
      slowMoving: r.slowMoving.length,
    },
    results,
  };
}

function indiaParts(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    day: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value || "0";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    day: dayNames.indexOf(get("weekday")),
    date: Number(get("day")),
  };
}

export function shouldRunNow(s: InventoryIntelligenceSettings, now = new Date()) {
  if (!s.enabled || !s.email.enabled) return false;
  if (!s.recipients || s.recipients.length === 0) return false;
  const p = indiaParts(now);

  const currMins = p.hour * 60 + p.minute;
  const targetMins = s.email.sendHour * 60 + s.email.sendMinute;
  const diffMins = currMins - targetMins;

  // Run only when current time is at or after target time, within a 15-minute catch-up window
  if (diffMins < 0 || diffMins > 15) return false;

  if (s.email.frequency === "weekly" && p.day !== s.email.weeklyDay) return false;
  if (s.email.frequency === "monthly" && p.date !== s.email.monthlyDay) return false;
  return true;
}
