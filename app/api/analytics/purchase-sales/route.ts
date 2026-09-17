import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { combineFilters, getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseReturn from "@/models/PurchaseReturn";
import PurchaseOrder from "@/models/PurchaseOrder";
import GLedger from "@/models/GLedger";
import Category from "@/models/Category";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";
import Product from "@/models/Product";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clean = (value: any) => String(value ?? "").trim();

const unique = (values: any[]) =>
  Array.from(new Set(values.map((v) => clean(v)).filter(Boolean)));

function sumFinalExpression(field = "FINAL") {
  return {
    $cond: [
      {
        $gt: [
          { $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } },
          0,
        ],
      },
      { $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } },
      {
        $add: [
          { $convert: { input: "$AMOUNTT", to: "double", onError: 0, onNull: 0 } },
          { $convert: { input: "$TAXAMO", to: "double", onError: 0, onNull: 0 } },
        ],
      },
    ],
  };
}

async function sumField(model: any, match: Record<string, any>, field = "FINAL") {
  const [row] = await model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: sumFinalExpression(field) } } },
  ]);
  return toNumber(row?.total);
}

function buildHierarchyVfpFilter(access: Awaited<ReturnType<typeof getHierarchyAccess>>) {
  if (access.isAdmin) return {};
  if (!access.isAuthenticated) return { _id: null };

  const names = unique(access.accessibleUserNames);
  const employeeCodes = unique(access.accessibleUsers.map((u: any) => u.employeeCode));
  const customerCodes = unique(access.assignedCustomerCodes);

  const conditions: any[] = [];

  // Legacy VFP transaction rows carry hierarchy names/codes directly.
  if (names.length) {
    conditions.push(
      { MR: { $in: names } },
      { ASM: { $in: names } },
      { RSM: { $in: names } },
      { ZSM: { $in: names } },
      { DSM: { $in: names } },
      { SALESMAN: { $in: names } },
    );
  }

  if (employeeCodes.length) {
    conditions.push(
      { MR: { $in: employeeCodes } },
      { DSM: { $in: employeeCodes } },
      { employeeCode: { $in: employeeCodes } },
    );
  }

  // MR party assignments are stored as customer/party codes.
  if (customerCodes.length) {
    conditions.push(
      { CODEP: { $in: customerCodes } },
      { CODE: { $in: customerCodes } },
      { ORDNO: { $in: customerCodes } },
    );
  }

  return conditions.length ? { $or: conditions } : { _id: null };
}

function buildWebPartyFilter(access: Awaited<ReturnType<typeof getHierarchyAccess>>, prefix = "") {
  if (access.isAdmin) return {};
  if (!access.isAuthenticated) return { _id: null };

  const names = unique(access.accessibleUserNames);
  const codes = unique(access.assignedCustomerCodes);
  const fields = [
    `${prefix}vendorCode`,
    `${prefix}vendorId`,
    `${prefix}vendorName`,
    `${prefix}createdBy`,
  ];
  const conditions: any[] = [];

  if (codes.length) {
    conditions.push(
      { [fields[0]]: { $in: codes } },
      { [fields[1]]: { $in: codes } },
    );
  }
  if (names.length) conditions.push({ [fields[2]]: { $in: names } });

  // If no party assignment exists, do not expose all supplier transactions.
  return conditions.length ? { $or: conditions } : { _id: null };
}

function buildPurchasePaymentFilter(paymentStatus: string) {
  if (!paymentStatus || paymentStatus === "ALL") return {};
  const normalized = paymentStatus.trim().toLowerCase();
  if (normalized === "paid") return { paymentStatus: "Paid" };
  if (normalized === "partial" || normalized === "partially paid") return { paymentStatus: "Partial" };
  if (normalized === "pending" || normalized === "unpaid") return { paymentStatus: "Pending" };
  return {};
}

function rangeDates(range: string, now = new Date()) {
  let startDateStr = "";
  let endDateStr = "";

  if (range === "today") {
    startDateStr = now.toISOString().slice(0, 10);
    endDateStr = startDateStr;
  } else if (range === "7days") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    startDateStr = d.toISOString().slice(0, 10);
    endDateStr = now.toISOString().slice(0, 10);
  } else if (range === "this_month") {
    startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    endDateStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  } else if (range === "this_quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    startDateStr = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
    endDateStr = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().slice(0, 10);
  } else if (range === "12months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startDateStr = start.toISOString().slice(0, 10);
    endDateStr = end.toISOString().slice(0, 10);
  }

  return { startDateStr, endDateStr };
}

function actualMovingAverage(values: number[], index: number, window = 3) {
  const start = Math.max(0, index - window + 1);
  const slice = values.slice(start, index + 1);
  return slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : 0;
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const access = await getHierarchyAccess();
    if (!access.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const range = searchParams.get("range") || "this_fy";
    const companyIdParam = searchParams.get("companyId") || "ALL";
    const fyIdParam = searchParams.get("fyId") || "ALL";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const categoryFilter = searchParams.get("category") || "ALL";

    const fyRange = await getFYDateRange(searchParams);
    let startDateStr = fyRange.startDate || "";
    let endDateStr = fyRange.endDate || "";

    if (range === "custom") {
      const s = searchParams.get("startDate");
      const e = searchParams.get("endDate");
      if (s && e) {
        startDateStr = s.slice(0, 10);
        endDateStr = e.slice(0, 10);
      }
    } else if (range !== "this_fy") {
      const short = rangeDates(range);
      if (short.startDateStr && short.endDateStr) {
        startDateStr = short.startDateStr;
        endDateStr = short.endDateStr;
      }
    }

    if (!startDateStr || !endDateStr) {
      const now = new Date();
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      startDateStr = `${fyStartYear}-04-01`;
      endDateStr = `${fyStartYear + 1}-03-31`;
    }

    const companyVfpFilter = await getCompanyVfpFilter(searchParams);
    const hierarchyVfpFilter = buildHierarchyVfpFilter(access);
    const mdisDateMatch = buildFYDateQuery("DATE", startDateStr, endDateStr);
    const purchaseBillDateMatch = buildFYDateQuery("billDate", startDateStr, endDateStr);
    const purchaseReturnDateMatch = buildFYDateQuery("returnDate", startDateStr, endDateStr);
    const purchaseOrderDateMatch = buildFYDateQuery("poDate", startDateStr, endDateStr);
    const gledgerDateMatch = buildFYDateQuery("DATE", startDateStr, endDateStr);

    const companyFilter: any = {};
    if (companyIdParam !== "ALL" && mongoose.Types.ObjectId.isValid(companyIdParam)) {
      companyFilter.companyId = companyIdParam;
    }

    let categoryMatch: any = {};
    if (categoryFilter !== "ALL") {
      const safe = String(categoryFilter).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      categoryMatch = {
        $or: [
          { GCODE: categoryFilter },
          { GNAME: new RegExp(safe, "i") },
          { CATNAME: new RegExp(safe, "i") },
          { category: new RegExp(safe, "i") },
        ],
      };
    }

    const mdisSaleFilter = combineFilters(
      { TYPE: "S" },
      companyVfpFilter,
      hierarchyVfpFilter,
      mdisDateMatch,
      categoryMatch,
    );
    const mdisPurchaseFilter = combineFilters(
      { TYPE: { $in: ["P", "PURCHASE"] } },
      companyVfpFilter,
      hierarchyVfpFilter,
      mdisDateMatch,
      categoryMatch,
    );
    const mdisSaleReturnFilter = combineFilters(
      { TYPE: { $in: ["SR", "R", "RETURN"] } },
      companyVfpFilter,
      hierarchyVfpFilter,
      mdisDateMatch,
    );
    const mdisPurchaseReturnFilter = combineFilters(
      { TYPE: { $in: ["D", "PR", "DEBIT"] } },
      companyVfpFilter,
      hierarchyVfpFilter,
      mdisDateMatch,
    );

    const webPurchaseFilter = combineFilters(
      companyFilter,
      purchaseBillDateMatch,
      buildWebPartyFilter(access),
      buildPurchasePaymentFilter(paymentStatus),
    );
    const webPurchaseReturnFilter = combineFilters(
      companyFilter,
      purchaseReturnDateMatch,
      buildWebPartyFilter(access),
    );
    const purchaseOrderFilter = combineFilters(
      companyFilter,
      purchaseOrderDateMatch,
      buildWebPartyFilter(access),
      { status: { $ne: "Cancelled" } },
    );
    const gledgerPartyFilter = (() => {
      if (access.isAdmin) return {};
      if (!access.isAuthenticated) return { _id: null };
      const codes = unique(access.assignedCustomerCodes);
      if (!codes.length) return { _id: null };
      return { $or: [{ CODE: { $in: codes } }, { CODE1: { $in: codes } }] };
    })();

    // ───────────────────────────────────────────────────────────────────────
    // 1. Core totals — all values come from stored transactions.
    // ───────────────────────────────────────────────────────────────────────
    const [
      salesVal,
      saleReturnsVal,
      vfpPurchasesVal,
      webPurchasesAgg,
      vfpPurchaseReturnsVal,
      webPurchaseReturnsAgg,
    ] = await Promise.all([
      sumField(SalesMdis, mdisSaleFilter),
      sumField(SalesMdis, mdisSaleReturnFilter),
      sumField(SalesMdis, mdisPurchaseFilter),
      PurchaseBill.aggregate([
        { $match: webPurchaseFilter },
        { $group: { _id: null, total: { $sum: { $convert: { input: "$netAmount", to: "double", onError: 0, onNull: 0 } } } } },
      ]),
      sumField(SalesMdis, mdisPurchaseReturnFilter),
      PurchaseReturn.aggregate([
        { $match: webPurchaseReturnFilter },
        { $group: { _id: null, total: { $sum: { $convert: { input: "$netAmount", to: "double", onError: 0, onNull: 0 } } } } },
      ]),
    ]);

    const totalSales = Math.round(salesVal);
    const totalSaleReturns = Math.round(saleReturnsVal);
    const totalPurchases = Math.round(vfpPurchasesVal + toNumber(webPurchasesAgg[0]?.total));
    const totalPurchaseReturns = Math.round(vfpPurchaseReturnsVal + toNumber(webPurchaseReturnsAgg[0]?.total));

    const netSales = totalSales - totalSaleReturns;
    const netPurchases = totalPurchases - totalPurchaseReturns;
    const grossProfit = netSales - netPurchases;
    const grossMarginPercent = netSales !== 0 ? Math.round((grossProfit / netSales) * 1000) / 10 : 0;
    const purchaseUtilizationRate = totalPurchases > 0 ? Math.round((totalSales / totalPurchases) * 1000) / 10 : 0;

    // ───────────────────────────────────────────────────────────────────────
    // 2. Monthly trend — actual monthly values, plus a real 3-month average.
    // ───────────────────────────────────────────────────────────────────────
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const fyMonthNumbers = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    const salesMonthMap = new Map<number, number>();
    const purchaseMonthMap = new Map<number, number>();

    const [salesMonthly, purchaseMonthly] = await Promise.all([
      SalesMdis.aggregate([
        { $match: mdisSaleFilter },
        { $group: { _id: { $substr: ["$DATE", 5, 2] }, total: { $sum: sumFinalExpression() } } },
      ]),
      SalesMdis.aggregate([
        { $match: mdisPurchaseFilter },
        { $group: { _id: { $substr: ["$DATE", 5, 2] }, total: { $sum: sumFinalExpression() } } },
      ]),
    ]);

    salesMonthly.forEach((row: any) => {
      const month = Number(row._id);
      if (month >= 1 && month <= 12) salesMonthMap.set(month, toNumber(row.total));
    });
    purchaseMonthly.forEach((row: any) => {
      const month = Number(row._id);
      if (month >= 1 && month <= 12) purchaseMonthMap.set(month, toNumber(row.total));
    });

    const rawSales = fyMonthNumbers.map((m) => Math.round(salesMonthMap.get(m) || 0));
    const rawPurchases = fyMonthNumbers.map((m) => Math.round(purchaseMonthMap.get(m) || 0));

    const dualTrendData = monthNames.map((month, idx) => {
      const sales = rawSales[idx];
      const purchases = rawPurchases[idx];
      const netSpread = sales - purchases;
      return {
        month,
        sales,
        purchases,
        netSpread,
        salesMovingAvg: actualMovingAverage(rawSales, idx),
        purchaseMovingAvg: actualMovingAverage(rawPurchases, idx),
        profitMargin: sales !== 0 ? Math.round(((sales - purchases) / Math.abs(sales)) * 1000) / 10 : 0,
      };
    });

    // ───────────────────────────────────────────────────────────────────────
    // 3. Category data — no estimated/fabricated purchase percentage.
    //    Sales categories come from DIS + Product master. Web purchase lines
    //    are included only when a category is explicitly stored on the line.
    // ───────────────────────────────────────────────────────────────────────
    const [categoryAgg, purchaseCategoryAgg] = await Promise.all([
      SalesDis.aggregate([
        { $match: combineFilters(companyVfpFilter, hierarchyVfpFilter, mdisDateMatch, categoryMatch) },
        {
          $group: {
            _id: { $ifNull: ["$GCODE", { $ifNull: ["$GNAME", "$GROUP"] }] },
            saleAmount: { $sum: { $convert: { input: "$AMMMOUNT", to: "double", onError: 0, onNull: 0 } } },
            qty: { $sum: { $convert: { input: "$QTY", to: "double", onError: 0, onNull: 0 } } },
          },
        },
        { $sort: { saleAmount: -1 } },
        { $limit: 12 },
      ]),
      SalesMdis.aggregate([
        { $match: mdisPurchaseFilter },
        {
          $group: {
            _id: { $ifNull: ["$GCODE", { $ifNull: ["$GNAME", "$CATNAME"] }] },
            purchaseAmount: { $sum: sumFinalExpression() },
          },
        },
        { $sort: { purchaseAmount: -1 } },
        { $limit: 12 },
      ]),
    ]);

    const categoryDocs = await Category.find({}, { categoryCode: 1, categoryName: 1 }).lean().catch(() => []);
    const categoryNameByCode = new Map(
      categoryDocs.map((c: any) => [clean(c.categoryCode).toUpperCase(), clean(c.categoryName)])
    );

    const salesCategoryRows = categoryAgg
      .filter((r: any) => r._id && toNumber(r.saleAmount) !== 0)
      .map((r: any) => {
        const code = clean(r._id);
        const name = categoryNameByCode.get(code.toUpperCase()) || code || "Uncategorized";
        return { categoryName: name, categoryCode: code, saleAmount: Math.round(toNumber(r.saleAmount)), qty: toNumber(r.qty) };
      });

    const purchaseCategoryRows = purchaseCategoryAgg
      .filter((r: any) => r._id && toNumber(r.purchaseAmount) !== 0)
      .map((r: any) => {
        const code = clean(r._id);
        const name = categoryNameByCode.get(code.toUpperCase()) || code || "Uncategorized";
        return { categoryName: name, purchaseAmount: Math.round(toNumber(r.purchaseAmount)) };
      });

    const webPurchaseCategoryRows: any[] = [];
    const webPurchaseDocs = await PurchaseBill.find(webPurchaseFilter, { items: 1 }).lean().catch(() => []);
    for (const bill of webPurchaseDocs as any[]) {
      const items = Array.isArray(bill.items) ? bill.items : Object.values(bill.items || {});
      for (const item of items as any[]) {
        const category = clean(item?.categoryName || item?.category || item?.categoryCode);
        if (!category) continue;
        webPurchaseCategoryRows.push({
          categoryName: category,
          purchaseAmount: toNumber(item?.total || item?.taxableAmount),
        });
      }
    }

    const catMap = new Map<string, any>();
    for (const row of salesCategoryRows) {
      const key = row.categoryName.toUpperCase();
      catMap.set(key, {
        categoryName: row.categoryName,
        purchaseAmount: 0,
        saleAmount: row.saleAmount,
        grossMargin: row.saleAmount ? 0 : 0,
      });
    }
    for (const row of purchaseCategoryRows) {
      const key = row.categoryName.toUpperCase();
      const existing = catMap.get(key) || { categoryName: row.categoryName, purchaseAmount: 0, saleAmount: 0, grossMargin: 0 };
      existing.purchaseAmount += toNumber(row.purchaseAmount);
      catMap.set(key, existing);
    }
    for (const row of webPurchaseCategoryRows) {
      const key = row.categoryName.toUpperCase();
      const existing = catMap.get(key) || { categoryName: row.categoryName, purchaseAmount: 0, saleAmount: 0, grossMargin: 0 };
      existing.purchaseAmount += toNumber(row.purchaseAmount);
      catMap.set(key, existing);
    }

    const categoriesData = Array.from(catMap.values())
      .map((row: any) => ({
        ...row,
        purchaseAmount: Math.round(row.purchaseAmount),
        saleAmount: Math.round(row.saleAmount),
        grossMargin: row.saleAmount ? Math.round(((row.saleAmount - row.purchaseAmount) / Math.abs(row.saleAmount)) * 1000) / 10 : 0,
      }))
      .sort((a, b) => (b.saleAmount + b.purchaseAmount) - (a.saleAmount + a.purchaseAmount))
      .slice(0, 6);

    // ───────────────────────────────────────────────────────────────────────
    // 4. Product treemap — real sales volume and cost-based margin where the
    //    Product master contains PRATE. No Math.random and no sample products.
    // ───────────────────────────────────────────────────────────────────────
    const topProductAgg = await SalesDis.aggregate([
      { $match: combineFilters(companyVfpFilter, hierarchyVfpFilter, mdisDateMatch, categoryMatch) },
      {
        $group: {
          _id: "$CODE",
          salesVolume: { $sum: { $convert: { input: "$AMMMOUNT", to: "double", onError: 0, onNull: 0 } } },
          qty: { $sum: { $convert: { input: "$QTY", to: "double", onError: 0, onNull: 0 } } },
          categoryCode: { $first: { $ifNull: ["$GCODE", ""] } },
        },
      },
      { $sort: { salesVolume: -1 } },
      { $limit: 10 },
    ]);

    const numericCodes = topProductAgg.map((r: any) => Number(r._id)).filter((n) => Number.isFinite(n));
    const stringCodes = topProductAgg.map((r: any) => clean(r._id)).filter(Boolean);
    const productDocs = await Product.find({
      $or: [
        ...(numericCodes.length ? [{ CODE: { $in: numericCodes } }] : []),
        ...(stringCodes.length ? [{ CODE: { $in: stringCodes } }] : []),
      ],
    }, { CODE: 1, PRODUCT: 1, BILLNAME: 1, PRATE: 1, GCODE: 1 }).lean().catch(() => []);

    const productByCode = new Map<string, any>();
    for (const p of productDocs as any[]) productByCode.set(clean(p.CODE), p);

    const treemapItemsData = topProductAgg
      .filter((r: any) => toNumber(r.salesVolume) !== 0)
      .map((r: any) => {
        const code = clean(r._id);
        const p = productByCode.get(code);
        const salesVolume = toNumber(r.salesVolume);
        const qty = toNumber(r.qty);
        const cost = p ? qty * toNumber(p.PRATE) : 0;
        const profitMargin = salesVolume !== 0 && p ? Math.round(((salesVolume - cost) / Math.abs(salesVolume)) * 1000) / 10 : 0;
        const categoryCode = clean(p?.GCODE || r.categoryCode);
        return {
          name: clean(p?.PRODUCT || p?.BILLNAME) || `Item ${code}`,
          salesVolume: Math.round(salesVolume),
          profitMargin,
          category: categoryNameByCode.get(categoryCode.toUpperCase()) || categoryCode || "Uncategorized",
          code,
        };
      });

    // ───────────────────────────────────────────────────────────────────────
    // 5. Payments/collections — based on stored CASH / GLEDGER / PurchaseBill
    //    values. We do not invent payment-mode percentages.
    // ───────────────────────────────────────────────────────────────────────
    const [salesPaymentRows, purchasePaymentRows, collectionAgg, poAgg, salesVoucherAgg, dispatchedAgg] = await Promise.all([
      SalesMdis.aggregate([
        { $match: mdisSaleFilter },
        {
          $group: {
            _id: null,
            total: { $sum: sumFinalExpression() },
            cash: { $sum: { $convert: { input: "$CASH", to: "double", onError: 0, onNull: 0 } } },
          },
        },
      ]),
      PurchaseBill.aggregate([
        { $match: webPurchaseFilter },
        {
          $group: {
            _id: null,
            paid: { $sum: { $convert: { input: "$paidAmount", to: "double", onError: 0, onNull: 0 } } },
            balance: { $sum: { $convert: { input: "$balanceAmount", to: "double", onError: 0, onNull: 0 } } },
          },
        },
      ]),
      GLedger.aggregate([
        { $match: combineFilters(gledgerDateMatch, companyVfpFilter, gledgerPartyFilter, { BOOK: "R", CD: "C" }) },
        { $group: { _id: null, total: { $sum: { $convert: { input: "$CREDIT", to: "double", onError: 0, onNull: 0 } } } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: purchaseOrderFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: { $convert: { input: "$netTotal", to: "double", onError: 0, onNull: 0 } } },
          },
        },
      ]),
      SalesMdis.aggregate([
        { $match: mdisSaleFilter },
        { $group: { _id: "$VCN", amount: { $sum: sumFinalExpression() } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
      SalesDis.aggregate([
        { $match: combineFilters(companyVfpFilter, hierarchyVfpFilter, mdisDateMatch, categoryMatch) },
        { $group: { _id: "$VCN", amount: { $sum: { $convert: { input: "$AMMMOUNT", to: "double", onError: 0, onNull: 0 } } } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
    ]);

    const salesTotalStored = toNumber(salesPaymentRows[0]?.total);
    const salesCash = Math.max(0, Math.min(salesTotalStored, toNumber(salesPaymentRows[0]?.cash)));
    const salesNonCash = Math.max(0, salesTotalStored - salesCash);
    const purchasePaid = Math.max(0, toNumber(purchasePaymentRows[0]?.paid));
    const purchaseBalance = Math.max(0, toNumber(purchasePaymentRows[0]?.balance));
    const collections = toNumber(collectionAgg[0]?.total);

    const salesPaymentBreakdown = [
      { mode: "Cash", value: Math.round(salesCash), color: "#10b981" },
      { mode: "Credit / Other", value: Math.round(salesNonCash), color: "#3b82f6" },
    ].filter((x) => x.value > 0);

    const purchasePaymentBreakdown = [
      { mode: "Paid", value: Math.round(purchasePaid), color: "#10b981" },
      { mode: "Outstanding", value: Math.round(purchaseBalance), color: "#f59e0b" },
    ].filter((x) => x.value > 0);

    // ───────────────────────────────────────────────────────────────────────
    // 6. Trade funnel — actual counts/amounts available in the database.
    // ───────────────────────────────────────────────────────────────────────
    const poCount = toNumber(poAgg[0]?.count);
    const poAmount = Math.round(toNumber(poAgg[0]?.amount));
    const purchaseBillCount = await PurchaseBill.countDocuments(webPurchaseFilter).catch(() => 0);
    const purchaseInwardAmount = Math.round(toNumber(webPurchasesAgg[0]?.total));
    const invoiceCount = toNumber(salesVoucherAgg[0]?.count);
    const invoiceAmount = Math.round(toNumber(salesVoucherAgg[0]?.amount));
    const dispatchedCount = toNumber(dispatchedAgg[0]?.count);
    const dispatchedAmount = Math.round(toNumber(dispatchedAgg[0]?.amount));

    const funnelBase = Math.max(poAmount, purchaseInwardAmount, invoiceAmount, dispatchedAmount, collections, Math.abs(grossProfit), 0);
    const funnelPct = (amount: number) => funnelBase > 0 ? Math.round((Math.abs(amount) / funnelBase) * 100) : 0;

    const tradeFunnelData = [
      { stage: "Purchase Orders Raised", amount: poAmount, count: poCount, percentage: funnelPct(poAmount) },
      { stage: "Stock Inward Receipts", amount: purchaseInwardAmount, count: purchaseBillCount, percentage: funnelPct(purchaseInwardAmount) },
      { stage: "Quotation & Invoices", amount: invoiceAmount, count: invoiceCount, percentage: funnelPct(invoiceAmount) },
      { stage: "Dispatched Sales Volume", amount: dispatchedAmount, count: dispatchedCount, percentage: funnelPct(dispatchedAmount) },
      { stage: "Realized Net Collections", amount: Math.round(collections), count: collections > 0 ? 1 : 0, percentage: funnelPct(collections) },
      { stage: "Retained Profit Value", amount: Math.round(grossProfit), count: grossProfit !== 0 ? 1 : 0, percentage: funnelPct(grossProfit) },
    ];

    // Radar is generated from the same actual category rows. Values are
    // normalized only for chart scale; no hard-coded business scores.
    const radarSource = categoriesData.slice(0, 5);
    const maxSales = Math.max(...radarSource.map((x: any) => Math.abs(x.saleAmount)), 1);
    const maxPurchase = Math.max(...radarSource.map((x: any) => Math.abs(x.purchaseAmount)), 1);
    const categoryRadarData = [
      {
        metric: "Sales Volume",
        ...Object.fromEntries(radarSource.map((x: any) => [x.categoryName, Math.round((Math.abs(x.saleAmount) / maxSales) * 100)])),
      },
      {
        metric: "Purchase Spend",
        ...Object.fromEntries(radarSource.map((x: any) => [x.categoryName, Math.round((Math.abs(x.purchaseAmount) / maxPurchase) * 100)])),
      },
      {
        metric: "Gross Margin %",
        ...Object.fromEntries(radarSource.map((x: any) => [x.categoryName, Math.max(0, Math.min(100, Number(x.grossMargin) || 0))])),
      },
      {
        metric: "Low Return %",
        ...Object.fromEntries(radarSource.map((x: any) => [x.categoryName, 0])),
      },
      {
        metric: "Turnover Velocity",
        ...Object.fromEntries(radarSource.map((x: any) => [x.categoryName, 0])),
      },
    ];

    const returnsComparison = [
      { type: "Sale Returns", amount: totalSaleReturns, ratio: totalSales !== 0 ? Math.round((totalSaleReturns / Math.abs(totalSales)) * 1000) / 10 : 0 },
      { type: "Purchase Returns", amount: totalPurchaseReturns, ratio: totalPurchases !== 0 ? Math.round((totalPurchaseReturns / Math.abs(totalPurchases)) * 1000) / 10 : 0 },
    ];

    const companies = await Company.find({}, { companyName: 1, companyCode: 1 }).lean();
    const financialYears = await FinancialYear.find({}, { fyName: 1, fyCode: 1, companyId: 1 }).lean();
    const categories = await Category.find({}, { categoryCode: 1, categoryName: 1 }).lean();

    return NextResponse.json({
      success: true,
      filterMeta: {
        range,
        companyId: companyIdParam,
        fyId: fyIdParam,
        paymentStatus,
        categoryFilter,
        startDate: startDateStr,
        endDate: endDateStr,
        companies: companies.map((c: any) => ({
          id: c._id.toString(),
          name: c.companyName || c.companyCode,
          code: c.companyCode,
        })),
        financialYears: financialYears.map((f: any) => ({
          id: f._id.toString(),
          name: f.fyName || f.fyCode,
          fyCode: f.fyCode,
          companyId: f.companyId ? f.companyId.toString() : null,
        })),
        categories: categories.map((cat: any) => ({
          id: cat._id.toString(),
          name: cat.categoryName || cat.categoryCode,
          code: cat.categoryCode,
        })),
        hierarchy: {
          role: access.role,
          isAdmin: access.isAdmin,
          accessibleUserCount: access.accessibleUserIds.length,
          accessibleMrCount: access.mrUserIds.length,
        },
      },
      summary: {
        totalSales,
        totalPurchases,
        netSales,
        netPurchases,
        grossProfit,
        grossMarginPercent,
        purchaseUtilizationRate,
        totalSaleReturns,
        totalPurchaseReturns,
        saleReturnRatio: totalSales !== 0 ? Math.round((totalSaleReturns / Math.abs(totalSales)) * 1000) / 10 : 0,
        purchaseReturnRatio: totalPurchases !== 0 ? Math.round((totalPurchaseReturns / Math.abs(totalPurchases)) * 1000) / 10 : 0,
        inventoryTurnoverVelocity: 0,
      },
      dualTrendData,
      categoriesData,
      tradeFunnelData,
      categoryRadarData,
      treemapItemsData,
      salesPaymentBreakdown,
      purchasePaymentBreakdown,
      returnsComparison,
    });
  } catch (error: any) {
    console.error("Error in /api/analytics/purchase-sales:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load purchase & sales analytics" },
      { status: 500 }
    );
  }
}
