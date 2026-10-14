import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "./role.service";
import { AuthenticatedContext } from "@/app/api/_middlewares/auth.middleware";
import { errorResponse, successResponse } from "@/app/api/_utils/response";

export class RoleController {
  static async list(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const roles = await RoleService.listRoles();
      return NextResponse.json(roles);
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - list]:", error);
      return errorResponse(error?.message || "Failed to list roles", 500);
    }
  }

  static async getById(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("Role ID is required", 400);

      const role = await RoleService.getRoleById(id);
      if (!role) return errorResponse("Role not found", 404);

      return NextResponse.json(role);
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - getById]:", error);
      return errorResponse(error?.message || "Failed to fetch role", 500);
    }
  }

  static async create(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const body = await req.json();
      const role = await RoleService.createRole(body);
      return successResponse(role, "Role created successfully", 201);
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - create]:", error);
      return errorResponse(error?.message || "Failed to create role", 400);
    }
  }

  static async update(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("Role ID is required", 400);

      const body = await req.json();
      const updated = await RoleService.updateRole(id, body);
      return NextResponse.json(updated);
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - update]:", error);
      return errorResponse(error?.message || "Failed to update role", 400);
    }
  }

  static async remove(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("Role ID is required", 400);

      await RoleService.deleteRole(id);
      return NextResponse.json({ success: true, message: "Role deleted successfully" });
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - remove]:", error);
      return errorResponse(error?.message || "Failed to delete role", 400);
    }
  }

  static async setRolePermissions(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const body = await req.json();
      await RoleService.setRolePermissions(body.roleId, body.permissions);
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - setRolePermissions]:", error);
      return errorResponse(error?.message || "Failed to save role permissions", 400);
    }
  }

  static async setUserPermissions(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const body = await req.json();
      await RoleService.setUserPermissions(body.userId, body.permissions);
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - setUserPermissions]:", error);
      return errorResponse(error?.message || "Failed to save user permissions", 400);
    }
  }

  static async getUserPermissions(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const userId = ctx.params?.userId;
      if (!userId) return errorResponse("User ID is required", 400);

      const permissions = await RoleService.getUserPermissions(userId);
      return NextResponse.json(permissions);
    } catch (error: any) {
      console.error("[ROLE CONTROLLER ERROR - getUserPermissions]:", error);
      return errorResponse(error?.message || "Failed to fetch user permissions", 500);
    }
  }
}
