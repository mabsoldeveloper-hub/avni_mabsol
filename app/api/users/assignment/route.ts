import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import MrTerritory from "@/models/MrTerritory";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import { getCurrentUser } from "@/lib/auth";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";

export const dynamic = "force-dynamic";

// ==========================================
// GET - Retrieve Full Assignment Profile for a User
// ==========================================
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    const access = await getHierarchyAccess(currentUser);

    if (!currentUser || !access.isAuthenticated) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId parameter is required." },
        { status: 400 }
      );
    }

    const user = await User.findById(userId)
      .populate("roleId", "roleName description")
      .populate("companyId", "companyName companyCode")
      .populate("reportsTo", "name email employeeCode designation");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (!access.isAdmin && !access.accessibleUserIds.includes(String(user._id))) {
      return NextResponse.json(
        { success: false, message: "You are not allowed to view this user's assignments." },
        { status: 403 }
      );
    }

    // Fetch Hierarchy
    const hierarchy = await SalesHierarchy.findOne({ userId });

    // Fetch Territory / Scope
    const territories = await MrTerritory.find({ userId, status: "Active" });

    // Fetch Customer / Party Assignments
    const partyAssignments = await MrCustomerAssignment.find({ userId, status: "Active" });

    // Fetch the complete recursive downline.
    // The frontend can still use directReports; teamUsers is the full subtree.
    const teamUsers = access.isAdmin
      ? await User.find({ reportsTo: userId, status: "Active" })
          .select("name email employeeCode designation mobile roleType status reportsTo")
          .populate("roleId", "roleName")
          .lean()
      : access.accessibleUsers.filter((u: any) => String(u._id) !== String(user._id));

    const directReports = teamUsers.filter((u: any) => String(u.reportsTo || "") === String(user._id));

    return NextResponse.json({
      success: true,
      data: {
        user,
        hierarchy: hierarchy || null,
        territories: territories || [],
        partyAssignments: partyAssignments || [],
        directReports: directReports || [],
        teamUsers: teamUsers || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user assignment details." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST - Save Unified User Assignment (Hierarchy + Scope + Parties)
// ==========================================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    const access = await getHierarchyAccess(currentUser);

    if (!currentUser || !access.isAuthenticated) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      roleLevel, // Role name or level
      reportsTo, // Manager UserId
      state,
      zone,
      region,
      territory,
      notes,
      territoryScopes, // Array of { companyCode, companyName, divisionCode, divisionName, subDivisionCode, subDivisionName, categoryCode, categoryName }
      assignedCustomers, // Array of { customerCode, customerName, city, area }
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(userId).populate("roleId", "roleName");
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (currentUser.tenantId && targetUser.tenantId !== currentUser.tenantId) {
      return NextResponse.json(
        { success: false, message: "Cross-tenant assignment is not allowed." },
        { status: 403 }
      );
    }

    if (!access.isAdmin && !access.accessibleUserIds.includes(String(targetUser._id))) {
      return NextResponse.json(
        { success: false, message: "You are not allowed to assign this user." },
        { status: 403 }
      );
    }

    const roleName = String((targetUser.roleId as any)?.roleName || roleLevel || targetUser.roleType || "").toLowerCase();
    const isAdmin = roleName.includes("admin");

    // 1. Update User Record (reportsTo and roleType)
    let reportsToName = "";
    if (reportsTo && !isAdmin) {
      const parentUser = await User.findById(reportsTo).select("_id name tenantId status");

      if (!parentUser) {
        return NextResponse.json(
          { success: false, message: "Reporting user not found." },
          { status: 400 }
        );
      }

      if (parentUser.status !== "Active") {
        return NextResponse.json(
          { success: false, message: "Reporting user is inactive." },
          { status: 400 }
        );
      }

      if (currentUser.tenantId && parentUser.tenantId !== currentUser.tenantId) {
        return NextResponse.json(
          { success: false, message: "Cross-tenant reporting is not allowed." },
          { status: 403 }
        );
      }

      if (!access.isAdmin && !access.accessibleUserIds.includes(String(parentUser._id))) {
        return NextResponse.json(
          { success: false, message: "You can only assign users within your own hierarchy." },
          { status: 403 }
        );
      }

      if (String(parentUser._id) === String(targetUser._id)) {
        return NextResponse.json(
          { success: false, message: "A user cannot report to themselves." },
          { status: 400 }
        );
      }

      // Prevent cycles such as A -> B -> A.
      let cursor: any = parentUser._id;
      const seen = new Set<string>();
      while (cursor) {
        const cursorId = String(cursor);
        if (seen.has(cursorId)) break;
        seen.add(cursorId);
        if (cursorId === String(targetUser._id)) {
          return NextResponse.json(
            { success: false, message: "Invalid hierarchy: reporting assignment would create a cycle." },
            { status: 400 }
          );
        }
        const parent = await User.findById(cursor).select("reportsTo").lean();
        cursor = parent?.reportsTo || null;
      }

      reportsToName = parentUser.name;
      targetUser.reportsTo = parentUser._id;
    } else {
      // Admin / top-level executive does not report to anyone.
      targetUser.reportsTo = null;
    }

    if (roleLevel) {
      targetUser.roleType = roleLevel;
    }

    await targetUser.save();

    // 2. Save / Update SalesHierarchy Record
    if (roleLevel) {
      const companyCodes = Array.isArray(territoryScopes)
        ? Array.from(new Set(territoryScopes.map((t: any) => t.companyCode).filter(Boolean)))
        : [];
      const divisionCodes = Array.isArray(territoryScopes)
        ? Array.from(new Set(territoryScopes.map((t: any) => t.divisionCode).filter(Boolean)))
        : [];

      await SalesHierarchy.findOneAndUpdate(
        { userId },
        {
          userId,
          userName: targetUser.name,
          employeeCode: targetUser.employeeCode || "",
          roleLevel,
          state: (state || "").trim(),
          zone: (zone || "").trim(),
          region: (region || "").trim(),
          territory: (territory || "").trim(),
          reportsTo: isAdmin ? null : (reportsTo || null),
          reportsToName: isAdmin ? "" : reportsToName,
          assignedCompanyCodes: companyCodes,
          assignedDivisionCodes: divisionCodes,
          notes: (notes || "").trim(),
          status: "Active",
        },
        { upsert: true, new: true }
      );
    }

    // 3. Save Territory Scope Records (MrTerritory)
    if (Array.isArray(territoryScopes)) {
      await MrTerritory.deleteMany({ userId });

      if (territoryScopes.length > 0) {
        const territoryDocs = territoryScopes.map((t: any) => ({
          userId,
          userName: targetUser.name,
          employeeCode: targetUser.employeeCode || "",
          companyCode: (t.companyCode || "").trim(),
          companyName: (t.companyName || "").trim(),
          divisionCode: (t.divisionCode || "").trim().toUpperCase(),
          divisionName: (t.divisionName || "").trim(),
          subDivisionCode: (t.subDivisionCode || "").trim().toUpperCase(),
          subDivisionName: (t.subDivisionName || "").trim(),
          categoryCode: (t.categoryCode || "").trim().toUpperCase(),
          categoryName: (t.categoryName || "").trim(),
          notes: (t.notes || "").trim(),
          status: "Active",
        }));

        await MrTerritory.insertMany(territoryDocs, { ordered: false });
      }
    }

    // 4. Save Customer / Party Assignments (MrCustomerAssignment)
    if (Array.isArray(assignedCustomers)) {
      await MrCustomerAssignment.deleteMany({ userId });

      const uniqueMap = new Map<string, any>();
      assignedCustomers.forEach((c: any) => {
        const code = (c.customerCode || c.code || "").toString().trim();
        const name = (c.customerName || c.name || "").toString().trim();
        if (code && !uniqueMap.has(code.toLowerCase())) {
          uniqueMap.set(code.toLowerCase(), {
            customerCode: code,
            customerName: name,
            city: (c.city || "").toString().trim(),
            area: (c.area || "").toString().trim(),
          });
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());

      if (uniqueItems.length > 0) {
        const partyDocs = uniqueItems.map((c: any) => ({
          userId,
          userName: targetUser.name,
          employeeCode: targetUser.employeeCode || "",
          customerCode: c.customerCode,
          customerName: c.customerName,
          city: c.city,
          area: c.area,
          assignedBy: currentUser?._id || null,
          status: "Active",
        }));

        await MrCustomerAssignment.insertMany(partyDocs, { ordered: false });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Assignments updated successfully for ${targetUser.name}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update user assignments." },
      { status: 500 }
    );
  }
}
