import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// =========================================================================
// POST /api/users/assignment/bulk-hierarchy
// Assign multiple users of a role to a higher designation reporting manager
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();

    const body = await req.json();
    const {
      userIds, // Array of string User IDs
      reportsTo, // Manager User ID (or null / "" for independent/top-level)
      roleLevel, // Optional updated role level for the users
      state,
      zone,
      region,
      territory,
      notes,
    } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one user to assign." },
        { status: 400 }
      );
    }

    let manager: any = null;
    let reportsToName = "";

    if (reportsTo) {
      manager = await User.findById(reportsTo).populate("roleId", "roleName");
      if (!manager) {
        return NextResponse.json(
          { success: false, message: "Selected higher designation manager not found." },
          { status: 404 }
        );
      }

      // Prevent self-assignment
      if (userIds.includes(String(manager._id))) {
        return NextResponse.json(
          {
            success: false,
            message: "A user cannot be assigned to report to themselves. Please remove the manager from the selection.",
          },
          { status: 400 }
        );
      }

      reportsToName = manager.name;
    }

    // 1. Update User records
    const userUpdatePayload: any = {
      reportsTo: reportsTo ? manager._id : null,
    };

    if (roleLevel && typeof roleLevel === "string" && roleLevel.trim()) {
      userUpdatePayload.roleType = roleLevel.trim();
    }
    if (zone && typeof zone === "string" && zone.trim()) {
      userUpdatePayload.zoneCode = zone.trim();
    }
    if (region && typeof region === "string" && region.trim()) {
      userUpdatePayload.regionCode = region.trim();
    }
    if (territory && typeof territory === "string" && territory.trim()) {
      userUpdatePayload.headquarter = territory.trim();
    }

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: userUpdatePayload }
    );

    // 2. Synchronize / Update SalesHierarchy records for each user
    for (const uid of userIds) {
      const targetUser = await User.findById(uid).populate("roleId", "roleName");
      if (!targetUser) continue;

      const effectiveRole =
        (roleLevel && roleLevel.trim()) ||
        (typeof targetUser.roleId === "object" ? targetUser.roleId?.roleName : targetUser.roleType) ||
        "MR";

      const hierarchyUpdate: any = {
        userName: targetUser.name,
        employeeCode: targetUser.employeeCode || "",
        roleLevel: effectiveRole,
        reportsTo: reportsTo ? manager._id : null,
        reportsToName: reportsTo ? reportsToName : "",
        status: "Active",
      };

      if (state !== undefined && state !== "") hierarchyUpdate.state = state.trim();
      if (zone !== undefined && zone !== "") hierarchyUpdate.zone = zone.trim();
      if (region !== undefined && region !== "") hierarchyUpdate.region = region.trim();
      if (territory !== undefined && territory !== "") hierarchyUpdate.territory = territory.trim();
      if (notes !== undefined && notes !== "") hierarchyUpdate.notes = notes.trim();

      await SalesHierarchy.findOneAndUpdate(
        { userId: uid },
        { $set: hierarchyUpdate },
        { upsert: true, new: true }
      );
    }

    const message = reportsTo
      ? `Successfully assigned ${userIds.length} user(s) to ${reportsToName}.`
      : `Successfully set ${userIds.length} user(s) as independent / top-level.`;

    return NextResponse.json({
      success: true,
      count: userIds.length,
      managerId: reportsTo || null,
      managerName: reportsToName || "Top Level",
      message,
    });
  } catch (error: any) {
    console.error("Bulk hierarchy assignment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to bulk assign hierarchy." },
      { status: 500 }
    );
  }
}
