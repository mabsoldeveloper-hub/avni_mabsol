import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";
import { USER_APPROVAL_STATUS } from "@/lib/constants/superAdmin.constant";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Access denied. Only Super Administrator can view branch dossier." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // 1. Resolve Company: Search either by Company ID or by User ID whose companyId matches
    let branchCompany: any = await Company.findById(id)
      .populate("parentCompanyId")
      .lean();

    if (!branchCompany) {
      // Check if id is an admin User id
      const possibleUser: any = await User.findById(id).lean();
      if (possibleUser?.companyId) {
        branchCompany = await Company.findById(possibleUser.companyId)
          .populate("parentCompanyId")
          .lean();
      }
    }

    if (!branchCompany) {
      return NextResponse.json(
        { success: false, message: "Branch record not found." },
        { status: 404 }
      );
    }

    // 2. Fetch Admin User for this branch
    const branchAdminUser = await User.findOne({
      companyId: branchCompany._id,
      role: { $in: ["Admin", "admin", ""] },
      isDeleted: { $ne: true },
    })
      .select("name email mobile roleType roleName status isApproved lastLoginAt createdAt accessValidUntil accessDurationDays")
      .lean();

    // 3. If parent company exists, fetch parent company & its admin user for subscription inheritance
    let parentCompany = branchCompany.parentCompanyId || null;
    let parentAdminUser = null;

    if (parentCompany?._id) {
      parentAdminUser = await User.findOne({
        companyId: parentCompany._id,
        role: { $in: ["Admin", "admin", ""] },
        isDeleted: { $ne: true },
      })
        .select("name email mobile accessValidUntil accessDurationDays status isApproved createdAt")
        .lean();
    }

    return NextResponse.json({
      success: true,
      branch: branchCompany,
      parentCompany,
      adminUser: branchAdminUser,
      parentAdminUser,
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN BRANCH GET ERROR]:", err);
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
        { success: false, message: "Access denied. Only Super Administrator can update branch." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Resolve branch company
    let branchCompany: any = await Company.findById(id);
    if (!branchCompany) {
      const possibleUser = await User.findById(id);
      if (possibleUser?.companyId) {
        branchCompany = await Company.findById(possibleUser.companyId);
      }
    }

    if (!branchCompany) {
      return NextResponse.json(
        { success: false, message: "Branch record not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { status, enabledModules, action, durationDays, gstNo, panNo, drugLicenseNo, address, city, state, pincode, companyName, name } = body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (enabledModules !== undefined) updates.enabledModules = enabledModules;
    if (companyName !== undefined && typeof companyName === "string") updates.companyName = companyName.trim();
    if (gstNo !== undefined) updates.gstNo = gstNo;
    if (panNo !== undefined) updates.panNo = panNo;
    if (drugLicenseNo !== undefined) updates.drugLicenseNo = drugLicenseNo;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;

    if (Object.keys(updates).length > 0) {
      await Company.findByIdAndUpdate(branchCompany._id, { $set: updates });
    }

    if (name && typeof name === "string") {
      await User.findOneAndUpdate(
        { companyId: branchCompany._id, role: { $in: ["Admin", "admin", ""] } },
        { $set: { name: name.trim() } }
      );
    }

    // Sync users if enabledModules changed
    if (enabledModules !== undefined) {
      await User.updateMany(
        { companyId: branchCompany._id, isSuperAdmin: { $ne: true } },
        { $set: { enabledModules } }
      );
    }

    // Sync users if status changed
    if (status !== undefined) {
      const userStatus = status === "Active" ? "Active" : status === "Suspended" ? "Suspended" : "Pending";
      const isApproved = status === "Active";
      await User.updateMany(
        { companyId: branchCompany._id },
        { $set: { status: userStatus, isApproved } }
      );
    }

    // Handle Subscription Days adjustment
    if (action === "adjust_days") {
      const deltaDays = Number(durationDays || 0);
      const now = new Date();

      // Find the subscription holding user (either parent admin user or branch admin user)
      let targetUser: any = null;
      if (branchCompany.parentCompanyId) {
        targetUser = await User.findOne({
          companyId: branchCompany.parentCompanyId,
          role: { $in: ["Admin", "admin", ""] },
          isDeleted: { $ne: true },
        });
      }
      if (!targetUser) {
        targetUser = await User.findOne({
          companyId: branchCompany._id,
          role: { $in: ["Admin", "admin", ""] },
          isDeleted: { $ne: true },
        });
      }

      if (targetUser) {
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
        await targetUser.save();
      }
    }

    const updated = await Company.findById(branchCompany._id).populate("parentCompanyId").lean();

    return NextResponse.json({
      success: true,
      message: `Branch "${branchCompany.companyName}" updated successfully.`,
      branch: updated,
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN BRANCH PATCH ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
