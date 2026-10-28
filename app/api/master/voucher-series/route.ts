import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VoucherSeries from "@/models/VoucherSeries";
import { formatVoucherNumber } from "@/lib/voucherSeriesHelper";
import { getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId") || "";
    const fyId = searchParams.get("fyId") || "";

    const query: any = {};
    if (companyId) {
      query.$or = [{ companyId }, { companyId: "" }, { companyId: { $exists: false } }];
    }
    if (fyId && fyId !== "ALL") {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ fyId }, { fyId: "" }, { fyId: { $exists: false } }] },
      ];
    }

    let seriesList = await VoucherSeries.find(query)
      .sort({ voucherType: 1, isDefault: -1, createdAt: -1 })
      .lean();

    // Auto-seed default series if none exist
    if (!seriesList || seriesList.length === 0) {
      await VoucherSeries.insertMany([
        {
          seriesName: "Standard Tax Invoice Series",
          voucherType: "SALES",
          prefix: "INV-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Proforma Series",
          voucherType: "PROFORMA",
          prefix: "PRF-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Purchase Bill Series",
          voucherType: "PURCHASE",
          prefix: "PUR-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Purchase Order Series",
          voucherType: "PURCHASE_ORDER",
          prefix: "PO-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Debit Note Series",
          voucherType: "DEBIT_NOTE",
          prefix: "DN-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Purchase Return Series",
          voucherType: "PURCHASE_RETURN",
          prefix: "PR-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
        {
          seriesName: "Standard Payment Entry Series",
          voucherType: "PAYMENT",
          prefix: "PMT-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
          companyId,
          fyId,
        },
      ]);

      seriesList = await VoucherSeries.find(query)
        .sort({ voucherType: 1, isDefault: -1 })
        .lean();
    }

    const formattedList = seriesList.map((s: any) => ({
      ...s,
      previewVcn: formatVoucherNumber(s.prefix, s.nextNumber, s.padding, s.suffix),
    }));

    return NextResponse.json({
      success: true,
      data: formattedList,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const seriesName = String(body.seriesName || "").trim();
    const voucherType = String(body.voucherType || "SALES").toUpperCase() as any;
    const prefix = String(body.prefix || "").trim();
    const suffix = String(body.suffix || "").trim();
    const nextNumber = Number(body.nextNumber || 1001);
    const padding = Number(body.padding || 5);
    const isDefault = Boolean(body.isDefault);
    const status = body.status === "Inactive" ? "Inactive" : "Active";
    const companyId = String(body.companyId || "").trim();
    const companyCode = String(body.companyCode || "").trim();
    const fyId = String(body.fyId || "").trim();
    const fyCode = String(body.fyCode || "").trim();

    if (!seriesName) {
      return NextResponse.json({ success: false, message: "Series Name is required" }, { status: 400 });
    }

    // If set as default, remove default flag from other series of same voucherType for this company
    if (isDefault) {
      await VoucherSeries.updateMany(
        { voucherType, companyId },
        { $set: { isDefault: false } }
      );
    }

    const newSeries = await VoucherSeries.create({
      seriesName,
      voucherType,
      prefix,
      suffix,
      nextNumber,
      padding,
      isDefault,
      status,
      companyId,
      companyCode,
      fyId,
      fyCode,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Voucher Series created successfully",
        data: newSeries,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
