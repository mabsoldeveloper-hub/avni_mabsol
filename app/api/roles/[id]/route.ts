import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { RoleController } from "../role.controller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: any) {
  return withAuth(RoleController.getById)(req, props);
}

export async function PUT(req: NextRequest, props: any) {
  return withAuth(RoleController.update, { requireAdmin: true })(req, props);
}

export async function DELETE(req: NextRequest, props: any) {
  return withAuth(RoleController.remove, { requireAdmin: true })(req, props);
}