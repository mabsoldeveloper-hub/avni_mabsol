import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import MrTerritory from "@/models/MrTerritory";

export interface HierarchyScopeFilter {
  queryFilter: Record<string, any>;
  accessibleUserIds: string[];
  roleType: "MR" | "RSM" | "ZSM" | "Admin";
}

/**
 * Returns a MongoDB query filter scoped to the logged-in user's role and hierarchy position.
 */
export async function getHierarchyScopeFilter(currentUser: any): Promise<HierarchyScopeFilter> {
  await dbConnect();

  if (!currentUser) {
    return {
      queryFilter: { _id: null }, // Match nothing if unauthenticated
      accessibleUserIds: [],
      roleType: "MR",
    };
  }

  const roleType = currentUser.roleType || (currentUser.roleId?.roleName === "Admin" ? "Admin" : "MR");
  const roleNameStr = String(currentUser.roleName || currentUser.roleId?.roleName || "").toLowerCase();
  const isAdminUser = roleType === "Admin" || roleType === "ADMIN" || currentUser.isAdmin === true || currentUser.isSuperAdmin === true || roleNameStr.includes("admin") || roleNameStr.includes("superadmin");

  // Admin has complete access
  if (isAdminUser) {
    return {
      queryFilter: {},
      accessibleUserIds: [],
      roleType: "Admin",
    };
  }

  const userIdStr = String(currentUser._id || currentUser.id);

  if (roleType === "MR") {
    // Fetch MR's assigned territories
    const territories = await MrTerritory.find({ userId: currentUser._id, status: "Active" }).lean();
    const divisions = territories.map((t: any) => t.divisionCode).filter(Boolean);
    const subDivisions = territories.map((t: any) => t.subDivisionCode).filter(Boolean);

    const mrFilter: Record<string, any> = {
      $or: [
        { MR: currentUser.name },
        { DSM: currentUser.name },
        { employeeCode: currentUser.employeeCode },
      ],
    };

    if (divisions.length > 0) {
      mrFilter.$or.push({ DIVISION: { $in: divisions } });
    }

    return {
      queryFilter: mrFilter,
      accessibleUserIds: [userIdStr],
      roleType: "MR",
    };
  }

  if (roleType === "RSM") {
    // RSM can see data from all MRs reporting to them
    const subordinateMRs = await User.find({ reportsTo: currentUser._id, status: "Active" }).lean();
    const mrUserIds = subordinateMRs.map((u: any) => String(u._id));
    const mrNames = subordinateMRs.map((u: any) => u.name).filter(Boolean);
    mrNames.push(currentUser.name);

    return {
      queryFilter: {
        $or: [
          { RSM: currentUser.name },
          { ASM: currentUser.name },
          { DSM: { $in: mrNames } },
          { MR: { $in: mrNames } },
        ],
      },
      accessibleUserIds: [userIdStr, ...mrUserIds],
      roleType: "RSM",
    };
  }

  if (roleType === "ZSM") {
    // ZSM can see data for all RSMs in their zone and their subordinate MRs
    const subordinateRSMs = await User.find({
      $or: [{ reportsTo: currentUser._id }, { zoneCode: currentUser.zoneCode }],
      status: "Active",
    }).lean();

    const rsmIds = subordinateRSMs.map((u: any) => u._id);
    const subordinateMRs = await User.find({ reportsTo: { $in: rsmIds }, status: "Active" }).lean();

    const allTeamNames = [
      currentUser.name,
      ...subordinateRSMs.map((u: any) => u.name),
      ...subordinateMRs.map((u: any) => u.name),
    ].filter(Boolean);

    const allTeamUserIds = [
      userIdStr,
      ...subordinateRSMs.map((u: any) => String(u._id)),
      ...subordinateMRs.map((u: any) => String(u._id)),
    ];

    return {
      queryFilter: {
        $or: [
          { RSM: { $in: allTeamNames } },
          { ASM: { $in: allTeamNames } },
          { DSM: { $in: allTeamNames } },
          { MR: { $in: allTeamNames } },
          { ZONE: currentUser.zoneCode },
        ],
      },
      accessibleUserIds: allTeamUserIds,
      roleType: "ZSM",
    };
  }

  return {
    queryFilter: {},
    accessibleUserIds: [userIdStr],
    roleType: "MR",
  };
}
