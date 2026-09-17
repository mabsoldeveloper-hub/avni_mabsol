import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import MrTerritory from "@/models/MrTerritory";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import { getCurrentUser } from "@/lib/auth";

/**
 * Internal, normalized hierarchy roles.
 * These are NOT database roles. They provide one stable vocabulary for the
 * access-control engine while the actual role comes from Role Master /
 * SalesHierarchy / User data.
 */
export type HierarchyRole =
  | "ADMIN"
  | "DIRECTOR"
  | "MANAGER"
  | "ZSM"
  | "RSM"
  | "ASM"
  | "MR"
  | "OTHER";

export interface HierarchyAccess {
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: HierarchyRole;
  userId: string;
  user: any | null;
  accessibleUserIds: string[];
  accessibleUsers: any[];
  accessibleUserNames: string[];
  mrUserIds: string[];
  mrUserNames: string[];
  assignedCustomerCodes: string[];
  assignedTerritories: any[];
}

const normalize = (value: any) => String(value ?? "").trim().toLowerCase();

const uniqueStrings = (values: any[]) =>
  Array.from(new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean)));

/**
 * Resolve the application's normalized hierarchy role.
 *
 * Priority is deliberate:
 *   1. SalesHierarchy.roleLevel (explicit hierarchy assignment)
 *   2. Role Master roleName
 *   3. designation
 *   4. legacy roleType
 *
 * This prevents User.roleType's default "MR" from incorrectly turning an
 * ASM/RSM/etc. into an MR when a proper hierarchy record exists.
 */
/**
 * Return the role exactly as configured for UI display.
 * This is separate from resolveHierarchyRole(), which is normalized
 * for access-control decisions.
 */
export function getHierarchyDisplayRole(user: any, hierarchy?: any | null): string {
  const role = String(
    hierarchy?.roleLevel ||
      user?.roleId?.roleName ||
      user?.roleType ||
      user?.designation ||
      ""
  ).trim();

  return role || "OTHER";
}

export function resolveHierarchyRole(user: any, hierarchy?: any | null): HierarchyRole {
  const candidates = [
    hierarchy?.roleLevel,
    user?.roleId?.roleName,
    user?.designation,
    user?.roleType,
  ].map(normalize).filter(Boolean);

  const explicitAdmin = candidates.some((x) =>
    x === "admin" || x === "administrator" || x === "super admin" || x === "superadmin"
  );
  if (explicitAdmin || user?.isAdmin === true) return "ADMIN";

  // Check the most explicit hierarchy labels first.
  for (const text of candidates) {
    if (text === "director" || text.includes("sales director") || text.includes("business director")) {
      return "DIRECTOR";
    }
    if (
      text === "zsm" ||
      text === "nsm" ||
      text.includes("zonal sales manager") ||
      text.includes("zonal manager") ||
      text.includes("zone manager")
    ) {
      return "ZSM";
    }
    if (
      text === "rsm" ||
      text.includes("regional sales manager") ||
      text.includes("regional manager") ||
      text.includes("region manager")
    ) {
      return "RSM";
    }
    if (
      text === "asm" ||
      text.includes("area sales manager") ||
      text.includes("area manager")
    ) {
      return "ASM";
    }
    if (
      text === "manager" ||
      text === "sales manager" ||
      text === "nsm" ||
      text.includes("national sales manager") ||
      text.includes("national manager")
    ) {
      return "MANAGER";
    }
  }

  for (const text of candidates) {
    if (
      text === "mr" ||
      text === "m.r." ||
      text === "s.r." ||
      text === "m.r. / s.r." ||
      text === "m.r./s.r." ||
      text === "mr/sr" ||
      text === "mr / sr" ||
      text === "medical representative" ||
      text === "medical rep" ||
      text === "medical representative - mr" ||
      text.includes("medical representative")
    ) {
      return "MR";
    }
  }

  return "OTHER";
}

async function getCurrentUserHierarchyRecord(userId: any) {
  return SalesHierarchy.findOne({ userId, status: "Active" }).lean();
}

/**
 * Return the complete active subtree rooted at rootUser.
 * The current user is always included. Depth is unlimited; reportsTo is the
 * source of truth for the parent/child relationship.
 */
export async function getDescendantUsers(rootUser: any): Promise<any[]> {
  if (!rootUser?._id) return [];

  const baseFilter: any = { status: "Active" };
  if (rootUser.tenantId) baseFilter.tenantId = rootUser.tenantId;

  const users = await User.find(baseFilter)
    .select(
      "name email employeeCode designation department roleType roleId reportsTo zoneCode regionCode headquarter status tenantId companyId"
    )
    .populate("roleId", "roleName description")
    .lean();

  const rootId = String(rootUser._id);
  const byId = new Map<string, any>();
  const childrenByParent = new Map<string, any[]>();

  for (const user of users) {
    const id = String(user._id);
    byId.set(id, user);

    const parentId = user.reportsTo ? String(user.reportsTo) : "";
    if (!parentId) continue;

    const children = childrenByParent.get(parentId) || [];
    children.push(user);
    childrenByParent.set(parentId, children);
  }

  const root = byId.get(rootId) || rootUser;
  const result: any[] = [];
  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const current = id === rootId ? root : byId.get(id);
    if (!current) continue;
    result.push(current);

    for (const child of childrenByParent.get(id) || []) {
      const childId = String(child._id);
      if (!visited.has(childId)) queue.push(childId);
    }
  }

  return result;
}

export async function getHierarchyAccess(currentUserArg?: any): Promise<HierarchyAccess> {
  const currentUser = currentUserArg || (await getCurrentUser());

  const empty: HierarchyAccess = {
    isAuthenticated: false,
    isAdmin: false,
    role: "OTHER",
    userId: "",
    user: null,
    accessibleUserIds: [],
    accessibleUsers: [],
    accessibleUserNames: [],
    mrUserIds: [],
    mrUserNames: [],
    assignedCustomerCodes: [],
    assignedTerritories: [],
  };

  if (!currentUser?._id) return empty;

  const ownHierarchy = await getCurrentUserHierarchyRecord(currentUser._id);
  const role = resolveHierarchyRole(currentUser, ownHierarchy);
  const userId = String(currentUser._id);

  // Only an actual Admin is unrestricted. Manager/Director/etc. are scoped
  // to their own subtree.
  if (role === "ADMIN") {
    const tenantFilter: any = { status: "Active" };
    if (currentUser.tenantId) tenantFilter.tenantId = currentUser.tenantId;

    const allUsers = await User.find(tenantFilter)
      .select(
        "name email employeeCode designation department roleType roleId reportsTo zoneCode regionCode headquarter status tenantId companyId"
      )
      .populate("roleId", "roleName description")
      .lean();

    return {
      isAuthenticated: true,
      isAdmin: true,
      role,
      userId,
      user: currentUser,
      accessibleUserIds: allUsers.map((u: any) => String(u._id)),
      accessibleUsers: allUsers,
      accessibleUserNames: uniqueStrings(allUsers.map((u: any) => u.name)),
      mrUserIds: [],
      mrUserNames: [],
      assignedCustomerCodes: [],
      assignedTerritories: [],
    };
  }

  const accessibleUsers = await getDescendantUsers(currentUser);
  const accessibleUserIds = uniqueStrings(accessibleUsers.map((u: any) => u._id));
  const accessibleUserIdObjects = accessibleUsers.map((u: any) => u._id);

  if (!accessibleUserIds.length) {
    return {
      ...empty,
      isAuthenticated: true,
      role,
      userId,
      user: currentUser,
    };
  }

  const hierarchyRecords = await SalesHierarchy.find({
    userId: { $in: accessibleUserIdObjects },
    status: "Active",
  }).lean();

  const hierarchyByUserId = new Map(
    hierarchyRecords.map((h: any) => [String(h.userId), h])
  );

  const mrUsers = accessibleUsers.filter((u: any) => {
    const hierarchy = hierarchyByUserId.get(String(u._id));
    return resolveHierarchyRole(u, hierarchy) === "MR";
  });

  const [territories, assignments] = await Promise.all([
    MrTerritory.find({ userId: { $in: accessibleUserIdObjects }, status: "Active" }).lean(),
    MrCustomerAssignment.find({
      userId: { $in: accessibleUserIdObjects },
      status: "Active",
    }).lean(),
  ]);

  return {
    isAuthenticated: true,
    isAdmin: false,
    role,
    userId,
    user: currentUser,
    accessibleUserIds,
    accessibleUsers,
    accessibleUserNames: uniqueStrings(accessibleUsers.map((u: any) => u.name)),
    mrUserIds: uniqueStrings(mrUsers.map((u: any) => u._id)),
    mrUserNames: uniqueStrings(mrUsers.map((u: any) => u.name)),
    assignedCustomerCodes: uniqueStrings(
      assignments.map((a: any) => a.customerCode)
    ),
    assignedTerritories: territories,
  };
}

/**
 * Legacy Customer documents store hierarchy members as names/codes rather than
 * User ObjectIds. This helper creates a safe filter for those fields.
 */
export function buildHierarchyNameFilter(access: HierarchyAccess): Record<string, any> {
  if (access.isAdmin) return {};
  if (!access.isAuthenticated) return { _id: null };

  const names = uniqueStrings(access.accessibleUserNames);
  const employeeCodes = uniqueStrings(
    access.accessibleUsers.map((u: any) => u.employeeCode)
  );

  const conditions: any[] = [];
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
      { employeeCode: { $in: employeeCodes } },
      { MR: { $in: employeeCodes } },
      { DSM: { $in: employeeCodes } },
    );
  }

  return conditions.length ? { $or: conditions } : { _id: null };
}

export function buildCustomerAssignmentFilter(access: HierarchyAccess): Record<string, any> {
  if (access.isAdmin) return {};
  if (!access.isAuthenticated) return { _id: null };

  const codes = uniqueStrings(access.assignedCustomerCodes);
  if (!codes.length) return { _id: null };

  return {
    $or: [
      { ORDNO: { $in: codes } },
      { CODEP: { $in: codes } },
      { CODE: { $in: codes } },
    ],
  };
}
