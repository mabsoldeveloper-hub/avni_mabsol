import mongoose from "mongoose";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";
import UserPermission from "@/models/UserPermission";

export class RoleService {
  static async listRoles() {
    return await Role.find().sort({ roleName: 1 }).lean();
  }

  static async getRoleById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Role ID format");
    }
    return await Role.findById(id).lean();
  }

  static async createRole(data: any) {
    if (!data.roleName || !data.roleName.trim()) {
      throw new Error("Role name is required");
    }
    return await Role.create(data);
  }

  static async updateRole(id: string, data: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Role ID format");
    }
    const updated = await Role.findByIdAndUpdate(id, data, { new: true });
    if (!updated) {
      throw new Error("Role not found");
    }
    return updated;
  }

  static async deleteRole(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Role ID format");
    }
    await Role.findByIdAndDelete(id);
    await RolePermission.deleteMany({ roleId: id });
    return { success: true };
  }

  static async setRolePermissions(roleId: string, permissions: any[]) {
    if (!roleId) throw new Error("Role ID is required");
    await RolePermission.deleteMany({ roleId });
    if (Array.isArray(permissions) && permissions.length > 0) {
      await RolePermission.insertMany(permissions);
    }
    return { success: true };
  }

  static async setUserPermissions(userId: string, permissions: any[]) {
    if (!userId) throw new Error("User ID is required");
    await UserPermission.deleteMany({ userId });
    if (Array.isArray(permissions) && permissions.length > 0) {
      const docs = permissions
        .filter((p: any) => p?.permissionId)
        .map((p: any) => ({
          userId,
          permissionId: p.permissionId,
          allow: p.allow === true,
        }));
      if (docs.length > 0) {
        await UserPermission.insertMany(docs);
      }
    }
    return { success: true };
  }

  static async getUserPermissions(userId: string) {
    if (!userId) throw new Error("User ID is required");
    return await UserPermission.find({ userId }).populate("permissionId").lean();
  }
}
