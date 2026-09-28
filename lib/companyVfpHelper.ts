import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";

export async function getCompanyVfpFilter(searchParams: URLSearchParams): Promise<Record<string, any>> {
  await connectDB();

  const companyId = searchParams.get("companyId");
  const fyId = searchParams.get("fyId");

  const codesToMatch = new Set<string>();

  const addCode = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(addCode);
    } else if (typeof val === "string") {
      val.split(/[\s,;]+/).forEach((item) => {
        const trimmed = item.trim().toUpperCase();
        if (trimmed) codesToMatch.add(trimmed);
      });
    }
  };

  // 1. Resolve Company
  let compDoc: any = null;
  if (companyId && companyId !== "ALL") {
    try {
      if (mongoose.Types.ObjectId.isValid(companyId)) {
        compDoc = await Company.findById(companyId).lean();
      } else {
        compDoc = await Company.findOne({ companyCode: new RegExp(`^${companyId}$`, "i") }).lean();
      }
    } catch (e) {
      console.error("Error matching companyId in getCompanyVfpFilter:", e);
    }
  } else {
    // If no companyId or "ALL", check if there is a single active company
    try {
      const companyCount = await Company.countDocuments({ status: { $ne: "Inactive" } });
      if (companyCount === 1) {
        compDoc = await Company.findOne({ status: { $ne: "Inactive" } }).lean();
      }
    } catch (e) {
      console.error("Error detecting single company in getCompanyVfpFilter:", e);
    }
  }

  // 2. Resolve Financial Year Codes strictly per selection (DO NOT mix years together!)
  const targetCompanyId = compDoc?._id || (companyId && companyId !== "ALL" ? companyId : null);

  if (fyId === "ALL") {
    // User explicitly requested ALL financial years: include codes for all FYs of this company
    try {
      const fyDocs = await FinancialYear.find(
        targetCompanyId ? { companyId: targetCompanyId } : {},
        { fyCode: 1 }
      ).lean();
      for (const fy of fyDocs) {
        addCode(fy.fyCode);
      }
    } catch (e) {
      console.error("Error fetching all FY codes in getCompanyVfpFilter:", e);
    }
  } else if (fyId && fyId !== "ALL") {
    // User requested one SPECIFIC financial year: include ONLY that FY's code
    try {
      let fyDoc: any = null;
      if (mongoose.Types.ObjectId.isValid(fyId)) {
        fyDoc = await FinancialYear.findById(fyId).lean();
      } else {
        fyDoc = await FinancialYear.findOne({ fyCode: new RegExp(`^${fyId}$`, "i") }).lean();
      }
      if (fyDoc?.fyCode) {
        addCode(fyDoc.fyCode);
      }
    } catch (e) {
      console.error("Error matching specific fyId in getCompanyVfpFilter:", e);
    }
  } else {
    // No fyId parameter passed: Default strictly to CURRENT active financial year
    try {
      let currentFy = await FinancialYear.findOne(
        targetCompanyId ? { companyId: targetCompanyId, isCurrent: true } : { isCurrent: true }
      ).lean();
      if (!currentFy) {
        // Fallback to latest FY
        currentFy = await FinancialYear.findOne(
          targetCompanyId ? { companyId: targetCompanyId } : {}
        ).sort({ startDate: -1 }).lean();
      }
      if (currentFy?.fyCode) {
        addCode(currentFy.fyCode);
      }
    } catch (e) {
      console.error("Error matching current FY in getCompanyVfpFilter:", e);
    }
  }

  // 3. Company code identification
  if (compDoc?.companyCode) {
    addCode(compDoc.companyCode);
  }
  if (compDoc?.code) {
    addCode(compDoc.code);
  }

  // 4. Auto-detect VFP folder/table suffixes from synced files (e.g. "_F18.DBF" -> "F18")
  try {
    const db = mongoose.connection.db;
    if (db) {
      const configDocs = await db.collection("vfpconfigs").find({}).toArray();
      for (const cfg of configDocs) {
        if (Array.isArray(cfg.enabledFiles)) {
          for (const f of cfg.enabledFiles) {
            const m = String(f).match(/_([A-Za-z0-9]+)\.DBF$/i);
            if (m && m[1]) addCode(m[1]);
          }
        }
      }
      const tableMaps = await db.collection("vfptablemaps").find({}, { projection: { fileName: 1 } }).limit(30).toArray();
      for (const tm of tableMaps) {
        if (tm.fileName) {
          const m = String(tm.fileName).match(/_([A-Za-z0-9]+)\.DBF$/i);
          if (m && m[1]) addCode(m[1]);
        }
      }
    }
  } catch (e) {
    console.error("Error auto-detecting VFP table suffix in getCompanyVfpFilter:", e);
  }

  // 5. Build MongoDB Query
  const vfpOrList: any[] = [];
  for (const code of Array.from(codesToMatch)) {
    if (code) {
      vfpOrList.push({ _vfpTable: new RegExp(`_${code}$`, "i") });
      vfpOrList.push({ companyCode: new RegExp(`^${code}$`, "i") });
      vfpOrList.push({ COMPANY: new RegExp(`^${code}$`, "i") });
      vfpOrList.push({ fyCode: new RegExp(`^${code}$`, "i") });
    }
  }

  if (compDoc?._id || (companyId && companyId !== "ALL")) {
    const compStr = String(compDoc?._id || companyId).trim();
    if (mongoose.Types.ObjectId.isValid(compStr)) {
      vfpOrList.push({ companyId: new mongoose.Types.ObjectId(compStr) });
    }
    vfpOrList.push({ companyId: compStr });
  }

  return vfpOrList.length > 0 ? { $or: vfpOrList } : {};
}

/**
 * Safely merges multiple filter objects into a single MongoDB filter using $and
 * to prevent duplicate keys (like $or in date filters vs $or in company filters)
 * from overwriting each other in JavaScript object spread.
 */
export function combineFilters(...filters: any[]): Record<string, any> {
  const valid = filters.filter((f) => f && typeof f === "object" && Object.keys(f).length > 0);
  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];
  return { $and: valid };
}
