import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { RoleController } from "@/app/api/roles/role.controller";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, props: any) {
  return withAuth(RoleController.setUserPermissions, { requireAdmin: true })(req, props);
}