import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getInventorySettings,
  getNearExpiryData,
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
    const daysParam = sp.get("days") || sp.get("windowDays");
    const days = daysParam ? Number(daysParam) : undefined;
    const minStockParam = sp.get("minStock");
    const minStock = minStockParam ? Number(minStockParam) : undefined;
    const includeExpired = sp.get("includeExpired") !== "false";
    const fyId = sp.get("fyId") || undefined;
    const companyCode = sp.get("companyCode") || undefined;
    const divisionCode = sp.get("divisionCode") || undefined;
    const subDivisionCode = sp.get("subDivisionCode") || undefined;
    const categoryCode = sp.get("categoryCode") || undefined;
    const productCode = sp.get("productCode") || undefined;

    const result = await getNearExpiryData(s, {
      q,
      days,
      minStock,
      includeExpired,
      fyId,
      companyCode,
      divisionCode,
      subDivisionCode,
      categoryCode,
      productCode,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      summary: result.summary,
      settings: s.nearExpiry,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * Trigger immediate Near-Expiry Email Alert
 */
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

    // Apply custom days / recipients if passed
    const customDays = body.days ? Number(body.days) : s.nearExpiry.windowDays;
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
      nearExpiry: {
        ...s.nearExpiry,
        windowDays: customDays,
      },
      email: {
        ...s.email,
        includeNearExpiry: true,
        includeDeadStock: false,
        includeFastMoving: false,
        includeSlowMoving: false,
      },
      recipients,
    };

    const dispatchRes = await sendInventoryAlertEmail(customSettings, true, recipients);

    return NextResponse.json({
      success: dispatchRes.success,
      message: dispatchRes.success
        ? `✅ Near Expiry alert successfully sent to ${recipients.join(", ")}!`
        : `Failed to dispatch alert: ${dispatchRes.results?.[0]?.error || dispatchRes.reason || "Unknown error"}`,
      details: dispatchRes,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
