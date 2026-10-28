import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VoucherSeries from "@/models/VoucherSeries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const series = await VoucherSeries.findById(id);
    if (!series) {
      return NextResponse.json({ success: false, message: "Voucher Series not found" }, { status: 404 });
    }

    if (body.seriesName !== undefined) series.seriesName = String(body.seriesName).trim();
    if (body.voucherType !== undefined) series.voucherType = String(body.voucherType).toUpperCase() as any;
    if (body.prefix !== undefined) series.prefix = String(body.prefix).trim();
    if (body.suffix !== undefined) series.suffix = String(body.suffix).trim();
    if (body.nextNumber !== undefined) series.nextNumber = Number(body.nextNumber);
    if (body.padding !== undefined) series.padding = Number(body.padding);
    if (body.status !== undefined) series.status = body.status === "Inactive" ? "Inactive" : "Active";

    if (body.companyId !== undefined) series.companyId = String(body.companyId).trim();
    if (body.companyCode !== undefined) series.companyCode = String(body.companyCode).trim();
    if (body.fyId !== undefined) series.fyId = String(body.fyId).trim();
    if (body.fyCode !== undefined) series.fyCode = String(body.fyCode).trim();

    if (body.isDefault === true) {
      await VoucherSeries.updateMany({ voucherType: series.voucherType, companyId: series.companyId || "" }, { $set: { isDefault: false } });
      series.isDefault = true;
    } else if (body.isDefault === false) {
      series.isDefault = false;
    }

    await series.save();

    return NextResponse.json({
      success: true,
      message: "Voucher Series updated successfully",
      data: series,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const series = await VoucherSeries.findById(id);
    if (!series) {
      return NextResponse.json({ success: false, message: "Voucher Series not found" }, { status: 404 });
    }

    await VoucherSeries.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Voucher Series deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
