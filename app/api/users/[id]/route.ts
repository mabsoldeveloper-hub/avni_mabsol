import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { UserController } from "../user.controller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: any) {
  return withAuth(UserController.getUserById)(req, props);
}

export async function PUT(req: NextRequest, props: any) {
  return withAuth(UserController.updateUser, { requireAdmin: true })(req, props);
}

export async function DELETE(req: NextRequest, props: any) {
  return withAuth(UserController.deleteUser, { requireAdmin: true })(req, props);
}