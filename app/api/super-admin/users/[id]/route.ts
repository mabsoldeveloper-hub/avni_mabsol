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
    const user = await User.findById(id)
      .populate("companyId")
      .populate("approvedBy", "name email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
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
        if (approvalNotes) targetUser.approvalNotes = approvalNotes;
        break;
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
      case "setSessionTimeout": {
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

    if (sessionTimeoutHours !== undefined && !isNaN(Number(sessionTimeoutHours))) {
      targetUser.sessionTimeoutHours = Number(sessionTimeoutHours);
    }

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name} updated successfully (${action}).`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        status: targetUser.status,
        isApproved: targetUser.isApproved,
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

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `User account ${targetUser.name} (${targetUser.email}) permanently deleted.`,
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN DELETE ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
