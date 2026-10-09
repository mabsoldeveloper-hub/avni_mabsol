import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import "@/models/Role";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";
import { USER_APPROVAL_STATUS } from "@/lib/constants/superAdmin.constant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can access this area.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";
    const branchTypeFilter = searchParams.get("branchType") || "all"; // 'all' | 'head_office' | 'child_branch'
    const parentCompanyFilter = searchParams.get("parentCompanyId") || "all";
    const searchQuery = (searchParams.get("search") || "").trim();

    const now = new Date();

    // Auto update any expired accounts in DB
    await User.updateMany(
      {
        isApproved: true,
        status: USER_APPROVAL_STATUS.ACTIVE,
        isUnlimitedAccess: { $ne: true },
        accessValidUntil: { $ne: null, $lte: now },
      },
      {
        $set: { status: USER_APPROVAL_STATUS.EXPIRED },
      }
    );

    // Build filter query for User
    const query: any = {};

    if (statusFilter === "deleted") {
      query.isDeleted = true;
    } else {
      // All other status filters strictly exclude deleted accounts
      query.isDeleted = { $ne: true };

      if (statusFilter === "pending") {
        query.$or = [
          { isApproved: false },
          { status: USER_APPROVAL_STATUS.PENDING },
        ];
      } else if (statusFilter === "active" || statusFilter === "approved") {
        query.isApproved = true;
        query.status = USER_APPROVAL_STATUS.ACTIVE;
        query.$or = [
          { isUnlimitedAccess: true },
          { accessValidUntil: null },
          { accessValidUntil: { $gt: now } },
        ];
      } else if (statusFilter === "expired") {
        query.$or = [
          { status: USER_APPROVAL_STATUS.EXPIRED },
          {
            isUnlimitedAccess: false,
            accessValidUntil: { $ne: null, $lte: now },
          },
        ];
      } else if (statusFilter === "rejected") {
        query.status = USER_APPROVAL_STATUS.REJECTED;
      } else if (statusFilter === "suspended" || statusFilter === "deactive") {
        query.$or = [
          { status: USER_APPROVAL_STATUS.SUSPENDED },
          { status: "Inactive" },
          { status: "Deactivated" },
        ];
      }
    }

    // Branch Type filtering via company IDs
    let companyQuery: any = null;
    if (branchTypeFilter === "head_office") {
      companyQuery = {
        $or: [
          { parentCompanyId: null },
          { parentCompanyId: { $exists: false } },
          { isHeadOffice: true },
        ],
      };
    } else if (branchTypeFilter === "child_branch") {
      companyQuery = {
        $or: [
          { parentCompanyId: { $ne: null } },
          { isHeadOffice: false },
        ],
      };
    }

    if (parentCompanyFilter && parentCompanyFilter !== "all") {
      companyQuery = companyQuery || {};
      companyQuery.parentCompanyId = parentCompanyFilter;
    }

    if (companyQuery) {
      const matchingCompanies = await Company.find(companyQuery).select("_id").lean();
      const matchingCompIds = matchingCompanies.map((c) => c._id);
      query.companyId = { $in: matchingCompIds };
    }

    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      
      // Also search against companies (name, code, gstin, city)
      const matchingCompanies = await Company.find({
        $or: [
          { companyName: { $regex: regex } },
          { companyCode: { $regex: regex } },
          { gstNo: { $regex: regex } },
          { city: { $regex: regex } },
          { tenantId: { $regex: regex } },
        ],
      }).select("_id").lean();

      const compIdsFromSearch = matchingCompanies.map((c) => c._id);

      const userOrConditions: any[] = [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { mobile: { $regex: regex } },
        { designation: { $regex: regex } },
        { employeeCode: { $regex: regex } },
      ];

      if (compIdsFromSearch.length > 0) {
        userOrConditions.push({ companyId: { $in: compIdsFromSearch } });
      }

      query.$and = query.$and || [];
      query.$and.push({ $or: userOrConditions });
    }

    // Exclude the Super Admin from the list of users being managed
    query.email = { $ne: currentUser.email.toLowerCase() };

    const users = await User.find(query)
      .select("-password")
      .populate({
        path: "companyId",
        select: "companyName companyCode tenantId isHeadOffice parentCompanyId gstNo panNo drugLicenseNo city state address businessType status enabledModules isDeleted deletedAt",
        populate: {
          path: "parentCompanyId",
          select: "companyName companyCode isHeadOffice city state gstNo",
        },
      })
      .populate("roleId", "roleName")
      .populate("approvedBy", "name email")
      .populate("deletedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Map child branches and branch counts for every company
    const childCompanies = await Company.find({
      parentCompanyId: { $ne: null },
      isDeleted: { $ne: true },
    })
      .select("_id companyName companyCode parentCompanyId status city state gstNo email mobile enabledModules")
      .lean();

    const branchCountMap = new Map<string, number>();
    const childBranchesMap = new Map<string, any[]>();

    for (const child of childCompanies) {
      const pId = child.parentCompanyId?.toString();
      if (pId) {
        branchCountMap.set(pId, (branchCountMap.get(pId) || 0) + 1);
        const list = childBranchesMap.get(pId) || [];
        list.push({
          _id: child._id,
          companyName: child.companyName,
          companyCode: child.companyCode,
          city: child.city,
          state: child.state,
          gstNo: child.gstNo,
          status: child.status,
          email: child.email,
          mobile: child.mobile,
          enabledModules: child.enabledModules || [],
        });
        childBranchesMap.set(pId, list);
      }
    }

    // Attach real branch data to each returned user
    let headOfficesCount = 0;
    let childBranchesCount = 0;

    users.forEach((u: any) => {
      const comp = u.companyId;
      if (comp && comp._id) {
        const cId = comp._id.toString();
        comp.branchCount = branchCountMap.get(cId) || 0;
        comp.childBranches = childBranchesMap.get(cId) || [];

        if (comp.parentCompanyId) {
          childBranchesCount++;
        } else {
          headOfficesCount++;
        }
      }
    });

    // Compute live dashboard stats (exclusive of soft-deleted records for active lists)
    const baseNonDeleted = {
      email: { $ne: currentUser.email.toLowerCase() },
      isDeleted: { $ne: true },
    };

    const [totalCount, pendingCount, activeCount, expiredCount, rejectedCount, suspendedCount, deletedCount, totalCompaniesCount, totalHeadOfficesInDb, totalChildBranchesInDb] =
      await Promise.all([
        User.countDocuments(baseNonDeleted),
        User.countDocuments({
          ...baseNonDeleted,
          $or: [
            { isApproved: false },
            { status: USER_APPROVAL_STATUS.PENDING },
          ],
        }),
        User.countDocuments({
          ...baseNonDeleted,
          isApproved: true,
          status: USER_APPROVAL_STATUS.ACTIVE,
          $or: [
            { isUnlimitedAccess: true },
            { accessValidUntil: null },
            { accessValidUntil: { $gt: now } },
          ],
        }),
        User.countDocuments({
          ...baseNonDeleted,
          $or: [
            { status: USER_APPROVAL_STATUS.EXPIRED },
            {
              isUnlimitedAccess: false,
              accessValidUntil: { $ne: null, $lte: now },
            },
          ],
        }),
        User.countDocuments({
          ...baseNonDeleted,
          status: USER_APPROVAL_STATUS.REJECTED,
        }),
        User.countDocuments({
          ...baseNonDeleted,
          $or: [
            { status: USER_APPROVAL_STATUS.SUSPENDED },
            { status: "Inactive" },
            { status: "Deactivated" },
          ],
        }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          isDeleted: true,
        }),
        Company.countDocuments({ isDeleted: { $ne: true } }),
        Company.countDocuments({
          isDeleted: { $ne: true },
          $or: [
            { parentCompanyId: null },
            { parentCompanyId: { $exists: false } },
            { isHeadOffice: true },
          ],
        }),
        Company.countDocuments({
          isDeleted: { $ne: true },
          parentCompanyId: { $ne: null },
        }),
      ]);

    const deactiveCount = suspendedCount + expiredCount;

    return NextResponse.json({
      success: true,
      users,
      stats: {
        total: totalCount,
        pending: pendingCount,
        active: activeCount,
        expired: expiredCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
        deleted: deletedCount,
        deactive: deactiveCount,
        headOffices: totalHeadOfficesInDb,
        childBranches: totalChildBranchesInDb,
        totalCompanies: totalCompaniesCount,
      },
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN USERS API ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
