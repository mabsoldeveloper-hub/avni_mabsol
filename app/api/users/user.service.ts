import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import Company from "@/models/Company";
import "@/models/Role";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";
import { isReservedSuperAdminEmail } from "@/lib/constants/superAdmin.constant";

export class UserService {
  static async fetchUsers(currentUser: any, requestedCompanyId?: string | null) {
    const access = await getHierarchyAccess(currentUser);

    if (!access.isAuthenticated) {
      throw new Error("Unauthorized");
    }

    const userCompany = currentUser?.companyId
      ? await Company.findById(currentUser.companyId).lean()
      : null;
    const isChildBranchUser = Boolean(userCompany && !userCompany.isHeadOffice);

    let targetCompanyId: string | null = null;
    if (isChildBranchUser && userCompany) {
      targetCompanyId = String(userCompany._id);
    } else if (
      requestedCompanyId &&
      requestedCompanyId !== "ALL" &&
      requestedCompanyId !== "undefined" &&
      requestedCompanyId !== "null"
    ) {
      targetCompanyId = requestedCompanyId;
    } else if (currentUser?.companyId && !requestedCompanyId) {
      targetCompanyId = String(currentUser.companyId);
    }

    let userQuery: any = {};
    if (
      targetCompanyId &&
      targetCompanyId !== "undefined" &&
      targetCompanyId !== "null" &&
      mongoose.Types.ObjectId.isValid(targetCompanyId)
    ) {
      const targetObjId = new mongoose.Types.ObjectId(targetCompanyId);

      if (access.isAdmin) {
        userQuery = { companyId: targetObjId, status: { $ne: "Inactive" } };
      } else {
        userQuery = {
          _id: { $in: access.accessibleUserIds.map(String) },
          companyId: targetObjId,
          status: "Active",
        };
      }
    } else if (userCompany?.isHeadOffice && (!requestedCompanyId || requestedCompanyId === "ALL")) {
      const childCompanies = await Company.find({ parentCompanyId: userCompany._id }, { _id: 1 }).lean();
      const allCompIds = [userCompany._id, ...childCompanies.map((c: any) => c._id)];
      if (access.isAdmin) {
        userQuery = { companyId: { $in: allCompIds }, status: { $ne: "Inactive" } };
      } else {
        userQuery = {
          _id: { $in: access.accessibleUserIds.map(String) },
          companyId: { $in: allCompIds },
          status: "Active",
        };
      }
    } else {
      userQuery = access.isAdmin
        ? { ...(currentUser?.tenantId ? { tenantId: currentUser.tenantId } : {}), status: { $ne: "Inactive" } }
        : { _id: { $in: access.accessibleUserIds.map(String) }, status: "Active" };
    }

    userQuery.isDeleted = { $ne: true };

    const users = await User.find(userQuery)
      .select("-password")
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 })
      .lean();

    const hierarchies = await SalesHierarchy.find({
      userId: { $in: users.map((u: any) => u._id) },
      status: "Active",
    }).lean();

    const hierarchyMap = new Map<string, any>();
    hierarchies.forEach((h: any) => {
      if (h.userId) hierarchyMap.set(String(h.userId), h);
    });

    const childrenByParent = new Map<string, any[]>();
    users.forEach((u: any) => {
      if (!u.reportsTo) return;
      const parent = String(u.reportsTo);
      const arr = childrenByParent.get(parent) || [];
      arr.push(u);
      childrenByParent.set(parent, arr);
    });

    const enrichedUsers = users.map((u: any) => {
      const uid = String(u._id);
      const h = hierarchyMap.get(uid) || null;
      const directTeamCount = (childrenByParent.get(uid) || []).length;
      return {
        ...u,
        salesHierarchy: h,
        hierarchy: {
          reportsTo: u.reportsTo ? String(u.reportsTo) : null,
          reportsToName: h?.reportsToName || "",
          roleLevel: h?.roleLevel || u.roleType || "",
          directTeamCount,
          isInMyHierarchy: true,
        },
      };
    });

    return {
      users: enrichedUsers,
      hierarchy: {
        currentUserId: access.userId,
        currentRole: access.role,
        isAdmin: access.isAdmin,
        totalAccessibleUsers: enrichedUsers.length,
      },
    };
  }

  static async fetchUserById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid User ID format");
    }

    const user: any = await User.findById(id)
      .select("-password")
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .lean();

    if (!user) return null;

    const hierarchy = await SalesHierarchy.findOne({ userId: id, status: "Active" }).lean();

    return {
      ...user,
      salesHierarchy: hierarchy || null,
    };
  }

  static async createUser(data: any, creatorUser?: any) {
    const {
      employeeCode,
      name,
      email,
      password,
      mobile,
      companyId,
      roleId,
      department,
      designation,
      gender,
      dob,
      joiningDate,
      address,
      city,
      state,
      country,
      pincode,
      profilePhoto,
      status,
      salesHierarchyRole,
      salesHierarchyState,
      salesHierarchyRegion,
      salesHierarchyReportsTo,
    } = data;

    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "") : "";

    if (!cleanEmail || !password || !name) {
      throw new Error("Name, email, and password are required");
    }

    if (isReservedSuperAdminEmail(cleanEmail)) {
      throw new Error("This email address is reserved for the Super Administrator and cannot be used.");
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      throw new Error("An account with this email address already exists.");
    }

    if (cleanMobile) {
      const existingMobile = await User.findOne({ mobile: cleanMobile });
      if (existingMobile) {
        throw new Error("An account with this mobile number already exists.");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let assignedCompanyId = companyId;
    if (!assignedCompanyId && creatorUser?.companyId) {
      assignedCompanyId = creatorUser.companyId;
    }

    const user = await User.create({
      employeeCode,
      name,
      email: cleanEmail,
      password: hashedPassword,
      mobile: cleanMobile,
      companyId: assignedCompanyId,
      tenantId: creatorUser?.tenantId || undefined,
      roleId,
      department,
      designation,
      gender,
      dob,
      joiningDate,
      address,
      city,
      state,
      country,
      pincode,
      profilePhoto,
      status: status || "Active",
      isApproved: status === "Active",
      createdBy: creatorUser?._id,
    });

    if (salesHierarchyRole && salesHierarchyRole !== "None" && salesHierarchyRole !== "") {
      let reportsToName = "";
      if (salesHierarchyReportsTo) {
        const parentUser = await User.findById(salesHierarchyReportsTo);
        if (parentUser) reportsToName = parentUser.name;
      }

      await SalesHierarchy.create({
        userId: user._id,
        userName: user.name,
        employeeCode: user.employeeCode || "",
        roleLevel: salesHierarchyRole,
        state: (salesHierarchyState || "").trim(),
        region: (salesHierarchyRegion || "").trim(),
        reportsTo: salesHierarchyReportsTo || null,
        reportsToName,
        status: "Active",
      });
    }

    const result = user.toObject();
    delete (result as any).password;
    return result;
  }

  static async updateUser(id: string, data: any, modifierUser?: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid User ID format");
    }

    const body = { ...data };

    if (body.isSuperAdmin !== undefined && !modifierUser?.isSuperAdmin) {
      delete body.isSuperAdmin;
    }

    if (body.email) {
      const cleanEmail = String(body.email).toLowerCase().trim();
      if (isReservedSuperAdminEmail(cleanEmail) && !modifierUser?.isSuperAdmin) {
        throw new Error("This email address is reserved for the Super Administrator and cannot be used.");
      }
      const duplicateEmail = await User.findOne({
        email: cleanEmail,
        _id: { $ne: id },
      });
      if (duplicateEmail) {
        throw new Error("This email address is already in use by another user.");
      }
      body.email = cleanEmail;
    }

    if (body.mobile) {
      const cleanMobile = String(body.mobile).replace(/\D/g, "");
      if (cleanMobile) {
        const duplicateMobile = await User.findOne({
          mobile: cleanMobile,
          _id: { $ne: id },
        });
        if (duplicateMobile) {
          throw new Error("This mobile number is already in use by another user.");
        }
        body.mobile = cleanMobile;
      }
    }

    if (body.password && body.password.trim() !== "") {
      body.password = await bcrypt.hash(body.password, 10);
    } else {
      delete body.password;
    }

    if (body.status) {
      const s = String(body.status).trim().toLowerCase();
      if (s === "inactive" || s === "suspended" || s === "deactivated" || s === "deactive" || s === "disabled") {
        body.isApproved = false;
        body.status = "Inactive";
      } else if (s === "active") {
        body.isApproved = true;
        body.status = "Active";
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, body, { new: true })
      .select("-password")
      .populate("companyId", "companyName")
      .populate("roleId", "roleName");

    if (!updatedUser) {
      throw new Error("User not found");
    }

    if (body.salesHierarchyRole && body.salesHierarchyRole !== "None" && body.salesHierarchyRole !== "") {
      let reportsToName = "";
      if (body.salesHierarchyReportsTo) {
        const parentUser = await User.findById(body.salesHierarchyReportsTo);
        if (parentUser) reportsToName = parentUser.name;
      }

      await SalesHierarchy.findOneAndUpdate(
        { userId: id },
        {
          userId: id,
          userName: updatedUser.name,
          employeeCode: updatedUser.employeeCode || "",
          roleLevel: body.salesHierarchyRole,
          state: (body.salesHierarchyState || "").trim(),
          region: (body.salesHierarchyRegion || "").trim(),
          reportsTo: body.salesHierarchyReportsTo || null,
          reportsToName,
          status: "Active",
        },
        { upsert: true, new: true }
      );
    } else if (body.salesHierarchyRole === "None") {
      await SalesHierarchy.findOneAndDelete({ userId: id });
    }

    return updatedUser;
  }

  static async deleteUser(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid User ID format");
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, status: "Inactive", isApproved: false },
      { new: true }
    );

    if (!user) {
      throw new Error("User not found");
    }

    await SalesHierarchy.findOneAndUpdate({ userId: id }, { status: "Inactive" });

    return { message: "User deleted successfully" };
  }
}
