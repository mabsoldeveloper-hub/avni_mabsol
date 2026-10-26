import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getInventorySettings,
  getDeadStockData,
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
    const daysParam = sp.get("days") || sp.get("noMovementDays");
    const days = daysParam ? Number(daysParam) : undefined;
    const minStockParam = sp.get("minStock");
    const minStock = minStockParam ? Number(minStockParam) : undefined;
    const fyId = sp.get("fyId") || undefined;
    const companyCode = sp.get("companyCode") || undefined;
    const divisionCode = sp.get("divisionCode") || undefined;
    const subDivisionCode = sp.get("subDivisionCode") || undefined;
    const categoryCode = sp.get("categoryCode") || undefined;
    const productCode = sp.get("productCode") || undefined;

    const result = await getDeadStockData(s, {
      q,
      days,
      minStock,
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
      settings: s.deadStock,
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

    const customDays = body.days ? Number(body.days) : s.deadStock.noMovementDays;
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
      deadStock: {
        ...s.deadStock,
        noMovementDays: customDays,
      },
      email: {
        ...s.email,
        includeNearExpiry: false,
        includeDeadStock: true,
        includeFastMoving: false,
        includeSlowMoving: false,
      },
      recipients,
    };

    const dispatchRes = await sendInventoryAlertEmail(customSettings, true, recipients);

    return NextResponse.json({
      success: dispatchRes.success,
      message: dispatchRes.success
        ? `✅ Dead Stock alert successfully sent to ${recipients.join(", ")}!`
        : `Failed to dispatch alert: ${dispatchRes.results?.[0]?.error || dispatchRes.reason || "Unknown error"}`,
      details: dispatchRes,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
