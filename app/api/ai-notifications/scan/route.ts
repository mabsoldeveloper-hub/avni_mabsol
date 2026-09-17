import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runAiNotificationScan, getGeminiApiStatus } from "@/lib/aiNotificationEngine";
import Notification from "@/models/Notification";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const totalAiAlerts = await Notification.countDocuments({ aiGenerated: true });
    const unreadAiAlerts = await Notification.countDocuments({ aiGenerated: true, isRead: false });
    const criticalAlerts = await Notification.countDocuments({
      aiGenerated: true,
      isRead: false,
      $or: [{ impactScore: "CRITICAL" }, { severity: "error" }],
    });

    const recentAiAlerts = await Notification.find({ aiGenerated: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const latestModel = recentAiAlerts[0]?.metadata?.model || "gemini-2.5-flash";
    const apiMeta = getGeminiApiStatus(null, latestModel);

    return NextResponse.json({
      success: true,
      stats: {
        totalAiAlerts,
        unreadAiAlerts,
        criticalAlerts,
      },
      recentAiAlerts,
      apiMeta,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch AI alert stats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "full_audit";

    const userRole = String(user.roleId?.roleName || user.role || "Admin");

    const scanResult = await runAiNotificationScan({
      mode,
      userId: String(user._id),
      targetRole: userRole,
    });

    return NextResponse.json(scanResult);
  } catch (error: any) {
    console.error("AI Notification scan API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute AI notification scan" },
      { status: 500 }
    );
  }
}
