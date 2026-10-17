import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getInventorySettings,
  getMovementData,
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
    const cid =
      sp.get("companyId") ||
      ((u as any).companyId?._id?.toString() || (u as any).companyId?.toString() || "");

    const s = await getInventorySettings(String((u as any).tenantId || "TENANT001"), cid);

    const q = sp.get("q") || "";
    const analysisDaysParam = sp.get("analysisDays");
    const analysisDays = analysisDaysParam ? Number(analysisDaysParam) : undefined;
    const fastCoverDaysParam = sp.get("fastCoverDays");
    const fastCoverDays = fastCoverDaysParam ? Number(fastCoverDaysParam) : undefined;
    const slowCoverDaysParam = sp.get("slowCoverDays");
    const slowCoverDays = slowCoverDaysParam ? Number(slowCoverDaysParam) : undefined;
    const minSalesQtyParam = sp.get("minSalesQty");
    const minSalesQty = minSalesQtyParam ? Number(minSalesQtyParam) : undefined;
    const type = (sp.get("type") || "ALL").toUpperCase() as any;
    const fyId = sp.get("fyId") || undefined;

    const result = await getMovementData(s, {
      q,
      analysisDays,
      fastCoverDays,
      slowCoverDays,
      minSalesQty,
      type,
      fyId,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      fastMoving: result.fastMoving,
      slowMoving: result.slowMoving,
      summary: result.summary,
      settings: s.movement,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const u = await getCurrentUser();
    if (!u) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const cid =
      body.companyId ||
      ((u as any).companyId?._id?.toString() || (u as any).companyId?.toString() || "");

    const s = await getInventorySettings(String((u as any).tenantId || "TENANT001"), cid);

    const alertType = body.type === "SLOW" ? "SLOW" : "FAST";
    const userEmail = String((u as any)?.email || "").trim().toLowerCase();
    const recipients =
      Array.isArray(body.recipients) && body.recipients.length > 0
        ? body.recipients
        : body.recipientEmail
        ? [body.recipientEmail]
        : s.recipients && s.recipients.length > 0
        ? s.recipients
        : userEmail
        ? [userEmail]
        : [];

    const customSettings = {
      ...s,
      email: {
        ...s.email,
        includeNearExpiry: false,
        includeDeadStock: false,
        includeFastMoving: alertType === "FAST",
        includeSlowMoving: alertType === "SLOW",
      },
      recipients,
    };

    const dispatchRes = await sendInventoryAlertEmail(customSettings, true, recipients);

    return NextResponse.json({
      success: dispatchRes.success,
      message: dispatchRes.success
        ? `✅ ${alertType === "FAST" ? "Fast Moving" : "Slow Moving"} alert successfully sent to ${recipients.join(", ")}!`
        : `Failed to dispatch alert: ${dispatchRes.results?.[0]?.error || dispatchRes.reason || "Unknown error"}`,
      details: dispatchRes,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
