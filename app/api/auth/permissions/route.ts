import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import RolePermission from "@/models/RolePermission";
import UserPermission from "@/models/UserPermission";
import Permission from "@/models/Permission";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          permissions: [],
        },
        {
          status: 401,
        }
      );
    }

    // ─── Super Admin / Workspace Owner has Full Access ─────────────────────────
    if (
      user.role === "SuperAdmin" ||
      user.roleType === "SuperAdmin" ||
      user.email?.toLowerCase() === "mabsoldeveloper@gmail.com" ||
      (user as any).isSuperAdmin ||
      user.role === "Admin" ||
      user.roleType === "Admin" ||
      (user.roleId as any)?.roleName === "Admin"
    ) {
      const allPermissions = await Permission.find({ status: "Active" }).lean();
      const allKeys = allPermissions.map((p: any) => p.permissionKey);

      const adminCoreKeys = [
        "*",
        "dashboard.view",
        "dashboard.kpi",
        "dashboard.analytics",
        "company.view",
        "company.create",
        "company.edit",
        "users.view",
        "users.create",
        "users.edit",
        "leads.view",
        "leads.create",
        "leads.edit",
        "orders.view",
        "sales.view",
        "stock.view",
        "targets.view",
        "reports.view",
        "settings.view",
        "master.view",
      ];

      return NextResponse.json({
        success: true,
        isAdmin: true,
        permissions: Array.from(new Set([...adminCoreKeys, ...allKeys])),
      });
    }

    // ─── Role Permissions ──────────────────────────────────────────────────────
    const rolePermissions = user.roleId
      ? await RolePermission.find({
          roleId: user.roleId,
          allow: true,
        }).populate("permissionId")
      : [];

    // ─── User Permissions ──────────────────────────────────────────────────────
    const userPermissions = await UserPermission.find({
      userId: user._id,
      allow: true,
    }).populate("permissionId");

    // ─── Merge ────────────────────────────────────────────────────────────────
    const finalPermissions = new Set<string>();

    rolePermissions.forEach((item: any) => {
      if (item.permissionId?.permissionKey) {
        finalPermissions.add(item.permissionId.permissionKey);
      }
    });

    userPermissions.forEach((item: any) => {
      if (item.permissionId?.permissionKey) {
        finalPermissions.add(item.permissionId.permissionKey);
      }
    });

    return NextResponse.json({
      success: true,
      permissions: [...finalPermissions],
    });
  } catch (error: any) {
    console.error("PERMISSIONS ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        permissions: [],
      },
      {
        status: 500,
      }
    );
  }
}