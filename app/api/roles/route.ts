import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { RoleController } from "./role.controller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: any) {
  return withAuth(RoleController.list)(req, props);
}

export async function POST(req: NextRequest, props: any) {
  return withAuth(RoleController.create, { requireAdmin: true })(req, props);
}