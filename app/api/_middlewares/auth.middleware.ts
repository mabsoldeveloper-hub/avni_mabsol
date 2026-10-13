import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import "@/models/Company";
import { errorResponse } from "@/app/api/_utils/response";

export interface AuthenticatedContext {
  user: any;
  decoded: {
    id: string;
    email: string;
    tenantId?: string;
    roleId?: string;
    roleName?: string;
    companyId?: string;
    roleType?: string;
    isSuperAdmin?: boolean;
    [key: string]: any;
  };
  params?: any;
}

export interface AuthOptions {
  roles?: string[];
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
}

export function withAuth(
  handler: (req: NextRequest, ctx: AuthenticatedContext) => Promise<NextResponse | Response>,
  options?: AuthOptions
) {
  return async (req: NextRequest, routeProps?: { params?: Promise<any> | any }): Promise<NextResponse | Response> => {
    try {
      await connectDB();

      // 1. Extract Token from cookie or Bearer header
      const cookieToken = req.cookies.get("token")?.value;
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      const token = cookieToken || bearerToken;

      if (!token) {
        return errorResponse("Authentication required. Please sign in.", 401);
      }

      // 2. Cryptographic signature verification
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("[CRITICAL SECURITY] JWT_SECRET environment variable is missing!");
        return errorResponse("Server security configuration error.", 500);
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, secret);
      } catch {
        return errorResponse("Session expired or invalid token. Please sign in again.", 401);
      }

      if (!decoded || !decoded.id) {
        return errorResponse("Invalid authentication credentials.", 401);
      }

      // 3. Retrieve user record and verify account status
      const user = await User.findById(decoded.id)
        .populate("companyId", "companyName logo enabledModules isHeadOffice parentCompanyId status companyCode")
        .populate("roleId", "roleName dashboardType");

      if (!user) {
        return errorResponse("User account not found.", 401);
      }

      // Account status check
      const status = String(user.status || "").toLowerCase();
      if (status === "inactive" || status === "suspended" || status === "disabled" || status === "deactivated" || user.isDeleted) {
        return errorResponse("Your account is currently inactive or suspended. Please contact your administrator.", 403);
      }

      // 4. Role Authorization Checks
      const isSuper = Boolean(user.isSuperAdmin || decoded.isSuperAdmin || user.roleType === "SuperAdmin");
      const userRole = String(user.roleType || decoded.roleType || user.roleName || "").toLowerCase().trim();
      const isAdmin = isSuper || userRole === "admin" || userRole.includes("admin");

      if (options?.requireSuperAdmin && !isSuper) {
        return errorResponse("Access denied. Super Administrator privileges required.", 403);
      }

      if (options?.requireAdmin && !isAdmin) {
        return errorResponse("Access denied. Administrator privileges required.", 403);
      }

      if (options?.roles && options.roles.length > 0) {
        const allowedRoles = options.roles.map((r) => r.toLowerCase().trim());
        const hasMatchingRole = isSuper || allowedRoles.includes(userRole);
        if (!hasMatchingRole) {
          return errorResponse("Access denied. You do not have permission to perform this action.", 403);
        }
      }

      // Resolve route params if provided by Next.js
      let resolvedParams: any = undefined;
      if (routeProps?.params) {
        resolvedParams = routeProps.params instanceof Promise ? await routeProps.params : routeProps.params;
      }

      // 5. Delegate to handler with authenticated context
      return await handler(req, {
        user,
        decoded,
        params: resolvedParams,
      });
    } catch (error: any) {
      console.error("[AUTH MIDDLEWARE ERROR]:", error);
      return errorResponse(error?.message || "Internal server error", 500);
    }
  };
}
