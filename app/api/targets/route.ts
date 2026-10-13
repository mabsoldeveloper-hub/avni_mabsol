import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TargetMaster from "@/models/TargetMaster";
import User from "@/models/User";
import SalesMdis from "@/models/SalesMdis";
import Customer from "@/models/Customer";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper regex escape
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =======================
// GET - List Targets with Live Sales Achievement Calculation & MR Territory Restriction
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const restriction = await getMrTerritoryRestriction();

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType") || "";
    const periodMonth = searchParams.get("periodMonth") || "";
    const mrUserId = searchParams.get("mrUserId") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (targetType) filter.targetType = targetType;
    if (periodMonth) filter.periodMonth = periodMonth;
    if (mrUserId) filter.mrUserId = mrUserId;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { mrName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
        { periodMonth: { $regex: search, $options: "i" } },
      ];
    }

    const records = await TargetMaster.find(filter)
      .populate("mrUserId", "name email employeeCode mobile designation")
      .sort({ periodMonth: -1, createdAt: -1 });

    let allowedRecords = records;

    // Apply MR Territory & Direct Assignment Restriction if user is an MR / non-Admin
    if (restriction.isMrRestricted && currentUser) {
      const currentUserIdStr = currentUser._id?.toString() || "";
      const currentUserNameStr = (currentUser.name || "").trim().toLowerCase();
      const currentEmpCodeStr = (currentUser.employeeCode || "").trim().toLowerCase();

      // Collect allowed customer codes and customer names for this MR
      const allowedCustomerCodesSet = new Set<string>(
        (restriction.allowedOrdnos || []).map((c) => c.trim().toLowerCase())
      );
      const allowedCustomerNamesSet = new Set<string>();

      // Fetch direct MR Customer Assignments
      const directMrAssignments = await MrCustomerAssignment.find(
        { userId: currentUser._id, status: "Active" },
        { customerCode: 1, customerName: 1 }
      ).lean();

      directMrAssignments.forEach((a: any) => {
        if (a.customerCode) allowedCustomerCodesSet.add(String(a.customerCode).trim().toLowerCase());
        if (a.customerName) allowedCustomerNamesSet.add(String(a.customerName).trim().toLowerCase());
      });

      // Query Customer collection for all customers assigned to MR's DSM or territory companies
      const mrCustomerConditions: any[] = [];
      if (currentUserNameStr) {
        mrCustomerConditions.push({ DSM: { $regex: escapeRegex(currentUserNameStr), $options: "i" } });
      }
      if (currentEmpCodeStr) {
        mrCustomerConditions.push({ DSM: { $regex: escapeRegex(currentEmpCodeStr), $options: "i" } });
      }
      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        mrCustomerConditions.push({ COMPANY: { $in: restriction.allowedCompanyCodes } });
      }

      if (mrCustomerConditions.length > 0) {
        const matchingCustomers = await Customer.find(
          { $or: mrCustomerConditions },
          { ORDNO: 1, CODEP: 1, PARNAM: 1 }
        ).lean();

        matchingCustomers.forEach((c: any) => {
          if (c.ORDNO) allowedCustomerCodesSet.add(String(c.ORDNO).trim().toLowerCase());
          if (c.CODEP) allowedCustomerCodesSet.add(String(c.CODEP).trim().toLowerCase());
          if (c.PARNAM) allowedCustomerNamesSet.add(String(c.PARNAM).trim().toLowerCase());
        });
      }

      allowedRecords = records.filter((doc) => {
        const item = doc.toObject ? doc.toObject() : doc;
        const itemMrId = typeof item.mrUserId === "string"
          ? item.mrUserId
          : item.mrUserId?._id?.toString() || "";
        const itemMrNameStr = (item.mrName || "").trim().toLowerCase();

        // 1. Check if the target has an explicitly assigned MR Executive (mrUserId or mrName)
        const hasExplicitMrAssignment = Boolean(itemMrId || itemMrNameStr);

        if (hasExplicitMrAssignment) {
          // If explicitly assigned to an MR, show ONLY if that MR matches the logged-in user
          const isAssignedToCurrentUser =
            (itemMrId && itemMrId === currentUserIdStr) ||
            (currentUserNameStr && itemMrNameStr && itemMrNameStr.includes(currentUserNameStr)) ||
            (currentEmpCodeStr && itemMrNameStr && itemMrNameStr.includes(currentEmpCodeStr));

          return Boolean(isAssignedToCurrentUser);
        }

        // 2. If MR target type with no assigned MR, hide it from non-Admins
        if (item.targetType === "MR") {
          return false;
        }

        // 3. If Customer target with no explicit MR assigned, check if customer belongs to this MR's assigned customer list
        if (item.targetType === "Customer") {
          const cCode = (item.customerCode || "").trim().toLowerCase();
          const cName = (item.customerName || "").trim().toLowerCase();

          if (cCode && allowedCustomerCodesSet.has(cCode)) return true;
          if (cName && allowedCustomerNamesSet.has(cName)) return true;

          if (
            restriction.isPartyAllowed &&
            restriction.isPartyAllowed({
              CODEP: item.customerCode,
              PARNAM: item.customerName,
              CODE: item.customerCode,
              ORDNO: item.customerCode,
            })
          ) {
            return true;
          }
        }

        return false;
      });
    }

    // Calculate dynamic live sales achievement for each allowed target record
    const processedRecords = await Promise.all(
      allowedRecords.map(async (doc) => {
        const item = doc.toObject ? doc.toObject() : doc;
        let achievedAmount = 0;

        try {
          const monthStr = item.periodMonth; // e.g. "2026-07"
          if (monthStr && monthStr.length === 7) {
            const mdisFilter: any = {};

            // If Customer target
            if (item.targetType === "Customer" && (item.customerCode || item.customerName)) {
              if (item.customerCode) {
                mdisFilter.$or = [
                  { CODEP: item.customerCode },
                  { CODE: item.customerCode },
                  { PARTY: { $regex: escapeRegex(item.customerName || item.customerCode), $options: "i" } },
                ];
              } else {
                mdisFilter.PARTY = { $regex: escapeRegex(item.customerName), $options: "i" };
              }
            } else if (item.targetType === "MR" && (item.mrUserId || item.mrName)) {
              // MR target
              const empCode = item.mrUserId?.employeeCode || item.mrName;
              if (empCode) {
                mdisFilter.$or = [
                  { DSM: { $regex: escapeRegex(empCode), $options: "i" } },
                  { ASM: { $regex: escapeRegex(empCode), $options: "i" } },
                  { RSM: { $regex: escapeRegex(empCode), $options: "i" } },
                ];
              }
            }

            // Perform sales aggregation if filter applies
            if (Object.keys(mdisFilter).length > 0) {
              const salesSum = await SalesMdis.aggregate([
                { $match: mdisFilter },
                {
                  $group: {
                    _id: null,
                    totalSales: {
                      $sum: {
                        $ifNull: [
                          "$NETAMT",
                          { $ifNull: ["$TOTAMT", { $ifNull: ["$AMOUNT", 0] }] },
                        ],
                      },
                    },
                  },
                },
              ]);

              if (salesSum && salesSum.length > 0) {
                achievedAmount = Math.max(0, Number(salesSum[0].totalSales) || 0);
              }
            }
          }
        } catch (e) {
          console.error("Sales aggregation error for target:", item._id, e);
        }

        const targetAmount = item.targetAmount || 0;
        const shortfall = Math.max(0, targetAmount - achievedAmount);
        const achievementPercent = targetAmount > 0
          ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
          : 0;

        // Determine unlocked gift slab
        let activeGiftSlab = null;
        if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
          const sortedSlabs = [...item.giftSlabs].sort(
            (a, b) => b.minAchievementPercent - a.minAchievementPercent
          );
          for (const slab of sortedSlabs) {
            if (achievementPercent >= slab.minAchievementPercent) {
              activeGiftSlab = slab;
              break;
            }
          }
        }

        // Lookup phone number for direct WhatsApp messaging: MR target -> MR phone, Customer target -> Customer phone
        let phoneNumber = "";
        try {
          if (item.targetType === "MR") {
            // MR Target: Get MR Executive's phone number
            if (item.mrUserId && typeof item.mrUserId === "object") {
              phoneNumber = item.mrUserId.mobile || item.mrUserId.phone || "";
            }
            if (!phoneNumber && item.mrName) {
              const userDoc = await User.findOne(
                { $or: [{ name: { $regex: escapeRegex(item.mrName), $options: "i" } }, { employeeCode: { $regex: escapeRegex(item.mrName), $options: "i" } }] },
                { mobile: 1, phone: 1 }
              ).lean();
              if (userDoc) phoneNumber = (userDoc as any).mobile || (userDoc as any).phone || "";
            }
          } else if (item.targetType === "Customer") {
            // Customer Target: Get Customer/Party's phone number
            const code = (item.customerCode || "").trim();
            const name = (item.customerName || "").trim();
            if (code || name) {
              const custMatch = code
                ? { $or: [{ ORDNO: code }, { CODEP: code }, { CODE: code }, { SCODE: code }] }
                : { $or: [{ PARNAM: { $regex: escapeRegex(name), $options: "i" } }, { MAILNAM: { $regex: escapeRegex(name), $options: "i" } }] };
              const custDoc = await Customer.findOne(
                custMatch,
                { PHONE1: 1, PHONE2: 1, MOBILE: 1, TEL: 1, REF: 1 }
              ).lean();
              if (custDoc) {
                phoneNumber = (custDoc as any).PHONE1 || (custDoc as any).MOBILE || (custDoc as any).PHONE2 || (custDoc as any).TEL || (custDoc as any).REF || "";
              }
            }
          }
        } catch (phoneErr) {
          console.error("Phone lookup error:", phoneErr);
        }

        return {
          ...item,
          phoneNumber,
          achievedAmount,
          shortfall,
          achievementPercent,
          activeGiftSlab,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: processedRecords.length,
      isMrRestricted: restriction.isMrRestricted,
      data: processedRecords,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch targets" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create New Target
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      targetType,
      periodMonth,
      mrUserId,
      mrName,
      customerId,
      customerName,
      customerCode,
      targetAmount,
      collectionTargetAmount,
      hasGiftScheme,
      giftSlabs,
      notes,
      status,
    } = body;

    if (!targetType || !periodMonth || (targetAmount === undefined && collectionTargetAmount === undefined)) {
      return NextResponse.json(
        { success: false, message: "Target Type, Period Month, and Target Amount or Collection Target are required." },
        { status: 400 }
      );
    }

    let resolvedMrName = mrName || "";
    if (mrUserId) {
      const user = await User.findById(mrUserId);
      if (user) {
        resolvedMrName = user.name;
      }
    }

    const newTarget = await TargetMaster.create({
      targetType,
      periodMonth: periodMonth.trim(),
      mrUserId: mrUserId || null,
      mrName: resolvedMrName,
      customerId: (customerId || "").trim(),
      customerName: (customerName || "").trim(),
      customerCode: (customerCode || "").trim(),
      targetAmount: Number(targetAmount) || 0,
      collectionTargetAmount: Number(collectionTargetAmount) || 0,
      hasGiftScheme: Boolean(hasGiftScheme),
      giftSlabs: Array.isArray(giftSlabs) ? giftSlabs : [],
      notes: (notes || "").trim(),
      status: status || "Active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Target created successfully.",
        data: newTarget,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create target record" },
      { status: 500 }
    );
  }
}
