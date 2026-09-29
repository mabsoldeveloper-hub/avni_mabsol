import { NextRequest, NextResponse } from "next/server";

// Valid role identifiers in the system
const VALID_ROLES = new Set([
  "admin",
  "super-admin",
  "reception",
  "manager",
  "sales-executive",
  "mr",
  "asm",
  "rsm",
  "zsm",
  "nsm",
  "vp",
  "director",
  "md",
  "telecaller",
  "operator",
  "accountant",
  "user",
]);

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: any): boolean {
  if (!payload) return true;
  if (typeof payload.exp === "number") {
    return payload.exp * 1000 <= Date.now();
  }
  return false;
}

function extractUserRole(payload: any): string {
  if (!payload) return "admin";
  if (payload.isSuperAdmin || payload.roleType === "SuperAdmin") {
    return "super-admin";
  }

  // Dynamic admin check from token properties
  const roleName = String(payload.roleName || "").toLowerCase().trim();
  const roleType = String(payload.roleType || "").toLowerCase().trim();
  const role = String(payload.role || "").toLowerCase().trim();
  const dashboardType = String(payload.dashboardType || "").toLowerCase().trim();

  if (
    roleName === "admin" ||
    roleName.includes("admin") ||
    roleType === "admin" ||
    role === "admin" ||
    dashboardType === "admin" ||
    payload.isAdmin === true
  ) {
    return "admin";
  }

  if (payload.roleName) {
    const rn = String(payload.roleName).toLowerCase().trim().replace(/[\s_]+/g, "-");
    if (VALID_ROLES.has(rn)) return rn;
  }

  if (payload.roleType) {
    const r = String(payload.roleType).toLowerCase().trim().replace(/[\s_]+/g, "-");
    if (VALID_ROLES.has(r)) return r;
  }
  if (payload.role) {
    const r = String(payload.role).toLowerCase().trim().replace(/[\s_]+/g, "-");
    if (VALID_ROLES.has(r)) return r;
  }
  return "admin";
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const token = req.cookies.get("token")?.value;
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token || isTokenExpired(payload)) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("token");
      return response;
    }

    const userRole = extractUserRole(payload);
    const segments = pathname.split("/").filter(Boolean); // ["dashboard", ...]

    // Case 1: Exact root "/dashboard" -> redirect to /dashboard/${userRole}
    if (segments.length === 1) {
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard/${userRole}`;
      return NextResponse.redirect(url);
    }

    const firstSub = segments[1]?.toLowerCase();

    // If an Admin user is on /dashboard/mr or /dashboard/mr/..., auto-correct to /dashboard/admin/...
    if (userRole === "admin" && firstSub === "mr") {
      const remainingPath = segments.slice(2).join("/");
      const url = req.nextUrl.clone();
      url.pathname = remainingPath ? `/dashboard/admin/${remainingPath}` : `/dashboard/admin`;
      url.search = search;
      return NextResponse.redirect(url);
    }

    // Case 2: First segment is already a valid role (e.g. /dashboard/admin/..., /dashboard/super-admin/...)
    if (VALID_ROLES.has(firstSub)) {
      return NextResponse.next();
    }

    // Case 3: URL is missing role (e.g. /dashboard/sales/invoice, /dashboard/mabsolcrmsync, /dashboard/settings, /dashboard/profile)
    // Automatically inject the user's role: /dashboard/${userRole}/${remainingPath}
    const remainingPath = segments.slice(1).join("/");
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${userRole}/${remainingPath}`;
    url.search = search; // Preserve query parameters
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
