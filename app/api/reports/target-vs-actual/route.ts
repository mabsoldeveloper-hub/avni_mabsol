import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TargetMaster from "@/models/TargetMaster";
import User from "@/models/User";
import Customer from "@/models/Customer";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCurrentUser } from "@/lib/auth";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDaysInMonth(year: number, monthZeroIndexed: number) {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const hierarchyAccess = await getHierarchyAccess(currentUser);
    const restriction = await getMrTerritoryRestriction();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const periodMonth = searchParams.get("periodMonth") || new Date().toISOString().slice(0, 7);
    const targetType = searchParams.get("targetType") || "all"; // "all" | "MR" | "Customer"
    const frequency = searchParams.get("frequency") || "monthly"; // "monthly" | "weekly" | "daily"
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const [yearStr, monthStr] = periodMonth.split("-");
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthIndex = (parseInt(monthStr, 10) || (new Date().getMonth() + 1)) - 1;
    const totalDaysInMonth = getDaysInMonth(year, monthIndex);

    const monthStartDate = `${periodMonth}-01`;
    const monthEndDate = `${periodMonth}-${String(totalDaysInMonth).padStart(2, "0")}`;

    // Target Master filter
    const targetFilter: any = { periodMonth };
    if (targetType && targetType !== "all") {
      targetFilter.targetType = targetType;
    }

    // Fetch available target months for auto-fallback
    const availableMonths = await TargetMaster.distinct("periodMonth");
    if (availableMonths && availableMonths.length > 0) {
      availableMonths.sort((a: string, b: string) => b.localeCompare(a));
    }

    const rawTargets = await TargetMaster.find(targetFilter)
      .populate("mrUserId", "name email employeeCode mobile designation")
      .sort({ createdAt: -1 })
      .lean();

    // Territory / hierarchy access check
    // A manager/head must see targets of the complete recursive downline,
    // not only targets belonging to the logged-in user.
    let allowedTargets = rawTargets;
    if (restriction.isMrRestricted && currentUser) {
      const currentUserIdStr = String(currentUser._id || "");
      const accessibleUserIdSet = new Set(
        (hierarchyAccess.accessibleUserIds || []).map((id: any) => String(id))
      );

      allowedTargets = rawTargets.filter((item: any) => {
        const itemMrId =
          typeof item.mrUserId === "string"
            ? item.mrUserId
            : item.mrUserId?._id?.toString() || "";

        if (item.targetType === "MR") {
          return Boolean(itemMrId && accessibleUserIdSet.has(itemMrId));
        }

        if (item.targetType === "Customer") {
          const customerCode = String(item.customerCode || "").trim();
          if (!customerCode) return false;

          // Reuse the central party authorization so customer targets follow
          // the same hierarchy rules as Customer Master / Sales / Outstanding.
          return restriction.isPartyAllowed({
            ORDNO: customerCode,
            CODEP: customerCode,
            CODE: customerCode,
            PARNAM: item.customerName || "",
          });
        }

        // Generic targets are only visible when they belong to the current
        // user or one of the users in the recursive subtree.
        if (itemMrId) return accessibleUserIdSet.has(itemMrId);
        return String(currentUser._id || "") === currentUserIdStr;
      });
    }

    // Apply search filter
    if (search) {
      allowedTargets = allowedTargets.filter((item: any) => {
        const name = (item.customerName || item.mrName || "").toLowerCase();
        const code = (item.customerCode || "").toLowerCase();
        return name.includes(search) || code.includes(search);
      });
    }

    // Define 5 Calendar Weeks for the month
    const weeks = [
      { weekNo: 1, label: "Week 1 (1 - 7)", startDay: 1, endDay: 7 },
      { weekNo: 2, label: "Week 2 (8 - 14)", startDay: 8, endDay: 14 },
      { weekNo: 3, label: "Week 3 (15 - 21)", startDay: 15, endDay: 21 },
      { weekNo: 4, label: "Week 4 (22 - 28)", startDay: 22, endDay: 28 },
      {
        weekNo: 5,
        label: `Week 5 (29 - ${totalDaysInMonth})`,
        startDay: 29,
        endDay: totalDaysInMonth,
      },
    ].filter((w) => w.startDay <= totalDaysInMonth);

    // 1. Bulk pre-fetch Customer phone numbers and MR assignments
    const customerAccessFilter: any = {};
    if (restriction.isMrRestricted) {
      const allowedOrdnos = (restriction.allowedOrdnos || [])
        .map((v: any) => String(v).trim())
        .filter(Boolean);

      customerAccessFilter.$or = allowedOrdnos.length
        ? [
            { ORDNO: { $in: allowedOrdnos } },
            { CODEP: { $in: allowedOrdnos } },
            { CODE: { $in: allowedOrdnos } },
            { SCODE: { $in: allowedOrdnos } },
          ]
        : [{ _id: null }];
    }

    const customerList = await Customer.find(
      combineFilters(companyVfpMatch, customerAccessFilter),
      { ORDNO: 1, CODEP: 1, CODE: 1, SCODE: 1, PARNAM: 1, MOBILE: 1, PHONE1: 1, PHONE2: 1, TEL: 1, REF: 1, DSM: 1 }
    ).lean();

    const custPhoneMap = new Map<string, string>();
    const mrAssignedCustCodes = new Map<string, Set<string>>();

    customerList.forEach((c: any) => {
      const phone = c.PHONE1 || c.MOBILE || c.PHONE2 || c.TEL || c.REF || "";
      if (c.ORDNO) custPhoneMap.set(String(c.ORDNO).trim().toUpperCase(), phone);
      if (c.CODEP) custPhoneMap.set(String(c.CODEP).trim().toUpperCase(), phone);
      if (c.CODE) custPhoneMap.set(String(c.CODE).trim().toUpperCase(), phone);
      if (c.SCODE) custPhoneMap.set(String(c.SCODE).trim().toUpperCase(), phone);
      if (c.PARNAM) custPhoneMap.set(String(c.PARNAM).trim().toUpperCase(), phone);

      const dsm = (c.DSM || "").trim().toUpperCase();
      if (dsm) {
        if (!mrAssignedCustCodes.has(dsm)) mrAssignedCustCodes.set(dsm, new Set());
        if (c.ORDNO) mrAssignedCustCodes.get(dsm)!.add(String(c.ORDNO).trim().toUpperCase());
        if (c.CODEP) mrAssignedCustCodes.get(dsm)!.add(String(c.CODEP).trim().toUpperCase());
      }
    });

    // 2. Bulk pre-fetch Users for MR phone numbers
    const userFilter: any = {};
    if (restriction.isMrRestricted) {
      userFilter._id = { $in: hierarchyAccess.accessibleUserIds || [] };
    }
    const userList = await User.find(userFilter, { name: 1, employeeCode: 1, mobile: 1, phone: 1 }).lean();
    const mrPhoneMap = new Map<string, string>();
    userList.forEach((u: any) => {
      const phone = u.mobile || u.phone || "";
      if (u.name) mrPhoneMap.set(String(u.name).trim().toUpperCase(), phone);
      if (u.employeeCode) mrPhoneMap.set(String(u.employeeCode).trim().toUpperCase(), phone);
      if (u._id) mrPhoneMap.set(String(u._id), phone);
    });

    // 3. Bulk Aggregate Sales for the month
    const bulkSalesAgg = await SalesMdis.aggregate([
      {
        $match: combineFilters(
          companyVfpMatch,
          { DATE: { $gte: monthStartDate, $lte: monthEndDate } },
          restriction.isMrRestricted
            ? {
                $or: [
                  { CODEP: { $in: restriction.allowedOrdnos || [] } },
                  { CODE: { $in: restriction.allowedOrdnos || [] } },
                  { PARTY: { $in: restriction.allowedOrdnos || [] } },
                ],
              }
            : {}
        ),
      },
      {
        $group: {
          _id: {
            date: "$DATE",
            party: "$PARTY",
            codep: "$CODEP",
            code: "$CODE",
            dsm: "$DSM",
            asm: "$ASM",
            rsm: "$RSM",
          },
          totalSales: {
            $sum: {
              $ifNull: [
                "$NETAMT",
                { $ifNull: ["$TOTAMT", { $ifNull: ["$FINAL", { $ifNull: ["$AMOUNT", 0] }] }] },
              ],
            },
          },
        },
      },
    ]);

    // 4. Bulk Aggregate Collections for the month
    const bulkCollAgg = await GLedger.aggregate([
      {
        $match: combineFilters(companyVfpMatch, {
          BOOK: "R",
          CD: "C",
          DATE: { $gte: monthStartDate, $lte: monthEndDate },
        },
        restriction.isMrRestricted
          ? { CODE: { $in: restriction.allowedOrdnos || [] } }
          : {}
        ),
      },
      {
        $group: {
          _id: {
            date: "$DATE",
            code: "$CODE",
          },
          totalCollection: {
            $sum: {
              $ifNull: [
                "$CREDIT",
                { $ifNull: ["$AMOUNT", { $ifNull: ["$DEBIT", 0] }] },
              ],
            },
          },
        },
      },
    ]);

    // Process targets lightning fast in memory
    const processedRows = allowedTargets.map((item: any) => {
      const salesTarget = item.targetAmount || 0;
      const collectionTarget = item.collectionTargetAmount || 0;

      const dailySalesMap: Record<string, number> = {};
      const dailyCollectionMap: Record<string, number> = {};
      let monthlyActualSales = 0;
      let monthlyActualCollection = 0;

      if (item.targetType === "Customer") {
        const codeUpper = (item.customerCode || "").trim().toUpperCase();
        const nameUpper = (item.customerName || "").trim().toUpperCase();

        // Match Sales
        bulkSalesAgg.forEach((s: any) => {
          const sParty = (s._id?.party || "").trim().toUpperCase();
          const sCodep = (s._id?.codep || "").trim().toUpperCase();
          const sCode = (s._id?.code || "").trim().toUpperCase();

          if (
            (codeUpper && (sCodep === codeUpper || sCode === codeUpper || (sParty && sParty.includes(codeUpper)))) ||
            (nameUpper && sParty && sParty.includes(nameUpper))
          ) {
            const dateStr = s._id?.date;
            const amt = Math.max(0, Number(s.totalSales) || 0);
            if (dateStr) {
              dailySalesMap[dateStr] = (dailySalesMap[dateStr] || 0) + amt;
              monthlyActualSales += amt;
            }
          }
        });

        // Match Collections
        bulkCollAgg.forEach((c: any) => {
          const cCode = (c._id?.code || "").trim().toUpperCase();
          if (codeUpper && cCode === codeUpper) {
            const dateStr = c._id?.date;
            const amt = Math.max(0, Number(c.totalCollection) || 0);
            if (dateStr) {
              dailyCollectionMap[dateStr] = (dailyCollectionMap[dateStr] || 0) + amt;
              monthlyActualCollection += amt;
            }
          }
        });
      } else if (item.targetType === "MR") {
        const mrUserIdStr = typeof item.mrUserId === "object" ? item.mrUserId?._id?.toString() : String(item.mrUserId || "");
        const empCodeUpper = (item.mrUserId?.employeeCode || item.mrUserId?.name || item.mrName || "").trim().toUpperCase();

        const assignedCustCodesSet = mrAssignedCustCodes.get(empCodeUpper) || new Set();

        // Match Sales
        bulkSalesAgg.forEach((s: any) => {
          const sDsm = (s._id?.dsm || "").trim().toUpperCase();
          const sAsm = (s._id?.asm || "").trim().toUpperCase();
          const sRsm = (s._id?.rsm || "").trim().toUpperCase();

          if (
            empCodeUpper &&
            (sDsm.includes(empCodeUpper) || sAsm.includes(empCodeUpper) || sRsm.includes(empCodeUpper))
          ) {
            const dateStr = s._id?.date;
            const amt = Math.max(0, Number(s.totalSales) || 0);
            if (dateStr) {
              dailySalesMap[dateStr] = (dailySalesMap[dateStr] || 0) + amt;
              monthlyActualSales += amt;
            }
          }
        });

        // Match Collections for MR's assigned customers
        bulkCollAgg.forEach((c: any) => {
          const cCode = (c._id?.code || "").trim().toUpperCase();
          if (assignedCustCodesSet.has(cCode)) {
            const dateStr = c._id?.date;
            const amt = Math.max(0, Number(c.totalCollection) || 0);
            if (dateStr) {
              dailyCollectionMap[dateStr] = (dailyCollectionMap[dateStr] || 0) + amt;
              monthlyActualCollection += amt;
            }
          }
        });
      }

      // Compute Weekly Breakdown
      const weeklyBreakdown = weeks.map((w) => {
        const daysInWeek = w.endDay - w.startDay + 1;
        const weeklySalesTarget = Math.round((salesTarget * daysInWeek) / totalDaysInMonth);
        const weeklyCollectionTarget = Math.round((collectionTarget * daysInWeek) / totalDaysInMonth);

        let weekActualSales = 0;
        let weekActualCollection = 0;

        for (let d = w.startDay; d <= w.endDay; d++) {
          const dayStr = `${periodMonth}-${String(d).padStart(2, "0")}`;
          weekActualSales += dailySalesMap[dayStr] || 0;
          weekActualCollection += dailyCollectionMap[dayStr] || 0;
        }

        const salesAchPercent =
          weeklySalesTarget > 0 ? Math.min(100, Math.round((weekActualSales / weeklySalesTarget) * 100)) : 0;
        const collectionAchPercent =
          weeklyCollectionTarget > 0
            ? Math.min(100, Math.round((weekActualCollection / weeklyCollectionTarget) * 100))
            : 0;

        return {
          weekNo: w.weekNo,
          label: w.label,
          startDate: `${periodMonth}-${String(w.startDay).padStart(2, "0")}`,
          endDate: `${periodMonth}-${String(w.endDay).padStart(2, "0")}`,
          daysInWeek,
          weeklySalesTarget,
          weekActualSales,
          weeklySalesShortfall: Math.max(0, weeklySalesTarget - weekActualSales),
          salesAchPercent,
          weeklyCollectionTarget,
          weekActualCollection,
          weeklyCollectionShortfall: Math.max(0, weeklyCollectionTarget - weekActualCollection),
          collectionAchPercent,
        };
      });

      // Compute Day-Wise Breakdown
      const dailyBreakdown = [];
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dayStr = `${periodMonth}-${String(d).padStart(2, "0")}`;
        const dailySalesTarget = Math.round(salesTarget / totalDaysInMonth);
        const dailyCollectionTarget = Math.round(collectionTarget / totalDaysInMonth);
        const dayActualSales = dailySalesMap[dayStr] || 0;
        const dayActualCollection = dailyCollectionMap[dayStr] || 0;

        dailyBreakdown.push({
          date: dayStr,
          day: d,
          dailySalesTarget,
          dayActualSales,
          salesAchPercent:
            dailySalesTarget > 0 ? Math.min(100, Math.round((dayActualSales / dailySalesTarget) * 100)) : 0,
          dailyCollectionTarget,
          dayActualCollection,
          collectionAchPercent:
            dailyCollectionTarget > 0
              ? Math.min(100, Math.round((dayActualCollection / dailyCollectionTarget) * 100))
              : 0,
        });
      }

      // Overall Monthly Stats
      const salesAchPercent =
        salesTarget > 0 ? Math.min(100, Math.round((monthlyActualSales / salesTarget) * 100)) : 0;
      const collectionAchPercent =
        collectionTarget > 0
          ? Math.min(100, Math.round((monthlyActualCollection / collectionTarget) * 100))
          : 0;

      // Unlock gift slab calculation
      let activeGiftSlab = null;
      if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
        const sorted = [...item.giftSlabs].sort((a, b) => b.minAchievementPercent - a.minAchievementPercent);
        for (const slab of sorted) {
          if (salesAchPercent >= slab.minAchievementPercent) {
            activeGiftSlab = slab;
            break;
          }
        }
      }

      // Lookup phone number for direct WhatsApp messaging
      let phoneNumber = "";
      if (item.targetType === "MR") {
        const mrUserIdStr = typeof item.mrUserId === "object" ? item.mrUserId?._id?.toString() : String(item.mrUserId || "");
        const mrNameUpper = (item.mrName || "").trim().toUpperCase();
        phoneNumber =
          (typeof item.mrUserId === "object" ? (item.mrUserId?.mobile || item.mrUserId?.phone) : "") ||
          mrPhoneMap.get(mrNameUpper) ||
          mrPhoneMap.get(mrUserIdStr) ||
          "";
      } else if (item.targetType === "Customer") {
        const codeUpper = (item.customerCode || "").trim().toUpperCase();
        const nameUpper = (item.customerName || "").trim().toUpperCase();
        phoneNumber = custPhoneMap.get(codeUpper) || custPhoneMap.get(nameUpper) || "";
      }

        return {
          _id: item._id,
          targetType: item.targetType,
          periodMonth: item.periodMonth,
          mrUserId: item.mrUserId,
          mrName: item.mrName || item.mrUserId?.name || "N/A",
          customerCode: item.customerCode || "N/A",
          customerName: item.customerName || "N/A",
          phoneNumber,
          notes: item.notes || "",
          status: item.status || "Active",
          // Sales Metrics
          salesTarget,
          monthlyActualSales,
          salesShortfall: Math.max(0, salesTarget - monthlyActualSales),
          salesAchPercent,
          // Collection Metrics
          collectionTarget,
          monthlyActualCollection,
          collectionShortfall: Math.max(0, collectionTarget - monthlyActualCollection),
          collectionAchPercent,
          // Gift Scheme
          hasGiftScheme: Boolean(item.hasGiftScheme),
          giftSlabs: item.giftSlabs || [],
          activeGiftSlab,
          // Breakdowns
          weeklyBreakdown,
          dailyBreakdown,
        };
      });

    // Calculate Summary Totals
    let totalSalesTarget = 0;
    let totalActualSales = 0;
    let totalCollectionTarget = 0;
    let totalActualCollection = 0;

    processedRows.forEach((r) => {
      totalSalesTarget += r.salesTarget;
      totalActualSales += r.monthlyActualSales;
      totalCollectionTarget += r.collectionTarget;
      totalActualCollection += r.monthlyActualCollection;
    });

    const overallSalesAchPercent =
      totalSalesTarget > 0 ? Math.min(100, Math.round((totalActualSales / totalSalesTarget) * 100)) : 0;
    const overallCollectionAchPercent =
      totalCollectionTarget > 0
        ? Math.min(100, Math.round((totalActualCollection / totalCollectionTarget) * 100))
        : 0;

    return NextResponse.json({
      success: true,
      periodMonth,
      targetType,
      frequency,
      totalDaysInMonth,
      availableMonths: availableMonths || [],
      isMrRestricted: restriction.isMrRestricted,
      summary: {
        totalRecords: processedRows.length,
        totalSalesTarget,
        totalActualSales,
        totalSalesShortfall: Math.max(0, totalSalesTarget - totalActualSales),
        overallSalesAchPercent,
        totalCollectionTarget,
        totalActualCollection,
        totalCollectionShortfall: Math.max(0, totalCollectionTarget - totalActualCollection),
        overallCollectionAchPercent,
      },
      data: processedRows,
    });
  } catch (error: any) {
    console.error("Target vs Actual Report API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate Target vs Actual Report" },
      { status: 500 }
    );
  }
}
