import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Backward-compatible helper for Server Components importing directly from route
 */
export async function fetchUsersList(req?: Request) {
  try {
    const currentUser = await getCurrentUser();
    let requestedCompanyId: string | null = null;
    if (req) {
      try {
        const url = new URL(req.url);
        requestedCompanyId = url.searchParams.get("companyId");
      } catch {}
    }
    const result = await UserService.fetchUsers(currentUser, requestedCompanyId);
    return {
      success: true,
      users: result.users,
      hierarchy: result.hierarchy,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch users" };
  }
}

export async function GET(req: NextRequest, props: any) {
  return withAuth(UserController.listUsers)(req, props);
}

export async function POST(req: NextRequest, props: any) {
  return withAuth(UserController.createUser, { requireAdmin: true })(req, props);
}
