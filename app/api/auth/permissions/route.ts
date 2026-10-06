import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import RolePermission from "@/models/RolePermission";
import UserPermission from "@/models/UserPermission";
import Permission from "@/models/Permission";

export const dynamic = "force-dynamic";

/**
 * GET EFFECTIVE PERMISSIONS
 *
 * Permission priority:
 *
 * 1. SuperAdmin / Admin
 *    -> Full access
 *
 * 2. RolePermission
 *    -> Default permissions of user's role
 *
 * 3. UserPermission
 *    -> User-specific override
 *
 * UserPermission allow:false ALWAYS overrides
 * RolePermission allow:true.
 */
export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          permissions: [],
          isAdmin: false,
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // ADMIN / SUPER ADMIN
    // ---------------------------------------------------------

    const isAdmin =
      user.role === "Admin" ||
      user.roleType === "Admin" ||
      (user.roleId as any)?.roleName === "Admin";

    const isSuperAdmin =
      user.role === "SuperAdmin" ||
      user.roleType === "SuperAdmin" ||
      Boolean((user as any).isSuperAdmin) ||
      user.email?.toLowerCase() === "mabsoldeveloper@gmail.com";

    if (isAdmin || isSuperAdmin) {
      const allPermissions = await Permission.find({
        status: "Active",
      })
        .select("permissionKey")
        .lean();

      const allKeys = allPermissions
        .map((permission: any) => permission.permissionKey)
        .filter(Boolean);

      /*
       * Core permissions are always available to Admin.
       * "*" means complete access in PermissionContext.
       */
      const adminCoreKeys = [
        "*",

        "dashboard.view",
        "dashboard.kpi",
        "dashboard.analytics",

        "company.view",
        "company.create",
        "company.edit",
        "company.delete",

        "users.view",
        "users.create",
        "users.edit",
        "users.delete",

        "leads.view",
        "leads.create",
        "leads.edit",
        "leads.delete",

        "orders.view",
        "orders.create",
        "orders.edit",
        "orders.delete",

        "sales.view",
        "sales.create",
        "sales.edit",
        "sales.delete",

        "stock.view",
        "stock.create",
        "stock.edit",
        "stock.delete",

        "targets.view",
        "targets.create",
        "targets.edit",
        "targets.delete",

        "reports.view",

        "settings.view",
        "settings.edit",

        "master.view",
        "master.create",
        "master.edit",
        "master.delete",
      ];

      const permissions = Array.from(
        new Set([
          ...adminCoreKeys,
          ...allKeys,
        ])
      );

      return NextResponse.json({
        success: true,
        isAdmin: true,
        isSuperAdmin,
        permissions,
      });
    }

    // ---------------------------------------------------------
    // NORMAL USER
    // ---------------------------------------------------------

    const effectivePermissions = new Set<string>();

    // ---------------------------------------------------------
    // 1. ROLE PERMISSIONS
    // ---------------------------------------------------------

    if (user.roleId) {
      const rolePermissions = await RolePermission.find({
        roleId: user.roleId,
        allow: true,
      })
        .populate("permissionId")
        .lean();

      for (const item of rolePermissions as any[]) {
        const permissionKey =
          item?.permissionId?.permissionKey;

        if (permissionKey) {
          effectivePermissions.add(permissionKey);
        }
      }
    }

    // ---------------------------------------------------------
    // 2. USER-SPECIFIC PERMISSIONS
    // ---------------------------------------------------------

    const userPermissions = await UserPermission.find({
      userId: user._id,
    })
      .populate("permissionId")
      .lean();

    /*
     * IMPORTANT:
     *
     * allow:true
     *    -> add permission
     *
     * allow:false
     *    -> REMOVE permission
     *
     * Therefore a user's explicit permission overrides
     * the permission inherited from their role.
     */
    for (const item of userPermissions as any[]) {
      const permissionKey =
        item?.permissionId?.permissionKey;

      if (!permissionKey) {
        continue;
      }

      if (item.allow === true) {
        effectivePermissions.add(permissionKey);
      } else {
        effectivePermissions.delete(permissionKey);
      }
    }

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      isAdmin: false,
      isSuperAdmin: false,
      permissions: Array.from(effectivePermissions),
    });
  } catch (error: any) {
    console.error(
      "PERMISSIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        permissions: [],
        isAdmin: false,
        error:
          error?.message ||
          "Failed to load permissions",
      },
      {
        status: 500,
      }
    );
  }
}