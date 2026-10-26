import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Notification from "@/models/Notification";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import DismissedAlert from "@/models/DismissedAlert";
import { runNotificationAlertScan } from "@/lib/notificationEngine";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET notifications for current user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const roleName = String(user.roleId?.roleName || user.role || "")
      .trim()
      .toLowerCase();
    const isAdminOrManager =
      roleName.includes("admin") ||
      roleName.includes("super") ||
      roleName.includes("manager") ||
      user.isAdmin === true;

    // Run quick background alert scan to populate new alerts
    await runNotificationAlertScan().catch(() => {});

    let query: any = {};

    if (!isAdminOrManager) {
      // Fetch MR territory restrictions & direct MR-Customer assignments
      const [restriction, directAssignments] = await Promise.all([
        getMrTerritoryRestriction(),
        MrCustomerAssignment.find(
          { userId: user._id, status: "Active" },
          { customerCode: 1 },
        ).lean(),
      ]);

      const currentUserIdStr = String(user._id);
      const currentUserNameStr = (user.name || "").trim().toLowerCase();
      const currentEmpCodeStr = (user.employeeCode || "").trim().toLowerCase();

      // Collect all assigned Customer Codes for this MR from both sources
      const allowedCustomerCodes = Array.from(
        restriction.allowedOrdnosSet || [],
      );
      const directCustomerCodes = directAssignments
        .map((a: any) => String(a.customerCode || "").trim())
        .filter(Boolean);
      const allCustomerCodes = Array.from(
        new Set([...allowedCustomerCodes, ...directCustomerCodes]),
      );

      const mrConditions: any[] = [
        { userId: currentUserIdStr },
        { "metadata.mrUserId": currentUserIdStr },
      ];

      if (currentUserNameStr) {
        mrConditions.push({
          "metadata.mrName": {
            $regex: escapeRegex(currentUserNameStr),
            $options: "i",
          },
        });
      }
      if (currentEmpCodeStr) {
        mrConditions.push({
          "metadata.mrName": {
            $regex: escapeRegex(currentEmpCodeStr),
            $options: "i",
          },
        });
      }
      if (allCustomerCodes.length > 0) {
        mrConditions.push({
          "metadata.customerCode": { $in: allCustomerCodes },
        });
      }

      query = {
        $or: [
          // Non-target alerts (Stock & System) for all MRs
          { category: { $ne: "TARGETS" } },
          // Target alerts assigned to MR OR assigned to MR's assigned Customers
          { category: "TARGETS", $or: mrConditions },
        ],
      };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET /api/notifications ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}

// PATCH to mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany(
        { isRead: false },
        { $set: { isRead: true } },
      );
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        $set: { isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    }

    return NextResponse.json(
      { success: false, error: "notificationId or markAllRead required" },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update notification",
      },
      { status: 500 },
    );
  }
}

// DELETE to remove single notification or clear all notifications permanently
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      const userFilter = {
        $or: [
          { userId: String(user._id) },
          { userId: "" },
          { userId: { $exists: false } },
        ],
      };
      const allNotifs = await Notification.find(userFilter, {
        entityId: 1,
        type: 1,
      }).lean();
      const dismissedDocs = allNotifs
        .filter((n: any) => n.entityId)
        .map((n: any) => ({
          userId: String(user._id),
          entityId: String(n.entityId),
          type: n.type || "",
        }));

      if (dismissedDocs.length > 0) {
        await DismissedAlert.insertMany(dismissedDocs, {
          ordered: false,
        }).catch(() => {});
      }

      await Notification.deleteMany({ userId: String(user._id) });
      return NextResponse.json({
        success: true,
        message: "Notifications cleared",
      });
    }

    if (notificationId) {
      const targetNotif = await Notification.findById(notificationId).lean();
      if (targetNotif && (targetNotif as any).entityId) {
        await DismissedAlert.create({
          userId: String(user._id),
          entityId: String((targetNotif as any).entityId),
          type: (targetNotif as any).type || "",
        }).catch(() => {});
      }
      await Notification.findByIdAndDelete(notificationId);
      return NextResponse.json({
        success: true,
        message: "Notification deleted",
      });
    }

    return NextResponse.json(
      { success: false, error: "id or clearAll parameter required" },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete notification",
      },
      { status: 500 },
    );
  }
}
