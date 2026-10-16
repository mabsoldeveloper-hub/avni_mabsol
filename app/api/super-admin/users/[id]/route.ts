import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";
import {
  USER_APPROVAL_STATUS,
  DEFAULT_ACCESS_DAYS,
} from "@/lib/constants/superAdmin.constant";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Access denied. Only Super Administrator can view this." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const user: any = await User.findById(id)
      .populate({
        path: "companyId",
        populate: {
          path: "parentCompanyId",
          select: "companyName companyCode isHeadOffice city state gstNo",
        },
      })
      .populate("approvedBy", "name email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // If company exists, retrieve any attached child branches with full details & branch admin users
    if (user.companyId?._id) {
      const Company = (await import("@/models/Company")).default;
      const childBranches = await Company.find({
        parentCompanyId: user.companyId._id,
      })
        .select("companyName companyCode gstNo panNo drugLicenseNo city state address pincode status email mobile enabledModules isHeadOffice createdAt")
        .lean();

      if (childBranches && childBranches.length > 0) {
        const branchIds = childBranches.map((b: any) => b._id);
        const branchUsers = await User.find({
          companyId: { $in: branchIds },
          isDeleted: { $ne: true },
        })
          .select("name email mobile roleType roleName status isApproved companyId employeeCode enabledModules lastLoginAt createdAt")
          .lean();

        const branchUserMap = new Map<string, any>();
        branchUsers.forEach((bu: any) => {
          branchUserMap.set(String(bu.companyId), bu);
        });

        childBranches.forEach((b: any) => {
          b.adminUser = branchUserMap.get(String(b._id)) || null;
        });
      }

      user.childBranches = childBranches || [];
      user.branchCount = childBranches ? childBranches.length : 0;
    }

    // Only fallback to company if user.enabledModules is undefined/null
    if (!Array.isArray(user.enabledModules)) {
      if (Array.isArray(user.companyId?.enabledModules)) {
        user.enabledModules = user.companyId.enabledModules;
      } else {
        user.enabledModules = [];
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error("[SUPER ADMIN USER GET ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Access denied. Only Super Administrator can perform this action." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action, durationDays, customExpiryDate, approvalNotes, sessionTimeoutHours } = body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    switch (action) {
      case "approve": {
        const days = durationDays !== undefined ? Number(durationDays) : DEFAULT_ACCESS_DAYS;
        targetUser.isApproved = true;
        targetUser.status = USER_APPROVAL_STATUS.ACTIVE;
        targetUser.approvedAt = now;
        targetUser.approvedBy = currentUser._id;
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;

        targetUser.isUnlimitedAccess = false;
        targetUser.accessDurationDays = days;
        if (customExpiryDate) {
          targetUser.accessValidUntil = new Date(customExpiryDate);
        } else {
          targetUser.accessValidUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        }
        break;
      }

      case "set_validity": {
        const days = Math.max(1, Number(durationDays || DEFAULT_ACCESS_DAYS));
        targetUser.isApproved = true;
        targetUser.status = USER_APPROVAL_STATUS.ACTIVE;
        targetUser.isUnlimitedAccess = false;
        targetUser.accessDurationDays = days;
        targetUser.accessValidUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "adjust_days":
      case "extend": {
        const deltaDays = Number(durationDays || 0);
        targetUser.isApproved = true;
        targetUser.status = USER_APPROVAL_STATUS.ACTIVE;
        targetUser.isUnlimitedAccess = false;

        let baseTime = now.getTime();
        if (targetUser.accessValidUntil) {
          const currentExpiryTime = new Date(targetUser.accessValidUntil).getTime();
          if (currentExpiryTime > baseTime) {
            baseTime = currentExpiryTime;
          }
        }

        const newExpiryTime = baseTime + deltaDays * 24 * 60 * 60 * 1000;
        targetUser.accessValidUntil = new Date(newExpiryTime);
        targetUser.accessDurationDays = Math.max(0, (targetUser.accessDurationDays || 0) + deltaDays);
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "reject": {
        targetUser.isApproved = false;
        targetUser.status = USER_APPROVAL_STATUS.REJECTED;
        if (approvalNotes || body.reason) targetUser.approvalNotes = approvalNotes || body.reason;
        break;
      }

      case "delete": {
        if (isSuperAdminUser(targetUser)) {
          return NextResponse.json(
            { success: false, message: "Cannot delete the Super Administrator account." },
            { status: 400 }
          );
        }
        targetUser.isDeleted = true;
        targetUser.deletedAt = now;
        targetUser.deletedBy = currentUser._id;
        targetUser.status = USER_APPROVAL_STATUS.DELETED;
        targetUser.isApproved = false;
        targetUser.deletedReason = approvalNotes || body.reason || "Account deleted by Super Administrator";
        break;
      }

      case "restore": {
        targetUser.isDeleted = false;
        targetUser.deletedAt = null;
        targetUser.deletedBy = null;
        targetUser.deletedReason = "";
        targetUser.status = USER_APPROVAL_STATUS.ACTIVE;
        targetUser.isApproved = true;
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "permanent_delete": {
        if (isSuperAdminUser(targetUser)) {
          return NextResponse.json(
            { success: false, message: "Cannot delete the Super Administrator account." },
            { status: 400 }
          );
        }
        await User.findByIdAndDelete(id);
        if (targetUser.companyId) {
          const Company = (await import("@/models/Company")).default;
          await Company.findByIdAndDelete(targetUser.companyId);
        }
        return NextResponse.json({
          success: true,
          message: `User account ${targetUser.name} (${targetUser.email}) and related enterprise data permanently purged.`,
        });
      }

      case "deactivate":
      case "suspend": {
        targetUser.status = USER_APPROVAL_STATUS.SUSPENDED;
        targetUser.isApproved = false;
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "activate": {
        targetUser.isApproved = true;
        targetUser.status = USER_APPROVAL_STATUS.ACTIVE;

        // If access was expired, give default 30 days
        if (
          !targetUser.isUnlimitedAccess &&
          (!targetUser.accessValidUntil || new Date(targetUser.accessValidUntil) <= now)
        ) {
          targetUser.accessDurationDays = DEFAULT_ACCESS_DAYS;
          targetUser.accessValidUntil = new Date(now.getTime() + DEFAULT_ACCESS_DAYS * 24 * 60 * 60 * 1000);
        }
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "setDuration": {
        const days = Number(durationDays);
        if (days === -1) {
          targetUser.isUnlimitedAccess = true;
          targetUser.accessValidUntil = null;
        } else if (customExpiryDate) {
          targetUser.isUnlimitedAccess = false;
          targetUser.accessValidUntil = new Date(customExpiryDate);
        } else if (days > 0) {
          targetUser.isUnlimitedAccess = false;
          targetUser.accessDurationDays = days;
          targetUser.accessValidUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        }
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
      }

      case "update":
      case "update_settings":
      case "update_modules":
      case "manage_modules":
      case "setSessionTimeout": {
        if (Array.isArray(body.enabledModules)) {
          targetUser.enabledModules = body.enabledModules;
        }
        if (sessionTimeoutHours !== undefined && !isNaN(Number(sessionTimeoutHours))) {
          targetUser.sessionTimeoutHours = Number(sessionTimeoutHours);
        }
        if (approvalNotes !== undefined) {
          targetUser.approvalNotes = approvalNotes;
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    if (Array.isArray(body.enabledModules)) {
      targetUser.enabledModules = body.enabledModules;
    }

    if (sessionTimeoutHours !== undefined && !isNaN(Number(sessionTimeoutHours))) {
      targetUser.sessionTimeoutHours = Number(sessionTimeoutHours);
    }

    await targetUser.save();

    // Synchronize changes to Company record & Cascade to all Child Branches
    if (targetUser.companyId) {
      const Company = (await import("@/models/Company")).default;
      const companyUpdates: any = {};

      if (Array.isArray(body.enabledModules)) {
        companyUpdates.enabledModules = body.enabledModules;
      }

      if (action === "approve" || action === "activate") {
        companyUpdates.status = "Active";
        companyUpdates.isDeleted = false;
      } else if (action === "suspend" || action === "deactivate") {
        companyUpdates.status = "Suspended";
      } else if (action === "reject") {
        companyUpdates.status = "Rejected";
      } else if (action === "delete") {
        companyUpdates.status = "Deleted";
        companyUpdates.isDeleted = true;
        companyUpdates.deletedAt = now;
        companyUpdates.deletedBy = currentUser._id;
      } else if (action === "restore") {
        companyUpdates.status = "Active";
        companyUpdates.isDeleted = false;
        companyUpdates.deletedAt = null;
        companyUpdates.deletedBy = null;
      }

      if (Object.keys(companyUpdates).length > 0) {
        await Company.findByIdAndUpdate(targetUser.companyId, { $set: companyUpdates });
      }

      // Synchronize enabledModules to ALL user accounts in this company
      if (Array.isArray(body.enabledModules)) {
        await User.updateMany(
          { companyId: targetUser.companyId, isSuperAdmin: { $ne: true } },
          { $set: { enabledModules: body.enabledModules } }
        );
      }

      // ── CASCADE TO ALL CHILD BRANCHES & BRANCH USERS ──
      const childCompanies = await Company.find({
        parentCompanyId: targetUser.companyId,
      }).select("_id").lean();
      const childCompIds = childCompanies.map((c) => c._id);

      if (childCompIds.length > 0) {
        // Cascade enabledModules permissions to all child branch companies & users
        if (Array.isArray(body.enabledModules)) {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            { $set: { enabledModules: body.enabledModules } }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            { $set: { enabledModules: body.enabledModules } }
          );
        }

        if (action === "approve" || action === "activate") {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            { $set: { status: "Active", isDeleted: false } }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.ACTIVE,
                isApproved: true,
                approvedAt: now,
                approvedBy: currentUser._id,
                accessDurationDays: targetUser.accessDurationDays,
                accessValidUntil: targetUser.accessValidUntil,
                isUnlimitedAccess: Boolean(targetUser.isUnlimitedAccess),
                sessionTimeoutHours: targetUser.sessionTimeoutHours,
              },
            }
          );
        } else if (
          action === "adjust_days" ||
          action === "extend" ||
          action === "set_validity" ||
          action === "setDuration"
        ) {
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.ACTIVE,
                isApproved: true,
                accessDurationDays: targetUser.accessDurationDays,
                accessValidUntil: targetUser.accessValidUntil,
                isUnlimitedAccess: Boolean(targetUser.isUnlimitedAccess),
                sessionTimeoutHours: targetUser.sessionTimeoutHours,
              },
            }
          );
        } else if (action === "suspend" || action === "deactivate") {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            { $set: { status: "Suspended" } }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.SUSPENDED,
                isApproved: false,
              },
            }
          );
        } else if (action === "reject") {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            { $set: { status: "Rejected" } }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.REJECTED,
                isApproved: false,
              },
            }
          );
        } else if (action === "delete") {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            {
              $set: {
                status: "Deleted",
                isDeleted: true,
                deletedAt: now,
                deletedBy: currentUser._id,
              },
            }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.DELETED,
                isDeleted: true,
                isApproved: false,
                deletedAt: now,
                deletedBy: currentUser._id,
                deletedReason: targetUser.deletedReason,
              },
            }
          );
        } else if (action === "restore") {
          await Company.updateMany(
            { _id: { $in: childCompIds } },
            {
              $set: {
                status: "Active",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
              },
            }
          );
          await User.updateMany(
            { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
            {
              $set: {
                status: USER_APPROVAL_STATUS.ACTIVE,
                isDeleted: false,
                isApproved: true,
                deletedAt: null,
                deletedBy: null,
                deletedReason: "",
              },
            }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action === "delete"
          ? `User ${targetUser.name} moved to Deleted Accounts.`
          : action === "restore"
          ? `User ${targetUser.name} restored successfully.`
          : action === "reject"
          ? `User application ${targetUser.name} rejected.`
          : `User ${targetUser.name} updated successfully (${action}).`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        status: targetUser.status,
        isApproved: targetUser.isApproved,
        isDeleted: targetUser.isDeleted,
        deletedAt: targetUser.deletedAt,
        accessValidUntil: targetUser.accessValidUntil,
        accessDurationDays: targetUser.accessDurationDays,
        isUnlimitedAccess: targetUser.isUnlimitedAccess,
        sessionTimeoutHours: targetUser.sessionTimeoutHours,
      },
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN USER ACTION ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Access denied. Only Super Administrator can delete accounts." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const isPermanent = searchParams.get("permanent") === "true";
    const reason = searchParams.get("reason") || "Deleted by Super Administrator";

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Protect Super Admin from deleting themselves
    if (isSuperAdminUser(targetUser)) {
      return NextResponse.json(
        { success: false, message: "Cannot delete the Super Administrator account." },
        { status: 400 }
      );
    }

    const Company = (await import("@/models/Company")).default;

    if (isPermanent) {
      await User.findByIdAndDelete(id);
      if (targetUser.companyId) {
        // Find and purge all child branches
        const childCompanies = await Company.find({ parentCompanyId: targetUser.companyId }).select("_id").lean();
        const childCompIds = childCompanies.map((c) => c._id);
        if (childCompIds.length > 0) {
          await User.deleteMany({ companyId: { $in: childCompIds } });
          await Company.deleteMany({ _id: { $in: childCompIds } });
        }
        await Company.findByIdAndDelete(targetUser.companyId);
      }
      return NextResponse.json({
        success: true,
        message: `User account ${targetUser.name} (${targetUser.email}) and its branch network permanently deleted.`,
      });
    }

    // Soft delete so details remain inspectable exclusively by Super Admin
    const now = new Date();
    targetUser.isDeleted = true;
    targetUser.deletedAt = now;
    targetUser.deletedBy = currentUser._id;
    targetUser.deletedReason = reason;
    targetUser.status = USER_APPROVAL_STATUS.DELETED;
    targetUser.isApproved = false;
    await targetUser.save();

    if (targetUser.companyId) {
      await Company.findByIdAndUpdate(targetUser.companyId, {
        $set: {
          status: "Deleted",
          isDeleted: true,
          deletedAt: now,
          deletedBy: currentUser._id,
        },
      });

      // Cascade soft delete to all child branches and their users
      const childCompanies = await Company.find({ parentCompanyId: targetUser.companyId }).select("_id").lean();
      const childCompIds = childCompanies.map((c) => c._id);
      if (childCompIds.length > 0) {
        await Company.updateMany(
          { _id: { $in: childCompIds } },
          {
            $set: {
              status: "Deleted",
              isDeleted: true,
              deletedAt: now,
              deletedBy: currentUser._id,
            },
          }
        );
        await User.updateMany(
          { companyId: { $in: childCompIds }, isSuperAdmin: { $ne: true } },
          {
            $set: {
              status: USER_APPROVAL_STATUS.DELETED,
              isDeleted: true,
              isApproved: false,
              deletedAt: now,
              deletedBy: currentUser._id,
              deletedReason: reason,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `User account ${targetUser.name} (${targetUser.email}) moved to Deleted Accounts.`,
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN DELETE ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
