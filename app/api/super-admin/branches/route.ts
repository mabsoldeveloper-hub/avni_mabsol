import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can access branch network.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = searchParams.get("status") || "all";
    const headOfficeId = searchParams.get("headOfficeId") || "all";

    // 1. Fetch all companies with parentCompanyId populated
    const allCompanies = await Company.find()
      .populate("parentCompanyId", "companyName companyCode isHeadOffice city state gstNo")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Fetch admin users for all companies
    const adminUsers = await User.find({
      email: { $ne: currentUser.email.toLowerCase() },
      role: { $in: ["Admin", "admin", ""] },
    })
      .select("name email mobile companyId isApproved status")
      .lean();

    const userMap = new Map<string, any>();
    adminUsers.forEach((u) => {
      if (u.companyId) {
        userMap.set(u.companyId.toString(), u);
      }
    });

    // 3. Separate Head Offices and Child Branches
    const headOffices: any[] = [];
    const childBranchesByParent = new Map<string, any[]>();
    const allChildBranches: any[] = [];

    for (const comp of allCompanies as any[]) {
      const compId = comp._id.toString();
      comp.adminUser = userMap.get(compId) || null;

      if (!comp.parentCompanyId || comp.isHeadOffice) {
        headOffices.push(comp);
      } else {
        const pId = comp.parentCompanyId?._id?.toString() || comp.parentCompanyId?.toString();
        if (pId) {
          const list = childBranchesByParent.get(pId) || [];
          list.push(comp);
          childBranchesByParent.set(pId, list);
        }
        allChildBranches.push(comp);
      }
    }

    // Attach children to each Head Office
    let branchNetworks = headOffices.map((ho) => {
      const hoId = ho._id.toString();
      const branches = childBranchesByParent.get(hoId) || [];
      return {
        ...ho,
        branchCount: branches.length,
        branches,
      };
    });

    // 4. Apply Filters
    if (headOfficeId !== "all") {
      branchNetworks = branchNetworks.filter((bn) => bn._id.toString() === headOfficeId);
    }

    if (statusFilter !== "all") {
      branchNetworks = branchNetworks.map((bn) => {
        const matchesStatus = bn.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchingBranches = bn.branches.filter(
          (b: any) => b.status?.toLowerCase() === statusFilter.toLowerCase()
        );
        return {
          ...bn,
          branches: matchingBranches,
          branchCount: matchingBranches.length,
          _selfMatches: matchesStatus,
        };
      }).filter((bn) => bn._selfMatches || bn.branches.length > 0);
    }

    if (search) {
      branchNetworks = branchNetworks.map((bn) => {
        const hoMatch =
          bn.companyName?.toLowerCase().includes(search) ||
          bn.companyCode?.toLowerCase().includes(search) ||
          bn.gstNo?.toLowerCase().includes(search) ||
          bn.city?.toLowerCase().includes(search) ||
          bn.email?.toLowerCase().includes(search);

        const matchingBranches = bn.branches.filter((b: any) =>
          b.companyName?.toLowerCase().includes(search) ||
          b.companyCode?.toLowerCase().includes(search) ||
          b.gstNo?.toLowerCase().includes(search) ||
          b.city?.toLowerCase().includes(search) ||
          b.email?.toLowerCase().includes(search)
        );

        return {
          ...bn,
          branches: matchingBranches,
          branchCount: matchingBranches.length,
          _selfMatches: hoMatch,
        };
      }).filter((bn) => bn._selfMatches || bn.branches.length > 0);
    }

    // 5. Compute global network stats
    const totalHeadOffices = headOffices.length;
    const totalChildBranches = allChildBranches.length;
    const totalEnterpriseNodes = allCompanies.length;
    const activeBranches = allCompanies.filter((c: any) => c.status === "Active").length;
    const pendingBranches = allCompanies.filter((c: any) => c.status === "Pending").length;
    const suspendedBranches = allCompanies.filter(
      (c: any) => c.status === "Suspended" || c.status === "Inactive"
    ).length;

    return NextResponse.json({
      success: true,
      branchNetworks,
      allHeadOffices: headOffices.map((ho) => ({
        _id: ho._id,
        companyName: ho.companyName,
        companyCode: ho.companyCode,
        city: ho.city,
      })),
      stats: {
        totalHeadOffices,
        totalChildBranches,
        totalEnterpriseNodes,
        activeBranches,
        pendingBranches,
        suspendedBranches,
      },
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN BRANCHES API ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can update branches.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { companyId, companyIds, status, enabledModules, isHeadOffice } = body;

    if (!companyId && (!Array.isArray(companyIds) || companyIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: "companyId or companyIds array is required" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (enabledModules !== undefined) updates.enabledModules = enabledModules;
    if (isHeadOffice !== undefined) updates.isHeadOffice = Boolean(isHeadOffice);

    // Batch update multiple branches (e.g. Suspend All / Activate All)
    if (Array.isArray(companyIds) && companyIds.length > 0) {
      await Company.updateMany({ _id: { $in: companyIds } }, { $set: updates });
      if (status) {
        const userStatus = status === "Active" ? "Active" : status === "Suspended" ? "Suspended" : "Pending";
        const isApproved = status === "Active";
        await User.updateMany(
          { companyId: { $in: companyIds } },
          { $set: { status: userStatus, isApproved } }
        );
      }
      return NextResponse.json({
        success: true,
        message: `${companyIds.length} branches updated successfully.`,
      });
    }

    const updatedCompany = await Company.findByIdAndUpdate(companyId, { $set: updates }, { new: true });
    if (!updatedCompany) {
      return NextResponse.json(
        { success: false, message: "Branch or company not found" },
        { status: 404 }
      );
    }

    // Also sync User approval and status if status changed
    if (status) {
      const userStatus = status === "Active" ? "Active" : status === "Suspended" ? "Suspended" : "Pending";
      const isApproved = status === "Active";
      await User.updateMany(
        { companyId },
        { $set: { status: userStatus, isApproved } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Branch "${updatedCompany.companyName}" (${updatedCompany.companyCode}) updated successfully.`,
      company: updatedCompany,
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN BRANCH PATCH ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
