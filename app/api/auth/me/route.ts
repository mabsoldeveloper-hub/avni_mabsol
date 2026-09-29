import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCurrentUser } from "@/lib/auth";
import Company from "@/models/Company";
import Tenant from "@/models/Tenant";
import VfpConfig from "@/models/VfpConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized or session expired",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }

  const userObj = typeof (user as any).toObject === "function" ? (user as any).toObject() : { ...user };
  const email = String(userObj.email || "").toLowerCase().trim();
  const superEmail = String(process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
  const roleType = String(userObj.roleType || "").toLowerCase().trim();
  const role = String(userObj.role || "").toLowerCase().trim();
  const roleName = String(userObj.roleName || userObj.roleId?.roleName || "").toLowerCase().trim();
  const name = String(userObj.name || "").toLowerCase().trim();

  const isSuperAdmin = Boolean(
    userObj.isSuperAdmin ||
    email === superEmail ||
    roleType === "superadmin" ||
    role === "superadmin" ||
    roleName === "superadmin" ||
    roleName === "super admin" ||
    name.includes("super admin") ||
    name.includes("super administrator")
  );

  if (isSuperAdmin) {
    userObj.isSuperAdmin = true;
    userObj.roleType = "SuperAdmin";
    userObj.role = "SuperAdmin";
    userObj.roleName = "SuperAdmin";
  } else {
    const isAdmin = Boolean(
      roleName === "admin" ||
      roleName.includes("admin") ||
      roleType === "admin" ||
      role === "admin" ||
      userObj.isAdmin === true ||
      userObj.dashboardType === "admin"
    );

    if (isAdmin) {
      userObj.roleType = "Admin";
      userObj.roleName = "Admin";
      userObj.role = "Admin";
      userObj.isAdmin = true;
    }

    // Non-super-admin: verify if active and approved
    const statusLower = String(userObj.status || "").trim().toLowerCase();
    const isSuspendedOrInactive =
      !userObj.isApproved ||
      statusLower === "suspended" ||
      statusLower === "inactive" ||
      statusLower === "deactivated" ||
      statusLower === "deactive" ||
      statusLower === "disabled" ||
      statusLower === "pendingapproval" ||
      statusLower === "rejected";

    if (isSuspendedOrInactive) {
      const response = NextResponse.json(
        {
          success: false,
          suspended: true,
          message: "Your account has been deactivated or suspended by the Super Administrator.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
      response.cookies.delete("token");
      return response;
    }

    // Check time-bound validity expiry
    if (!userObj.isUnlimitedAccess && userObj.accessValidUntil) {
      const expiryDate = new Date(userObj.accessValidUntil);
      if (expiryDate.getTime() <= Date.now()) {
        const response = NextResponse.json(
          {
            success: false,
            expired: true,
            message: "Your account access period has expired. Please contact the Super Administrator.",
          },
          {
            status: 403,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
          }
        );
        response.cookies.delete("token");
        return response;
      }
    }
  }

  try {
    if (!userObj.companyName) {
      if (userObj.companyId) {
        const comp: any = await Company.findById(userObj.companyId).lean();
        if (comp) userObj.companyName = comp.companyName || comp.name || "";
      }
      if (!userObj.companyName && userObj.tenantId) {
        const tenant: any = await Tenant.findOne({ tenantId: userObj.tenantId }).lean();
        if (tenant) userObj.companyName = tenant.companyName || tenant.name || "";
      }
      if (!userObj.companyName) {
        const vfp: any = await VfpConfig.findOne({ email: userObj.email }).lean();
        if (vfp) userObj.companyName = vfp.companyName || "";
      }
    }
  } catch {}

  const response = NextResponse.json(
    {
      success: true,
      user: userObj,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );

  // If user is Admin, ensure cookie has the normalized Admin roleType to eliminate stale MR tokens
  if (userObj.roleType === "Admin" || userObj.roleName === "Admin" || isSuperAdmin) {
    try {
      const activeRoleType = isSuperAdmin ? "SuperAdmin" : "Admin";
      const token = jwt.sign(
        {
          id: userObj._id,
          email: userObj.email,
          tenantId: userObj.tenantId,
          roleId: userObj.roleId?._id || userObj.roleId,
          roleName: activeRoleType,
          roleType: activeRoleType,
          companyId: userObj.companyId?._id || userObj.companyId,
          isSuperAdmin: Boolean(isSuperAdmin),
        },
        process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026",
        { expiresIn: "30d" }
      );
      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    } catch {}
  }

  return response;
}