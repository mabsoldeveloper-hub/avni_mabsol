import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getInventorySettings,
  buildInventoryReport,
  sendInventoryAlertEmail,
} from "@/lib/inventoryIntelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u = await getCurrentUser();
    if (!u) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sp = new URL(req.url).searchParams;
    const companyId =
      sp.get("companyId") ||
      (typeof (u as any).companyId === "object"
        ? String((u as any).companyId?._id || "")
        : String((u as any).companyId || ""));

    const s = await getInventorySettings(String((u as any).tenantId || "TENANT001"), companyId);

    const days = sp.get("days") ? Number(sp.get("days")) : undefined;
    const noMovementDays = sp.get("noMovementDays") ? Number(sp.get("noMovementDays")) : undefined;
    const analysisDays = sp.get("analysisDays") ? Number(sp.get("analysisDays")) : undefined;

    const r = await buildInventoryReport(s, {
      days,
      noMovementDays,
      analysisDays,
    });

    return NextResponse.json({
      success: true,
      settings: s,
      activeRules: {
        windowDays: days ?? s.nearExpiry.windowDays,
        noMovementDays: noMovementDays ?? s.deadStock.noMovementDays,
        analysisDays: analysisDays ?? s.movement.analysisDays,
        fastStockCoverDays: s.movement.fastStockCoverDays,
        slowStockCoverDays: s.movement.slowStockCoverDays,
      },
      summary: {
        nearExpiry: r.nearExpiry.length,
        nearExpiryValue: r.nearExpirySummary.totalValue,
        nearExpiryStock: r.nearExpirySummary.totalStock,
        criticalNearExpiry: r.nearExpirySummary.criticalCount,

        deadStock: r.deadStock.length,
        deadStockValue: r.deadStockSummary.totalValue,
        deadStockUnits: r.deadStockSummary.totalStock,

        fastMoving: r.fastMoving.length,
        slowMoving: r.slowMoving.length,
        normalMoving: r.movementSummary.normalCount,
      },
      preview: {
        nearExpiry: r.nearExpiry.slice(0, 10),
        deadStock: r.deadStock.slice(0, 10),
        fastMoving: r.fastMoving.slice(0, 10),
        slowMoving: r.slowMoving.slice(0, 10),
      },
      report: r,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * Send Comprehensive Alert Email from Dashboard
 */
export async function POST(req: Request) {
  try {
    const u = await getCurrentUser();
    if (!u) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const companyId =
      body.companyId ||
      (typeof (u as any).companyId === "object"
        ? String((u as any).companyId?._id || "")
        : String((u as any).companyId || ""));

    const s = await getInventorySettings(String((u as any).tenantId || "TENANT001"), companyId);

    const userEmail = String((u as any)?.email || "").trim().toLowerCase();
    const recipients =
      Array.isArray(body.recipients) && body.recipients.length > 0
        ? body.recipients
        : body.testRecipient || body.recipientEmail
        ? [body.testRecipient || body.recipientEmail]
        : s.recipients && s.recipients.length > 0
        ? s.recipients
        : userEmail
        ? [userEmail]
        : [];

    const customSettings = {
      ...s,
      email: {
        ...s.email,
        includeNearExpiry: body.includeNearExpiry !== undefined ? !!body.includeNearExpiry : s.email.includeNearExpiry,
        includeDeadStock: body.includeDeadStock !== undefined ? !!body.includeDeadStock : s.email.includeDeadStock,
        includeFastMoving: body.includeFastMoving !== undefined ? !!body.includeFastMoving : s.email.includeFastMoving,
        includeSlowMoving: body.includeSlowMoving !== undefined ? !!body.includeSlowMoving : s.email.includeSlowMoving,
      },
      recipients,
    };

    const dispatchRes = await sendInventoryAlertEmail(customSettings, true, recipients);

    return NextResponse.json({
      success: dispatchRes.success,
      message: dispatchRes.success
        ? `✅ Inventory Alert successfully delivered to ${recipients.join(", ")}!`
        : `Failed to dispatch alert: ${dispatchRes.results?.[0]?.error || dispatchRes.reason || "Unknown error"}`,
      details: dispatchRes,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
