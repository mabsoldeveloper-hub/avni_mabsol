import { NextResponse } from "next/server";
import { runCustomerAlertScan } from "@/lib/services/customerAlertScheduler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceIgnoreCooldown = body.forceIgnoreCooldown !== undefined ? !!body.forceIgnoreCooldown : true;

    const result = await runCustomerAlertScan({ forceIgnoreCooldown });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || result.message || "Failed to execute customer alert scan",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Auto-scan complete. ${result.scannedCount} customers checked, ${result.alertsTriggered} alerts triggered.`,
      scannedCount: result.scannedCount,
      alertsTriggered: result.alertsTriggered,
      results: result.results,
    });
  } catch (err: any) {
    console.error("POST /api/customers/alert-settings/auto-scan error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
