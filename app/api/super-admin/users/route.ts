import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Company";
import "@/models/Role";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";
import { USER_APPROVAL_STATUS } from "@/lib/constants/superAdmin.constant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can access this area.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";
    const searchQuery = (searchParams.get("search") || "").trim();

    const now = new Date();

    // Auto update any expired accounts in DB
    await User.updateMany(
      {
        isApproved: true,
        status: USER_APPROVAL_STATUS.ACTIVE,
        isUnlimitedAccess: { $ne: true },
        accessValidUntil: { $ne: null, $lte: now },
      },
      {
        $set: { status: USER_APPROVAL_STATUS.EXPIRED },
      }
    );

    // Build filter query
    const query: any = {};

    if (statusFilter === "pending") {
      query.$or = [
        { isApproved: false },
        { status: USER_APPROVAL_STATUS.PENDING },
      ];
    } else if (statusFilter === "active") {
      query.isApproved = true;
      query.status = USER_APPROVAL_STATUS.ACTIVE;
      query.$or = [
        { isUnlimitedAccess: true },
        { accessValidUntil: null },
        { accessValidUntil: { $gt: now } },
      ];
    } else if (statusFilter === "expired") {
      query.$or = [
        { status: USER_APPROVAL_STATUS.EXPIRED },
        {
          isUnlimitedAccess: false,
          accessValidUntil: { $ne: null, $lte: now },
        },
      ];
    } else if (statusFilter === "rejected") {
      query.status = USER_APPROVAL_STATUS.REJECTED;
    } else if (statusFilter === "suspended" || statusFilter === "deactive") {
      query.$or = [
        { status: USER_APPROVAL_STATUS.SUSPENDED },
        { status: USER_APPROVAL_STATUS.REJECTED },
        { status: USER_APPROVAL_STATUS.EXPIRED },
        { status: "Inactive" },
        { status: "Deactivated" },
      ];
    }

    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
          { mobile: { $regex: regex } },
          { designation: { $regex: regex } },
          { employeeCode: { $regex: regex } },
        ],
      });
    }

    // Exclude the Super Admin from the list of users being managed
    query.email = { $ne: currentUser.email.toLowerCase() };

    const users = await User.find(query)
      .select("-password")
      .populate("companyId", "companyName gstNo city state address businessType")
      .populate("roleId", "roleName")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Compute live dashboard stats
    const [totalCount, pendingCount, activeCount, expiredCount, rejectedCount, suspendedCount] =
      await Promise.all([
        User.countDocuments({ email: { $ne: currentUser.email.toLowerCase() } }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          $or: [
            { isApproved: false },
            { status: USER_APPROVAL_STATUS.PENDING },
          ],
        }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          isApproved: true,
          status: USER_APPROVAL_STATUS.ACTIVE,
          $or: [
            { isUnlimitedAccess: true },
            { accessValidUntil: null },
            { accessValidUntil: { $gt: now } },
          ],
        }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          $or: [
            { status: USER_APPROVAL_STATUS.EXPIRED },
            {
              isUnlimitedAccess: false,
              accessValidUntil: { $ne: null, $lte: now },
            },
          ],
        }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          status: USER_APPROVAL_STATUS.REJECTED,
        }),
        User.countDocuments({
          email: { $ne: currentUser.email.toLowerCase() },
          $or: [
            { status: USER_APPROVAL_STATUS.SUSPENDED },
            { status: "Inactive" },
            { status: "Deactivated" },
          ],
        }),
      ]);

    const deactiveCount = suspendedCount + expiredCount + rejectedCount;

    return NextResponse.json({
      success: true,
      users,
      stats: {
        total: totalCount,
        pending: pendingCount,
        active: activeCount,
        expired: expiredCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
        deactive: deactiveCount,
      },
    });
  } catch (err: any) {
    console.error("[SUPER ADMIN USERS API ERROR]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
