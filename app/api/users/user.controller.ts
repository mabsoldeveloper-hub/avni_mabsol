import { NextRequest, NextResponse } from "next/server";
import { UserService } from "./user.service";
import { AuthenticatedContext } from "@/app/api/_middlewares/auth.middleware";
import { errorResponse, successResponse } from "@/app/api/_utils/response";

export class UserController {
  static async listUsers(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const url = new URL(req.url);
      const companyId = url.searchParams.get("companyId");

      const result = await UserService.fetchUsers(ctx.user, companyId);
      return NextResponse.json({
        success: true,
        users: result.users,
        hierarchy: result.hierarchy,
      });
    } catch (error: any) {
      console.error("[USER CONTROLLER ERROR - listUsers]:", error);
      return errorResponse(error?.message || "Failed to fetch users", 500);
    }
  }

  static async getUserById(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("User ID is required", 400);

      const user = await UserService.fetchUserById(id);
      if (!user) return errorResponse("User not found", 404);

      return NextResponse.json(user);
    } catch (error: any) {
      console.error("[USER CONTROLLER ERROR - getUserById]:", error);
      return errorResponse(error?.message || "Failed to fetch user", 500);
    }
  }

  static async createUser(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const body = await req.json();
      const user = await UserService.createUser(body, ctx.user);
      return successResponse(user, "User created successfully", 201);
    } catch (error: any) {
      console.error("[USER CONTROLLER ERROR - createUser]:", error);
      return errorResponse(error?.message || "Failed to create user", 400);
    }
  }

  static async updateUser(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("User ID is required", 400);

      const body = await req.json();
      const updatedUser = await UserService.updateUser(id, body, ctx.user);
      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    } catch (error: any) {
      console.error("[USER CONTROLLER ERROR - updateUser]:", error);
      return errorResponse(error?.message || "Failed to update user", 400);
    }
  }

  static async deleteUser(req: NextRequest, ctx: AuthenticatedContext) {
    try {
      const id = ctx.params?.id;
      if (!id) return errorResponse("User ID is required", 400);

      const result = await UserService.deleteUser(id);
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      console.error("[USER CONTROLLER ERROR - deleteUser]:", error);
      return errorResponse(error?.message || "Failed to delete user", 400);
    }
  }
}
