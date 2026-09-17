import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import TargetMaster from "@/models/TargetMaster";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";
import Customer from "@/models/Customer";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import SalesHierarchy from "@/models/SalesHierarchy";
import { getCurrentUser } from "@/lib/auth";
import { getHierarchyAccess, resolveHierarchyRole, getHierarchyDisplayRole } from "@/lib/hierarchyAccess";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any) => clean(v).toUpperCase();

function amount(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function achievement(actual: number, target: number) {
  return target > 0 ? Math.round((actual / target) * 100) : 0;
}

function getDate(v: any) {
  return clean(v).slice(0, 10);
}

function getWeeks(periodMonth: string, totalDays: number) {
  return [
    { weekNo: 1, label: "Week 1", startDay: 1, endDay: Math.min(7, totalDays) },
    { weekNo: 2, label: "Week 2", startDay: 8, endDay: Math.min(14, totalDays) },
    { weekNo: 3, label: "Week 3", startDay: 15, endDay: Math.min(21, totalDays) },
    { weekNo: 4, label: "Week 4", startDay: 22, endDay: Math.min(28, totalDays) },
    { weekNo: 5, label: "Week 5", startDay: 29, endDay: totalDays },
  ]
    .filter((w) => w.startDay <= totalDays)
    .map((w) => ({
      ...w,
      startDate: `${periodMonth}-${String(w.startDay).padStart(2, "0")}`,
      endDate: `${periodMonth}-${String(w.endDay).padStart(2, "0")}`,
    }));
}

function buildTree(users: any[], rootId: string, hierarchyMap: Map<string, any>) {
  const byParent = new Map<string, any[]>();

  for (const user of users) {
    const parent = clean(user.reportsTo);
    const list = byParent.get(parent) || [];
    list.push(user);
    byParent.set(parent, list);
  }

  const walk = (id: string): any => {
    const user = users.find((u) => String(u._id) === id);
    if (!user) return null;

    return {
      _id: id,
      name: user.name || "",
      employeeCode: user.employeeCode || "",
      role: getHierarchyDisplayRole(user, hierarchyMap.get(id)),
      designation: user.designation || "",
      reportsTo: user.reportsTo ? String(user.reportsTo) : null,
      children: (byParent.get(id) || [])
        .map((child) => walk(String(child._id)))
        .filter(Boolean),
    };
  };

  return walk(rootId);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const access = await getHierarchyAccess(currentUser);

    if (!access.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const periodMonth =
      searchParams.get("periodMonth") ||
      new Date().toISOString().slice(0, 7);

    const requestedUserId = clean(searchParams.get("userId"));
    const selectedUserId = requestedUserId || String(access.userId);

    const accessibleIds = new Set(
      (access.accessibleUserIds || []).map((id: any) => String(id))
    );

    // Never allow drill-down outside the logged-in user's hierarchy.
    if (!accessibleIds.has(selectedUserId)) {
      return NextResponse.json(
        { success: false, message: "User is outside your hierarchy" },
        { status: 403 }
      );
    }

    const [yearText, monthText] = periodMonth.split("-");
    const year = Number(yearText);
    const month = Number(monthText);

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, message: "Invalid periodMonth. Use YYYY-MM." },
        { status: 400 }
      );
    }

    const totalDays = new Date(year, month, 0).getDate();
    const startDate = `${periodMonth}-01`;
    const endDate = `${periodMonth}-${String(totalDays).padStart(2, "0")}`;

    const companyFilter = await getCompanyVfpFilter(searchParams);

    /*
     * 1) Load hierarchy users.
     * getHierarchyAccess already applies tenant + recursive hierarchy rules.
     */
    const hierarchyUsers = (access.accessibleUsers || []).map((u: any) => ({
      ...u,
      _id: String(u._id),
      reportsTo: u.reportsTo ? String(u.reportsTo) : null,
    }));

    const hierarchyRecords = await SalesHierarchy.find({
      userId: { $in: hierarchyUsers.map((u: any) => u._id) },
      status: "Active",
    }).lean();

    const hierarchyMap = new Map<string, any>();
    hierarchyRecords.forEach((h: any) => {
      hierarchyMap.set(String(h.userId), h);
    });

    const selected = hierarchyUsers.find(
      (u: any) => String(u._id) === selectedUserId
    );

    if (!selected) {
      return NextResponse.json(
        { success: false, message: "Selected user not found" },
        { status: 404 }
      );
    }

    /*
     * 2) Build selected employee's complete recursive subtree.
     */
    const childrenByParent = new Map<string, any[]>();

    hierarchyUsers.forEach((u: any) => {
      const parent = clean(u.reportsTo);
      const list = childrenByParent.get(parent) || [];
      list.push(u);
      childrenByParent.set(parent, list);
    });

    const subtree: any[] = [];
    const queue = [selectedUserId];
    const visited = new Set<string>();

    while (queue.length) {
      const id = queue.shift()!;

      if (visited.has(id)) continue;
      visited.add(id);

      const user = hierarchyUsers.find((u: any) => String(u._id) === id);
      if (!user) continue;

      subtree.push(user);

      for (const child of childrenByParent.get(id) || []) {
        queue.push(String(child._id));
      }
    }

    const subtreeIds = new Set(subtree.map((u: any) => String(u._id)));

    /*
     * 3) Identify MRs in the selected subtree.
     */
    const mrUsers = subtree.filter(
      (u: any) =>
        resolveHierarchyRole(u, hierarchyMap.get(String(u._id))) === "MR"
    );

    const mrIds = mrUsers.map((u: any) => String(u._id));

    /*
     * 4) Existing Target-vs-Actual logic:
     * targets are stored against MR users.
     */
    const targetRows = await TargetMaster.find({
      periodMonth,
      targetType: "MR",
      mrUserId: { $in: mrIds },
      status: "Active",
    }).lean();

    const targetByMr = new Map<
      string,
      { salesTarget: number; collectionTarget: number }
    >();

    for (const target of targetRows as any[]) {
      const mrId =
        typeof target.mrUserId === "object"
          ? clean(target.mrUserId?._id)
          : clean(target.mrUserId);

      if (!mrId) continue;

      const old = targetByMr.get(mrId) || {
        salesTarget: 0,
        collectionTarget: 0,
      };

      old.salesTarget += amount(target.targetAmount);
      old.collectionTarget += amount(target.collectionTargetAmount);

      targetByMr.set(mrId, old);
    }

    /*
     * 5) Build aliases for every MR.
     * This follows the existing Target-vs-Actual matching approach:
     * DSM / ASM / RSM fields can identify the MR.
     */
    const mrMeta = mrUsers.map((mr: any) => {
      const id = String(mr._id);

      const aliases = Array.from(
        new Set(
          [
            mr.name,
            mr.employeeCode,
            mr.designation,
            hierarchyMap.get(id)?.userName,
            hierarchyMap.get(id)?.employeeCode,
          ]
            .map(upper)
            .filter(Boolean)
        )
      );

      return {
        id,
        name: mr.name || "",
        employeeCode: mr.employeeCode || "",
        aliases,
      };
    });

    /*
     * 6) Customer assignments for collection.
     * We combine CRM assignments with Customer.DSM mapping so this remains
     * compatible with the existing Target-vs-Actual report data.
     */
    const assignmentRows = await MrCustomerAssignment.find({
      userId: { $in: mrIds },
      status: "Active",
    }).lean();

    const assignedCodesByMr = new Map<string, Set<string>>();

    for (const row of assignmentRows as any[]) {
      const mrId = clean(row.userId);
      if (!mrId) continue;

      const set = assignedCodesByMr.get(mrId) || new Set<string>();

      [
        row.customerCode,
        row.ordno,
        row.codep,
      ]
        .map(upper)
        .filter(Boolean)
        .forEach((code) => set.add(code));

      assignedCodesByMr.set(mrId, set);
    }

    /*
     * Also read accessible customers and their DSM values.
     * This mirrors the customer-code mapping used by Target-vs-Actual.
     */
    const accessibleCustomers = await Customer.find(
      companyFilter,
      {
        ORDNO: 1,
        CODEP: 1,
        CODE: 1,
        SCODE: 1,
        PARNAM: 1,
        DSM: 1,
      }
    ).lean();

    for (const customer of accessibleCustomers as any[]) {
      const customerCodes = [
        customer.ORDNO,
        customer.CODEP,
        customer.CODE,
        customer.SCODE,
        customer.PARNAM,
      ]
        .map(upper)
        .filter(Boolean);

      const dsm = upper(customer.DSM);

      if (!dsm) continue;

      const matchedMr = mrMeta.find((mr) =>
        mr.aliases.some((alias) => dsm === alias || dsm.includes(alias))
      );

      if (!matchedMr) continue;

      const set = assignedCodesByMr.get(matchedMr.id) || new Set<string>();

      customerCodes.forEach((code) => set.add(code));

      assignedCodesByMr.set(matchedMr.id, set);
    }

    /*
     * 7) Fetch month sales and collections once.
     * This is intentionally month-scoped for performance.
     */
    const salesRows = await SalesMdis.find(
      combineFilters(companyFilter, {
        DATE: { $gte: startDate, $lte: endDate },
      }),
      {
        DATE: 1,
        NETAMT: 1,
        TOTAMT: 1,
        FINAL: 1,
        AMOUNT: 1,
        PARTY: 1,
        CODEP: 1,
        CODE: 1,
        DSM: 1,
        ASM: 1,
        RSM: 1,
        NSM: 1,
        MANAGER: 1,
        DIRECTOR: 1,
      }
    ).lean();

    const collectionRows = await GLedger.find(
      combineFilters(companyFilter, {
        BOOK: "R",
        CD: "C",
        DATE: { $gte: startDate, $lte: endDate },
      }),
      {
        DATE: 1,
        CODE: 1,
        CREDIT: 1,
        AMOUNT: 1,
        DEBIT: 1,
      }
    ).lean();

    /*
     * 8) Prepare per-MR daily maps.
     */
    const mrStats = new Map<string, any>();

    for (const mr of mrMeta) {
      const target = targetByMr.get(mr.id) || {
        salesTarget: 0,
        collectionTarget: 0,
      };

      const assignedCodes = assignedCodesByMr.get(mr.id) || new Set<string>();

      mrStats.set(mr.id, {
        salesTarget: target.salesTarget,
        collectionTarget: target.collectionTarget,
        actualSales: 0,
        actualCollection: 0,
        bills: 0,
        parties: assignedCodes.size,
        workingDays: new Set<string>(),
        dailySales: {} as Record<string, number>,
        dailyCollection: {} as Record<string, number>,
      });
    }

    /*
     * Sales matching:
     * same ownership fields used by Target-vs-Actual:
     * DSM / ASM / RSM / NSM / MANAGER / DIRECTOR.
     */
    for (const row of salesRows as any[]) {
      const date = getDate(row.DATE);
      if (date < startDate || date > endDate) continue;

      const owners = [
        row.DSM,
        row.ASM,
        row.RSM,
        row.NSM,
        row.MANAGER,
        row.DIRECTOR,
      ]
        .map(upper)
        .filter(Boolean);

      const saleAmount = amount(
        row.NETAMT ??
          row.TOTAMT ??
          row.FINAL ??
          row.AMOUNT ??
          0
      );

      if (!saleAmount) continue;

      for (const mr of mrMeta) {
        const matched = mr.aliases.some((alias) =>
          owners.some((owner) => owner === alias || owner.includes(alias))
        );

        if (!matched) continue;

        const stats = mrStats.get(mr.id);
        if (!stats) continue;

        stats.actualSales += saleAmount;
        stats.bills += 1;
        stats.workingDays.add(date);
        stats.dailySales[date] =
          (stats.dailySales[date] || 0) + saleAmount;
      }
    }

    /*
     * Collection matching:
     * same GLedger receipt filters used by Target-vs-Actual.
     */
    for (const row of collectionRows as any[]) {
      const date = getDate(row.DATE);
      if (date < startDate || date > endDate) continue;

      const code = upper(row.CODE);
      if (!code) continue;

      const collectionAmount = amount(
        row.CREDIT ?? row.AMOUNT ?? row.DEBIT ?? 0
      );

      if (!collectionAmount) continue;

      for (const mr of mrMeta) {
        const assignedCodes = assignedCodesByMr.get(mr.id) || new Set<string>();

        if (!assignedCodes.has(code)) continue;

        const stats = mrStats.get(mr.id);
        if (!stats) continue;

        stats.actualCollection += collectionAmount;
        stats.dailyCollection[date] =
          (stats.dailyCollection[date] || 0) + collectionAmount;
      }
    }

    /*
     * 9) Build per-MR monthly + weekly + daily performance.
     */
    const mrPerformance = mrMeta.map((mr) => {
      const stats = mrStats.get(mr.id);

      const dailyTargetSales = stats.salesTarget / totalDays;
      const dailyTargetCollection = stats.collectionTarget / totalDays;

      const dailyBreakdown = Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const date = `${periodMonth}-${String(day).padStart(2, "0")}`;

        const actualSales = amount(stats.dailySales[date]);
        const actualCollection = amount(stats.dailyCollection[date]);

        return {
          date,
          day,
          salesTarget: dailyTargetSales,
          actualSales,
          salesAchievement: achievement(actualSales, dailyTargetSales),
          collectionTarget: dailyTargetCollection,
          actualCollection,
          collectionAchievement: achievement(
            actualCollection,
            dailyTargetCollection
          ),
        };
      });

      const weeks = getWeeks(periodMonth, totalDays);

      const weeklyBreakdown = weeks.map((week) => {
        let actualSales = 0;
        let actualCollection = 0;

        for (let day = week.startDay; day <= week.endDay; day++) {
          const date = `${periodMonth}-${String(day).padStart(2, "0")}`;
          actualSales += amount(stats.dailySales[date]);
          actualCollection += amount(stats.dailyCollection[date]);
        }

        const days = week.endDay - week.startDay + 1;
        const salesTarget = (stats.salesTarget * days) / totalDays;
        const collectionTarget =
          (stats.collectionTarget * days) / totalDays;

        return {
          ...week,
          salesTarget,
          actualSales,
          salesShortfall: Math.max(0, salesTarget - actualSales),
          salesAchievement: achievement(actualSales, salesTarget),
          collectionTarget,
          actualCollection,
          collectionShortfall: Math.max(
            0,
            collectionTarget - actualCollection
          ),
          collectionAchievement: achievement(
            actualCollection,
            collectionTarget
          ),
        };
      });

      return {
        _id: mr.id,
        name: mr.name,
        employeeCode: mr.employeeCode,
        salesTarget: stats.salesTarget,
        actualSales: stats.actualSales,
        salesShortfall: Math.max(
          0,
          stats.salesTarget - stats.actualSales
        ),
        salesAchievement: achievement(
          stats.actualSales,
          stats.salesTarget
        ),
        collectionTarget: stats.collectionTarget,
        actualCollection: stats.actualCollection,
        collectionShortfall: Math.max(
          0,
          stats.collectionTarget - stats.actualCollection
        ),
        collectionAchievement: achievement(
          stats.actualCollection,
          stats.collectionTarget
        ),
        bills: stats.bills,
        parties: stats.parties,
        workingDays: stats.workingDays.size,
        weeklyBreakdown,
        dailyBreakdown,
      };
    });

    const mrPerformanceMap = new Map(
      mrPerformance.map((row) => [row._id, row])
    );

    /*
     * 10) Aggregate selected employee's entire recursive MR subtree.
     */
    function aggregateFor(userId: string) {
      const selectedMrRows = mrPerformance.filter((mr) =>
        subtreeIds.has(mr._id)
      );

      // For a drill-down employee, recompute the subtree of that employee.
      const selectedIds = new Set<string>();
      const q = [userId];
      const seen = new Set<string>();

      while (q.length) {
        const id = q.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        selectedIds.add(id);

        for (const child of childrenByParent.get(id) || []) {
          q.push(String(child._id));
        }
      }

      const rows = selectedMrRows.filter((mr) => selectedIds.has(mr._id));

      const summary = rows.reduce(
        (acc: any, row: any) => {
          acc.salesTarget += row.salesTarget;
          acc.actualSales += row.actualSales;
          acc.salesShortfall += row.salesShortfall;
          acc.collectionTarget += row.collectionTarget;
          acc.actualCollection += row.actualCollection;
          acc.collectionShortfall += row.collectionShortfall;
          acc.bills += row.bills;
          acc.parties += row.parties;
          acc.mrCount += 1;
          acc.workingDays = Math.max(
            acc.workingDays,
            row.workingDays || 0
          );
          return acc;
        },
        {
          salesTarget: 0,
          actualSales: 0,
          salesShortfall: 0,
          collectionTarget: 0,
          actualCollection: 0,
          collectionShortfall: 0,
          bills: 0,
          parties: 0,
          mrCount: 0,
          workingDays: 0,
        }
      );

      const dailyBreakdown = Array.from(
        { length: totalDays },
        (_, index) => {
          const day = index + 1;
          const date = `${periodMonth}-${String(day).padStart(2, "0")}`;

          const actualSales = rows.reduce(
            (sum, row: any) =>
              sum +
              amount(
                row.dailyBreakdown.find(
                  (d: any) => d.date === date
                )?.actualSales
              ),
            0
          );

          const actualCollection = rows.reduce(
            (sum, row: any) =>
              sum +
              amount(
                row.dailyBreakdown.find(
                  (d: any) => d.date === date
                )?.actualCollection
              ),
            0
          );

          const salesTarget = rows.reduce(
            (sum, row: any) =>
              sum +
              amount(
                row.dailyBreakdown.find(
                  (d: any) => d.date === date
                )?.salesTarget
              ),
            0
          );

          const collectionTarget = rows.reduce(
            (sum, row: any) =>
              sum +
              amount(
                row.dailyBreakdown.find(
                  (d: any) => d.date === date
                )?.collectionTarget
              ),
            0
          );

          return {
            date,
            day,
            salesTarget,
            actualSales,
            salesAchievement: achievement(
              actualSales,
              salesTarget
            ),
            collectionTarget,
            actualCollection,
            collectionAchievement: achievement(
              actualCollection,
              collectionTarget
            ),
          };
        }
      );

      const weeklyBreakdown = getWeeks(periodMonth, totalDays).map(
        (week) => {
          const weekRows = dailyBreakdown.filter(
            (d) =>
              d.day >= week.startDay && d.day <= week.endDay
          );

          const salesTarget = weekRows.reduce(
            (sum, d) => sum + d.salesTarget,
            0
          );
          const actualSales = weekRows.reduce(
            (sum, d) => sum + d.actualSales,
            0
          );
          const collectionTarget = weekRows.reduce(
            (sum, d) => sum + d.collectionTarget,
            0
          );
          const actualCollection = weekRows.reduce(
            (sum, d) => sum + d.actualCollection,
            0
          );

          return {
            ...week,
            salesTarget,
            actualSales,
            salesShortfall: Math.max(
              0,
              salesTarget - actualSales
            ),
            salesAchievement: achievement(
              actualSales,
              salesTarget
            ),
            collectionTarget,
            actualCollection,
            collectionShortfall: Math.max(
              0,
              collectionTarget - actualCollection
            ),
            collectionAchievement: achievement(
              actualCollection,
              collectionTarget
            ),
          };
        }
      );

      return {
        ...summary,
        salesAchievement: achievement(
          summary.actualSales,
          summary.salesTarget
        ),
        collectionAchievement: achievement(
          summary.actualCollection,
          summary.collectionTarget
        ),
        dailyBreakdown,
        weeklyBreakdown,
      };
    }

    const selectedMetrics = aggregateFor(selectedUserId);

    /*
     * 11) Direct reports of selected employee.
     * This is what the drill-down table displays.
     */
    const directReports = (childrenByParent.get(selectedUserId) || []).map(
      (user: any) => {
        const userId = String(user._id);
        const metrics = aggregateFor(userId);

        return {
          _id: userId,
          name: user.name || "",
          employeeCode: user.employeeCode || "",
          role: getHierarchyDisplayRole(
            user,
            hierarchyMap.get(userId)
          ),
          designation: user.designation || "",
          ...metrics,
        };
      }
    );

    const tree = buildTree(
      hierarchyUsers,
      String(access.userId),
      hierarchyMap
    );

    /*
     * 12) Return both hierarchy and performance data.
     */
    return NextResponse.json({
      success: true,
      periodMonth,
      currentUserId: String(access.userId),
      currentUserRole: access.role,
      selectedUser: {
        _id: selectedUserId,
        name: selected.name || "",
        employeeCode: selected.employeeCode || "",
        designation: selected.designation || "",
        role: getHierarchyDisplayRole(
          selected,
          hierarchyMap.get(selectedUserId)
        ),
        reportsTo: selected.reportsTo || null,
      },
      metrics: selectedMetrics,
      directReports,
      users: subtree.map((user: any) => {
        const userId = String(user._id);
        const metrics = aggregateFor(userId);

        return {
          _id: userId,
          name: user.name || "",
          employeeCode: user.employeeCode || "",
          designation: user.designation || "",
          role: getHierarchyDisplayRole(
            user,
            hierarchyMap.get(userId)
          ),
          reportsTo: user.reportsTo || null,
          ...metrics,
        };
      }),
      tree,
    });
  } catch (error: any) {
    console.error("My Team Performance API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to load team performance",
      },
      { status: 500 }
    );
  }
}
