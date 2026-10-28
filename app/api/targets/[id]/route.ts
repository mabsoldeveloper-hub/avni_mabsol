import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TargetMaster from "@/models/TargetMaster";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// =======================
// GET - Single Target Record
// =======================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await TargetMaster.findById(id).populate(
      "mrUserId",
      "name email employeeCode mobile designation"
    );

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Target record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch target record" },
      { status: 500 }
    );
  }
}

// =======================
// PUT - Update Target Record
// =======================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await TargetMaster.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Target record not found." },
        { status: 404 }
      );
    }

    let resolvedMrName = body.mrName || existing.mrName;
    if (body.mrUserId && body.mrUserId !== existing.mrUserId?.toString()) {
      const user = await User.findById(body.mrUserId);
      if (user) {
        resolvedMrName = user.name;
      }
    }

    const updated = await TargetMaster.findByIdAndUpdate(
      id,
      {
        targetType: body.targetType || existing.targetType,
        periodMonth: body.periodMonth ? body.periodMonth.trim() : existing.periodMonth,
        mrUserId: body.mrUserId !== undefined ? (body.mrUserId || null) : existing.mrUserId,
        mrName: resolvedMrName,
        customerId: body.customerId !== undefined ? body.customerId.trim() : existing.customerId,
        customerName: body.customerName !== undefined ? body.customerName.trim() : existing.customerName,
        customerCode: body.customerCode !== undefined ? body.customerCode.trim() : existing.customerCode,
        targetAmount: body.targetAmount !== undefined ? Number(body.targetAmount) : existing.targetAmount,
        collectionTargetAmount: body.collectionTargetAmount !== undefined ? Number(body.collectionTargetAmount) : (existing.collectionTargetAmount || 0),
        hasGiftScheme: body.hasGiftScheme !== undefined ? Boolean(body.hasGiftScheme) : existing.hasGiftScheme,
        giftSlabs: Array.isArray(body.giftSlabs) ? body.giftSlabs : existing.giftSlabs,
        notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
        status: body.status || existing.status,
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: "Target updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update target record" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE - Remove Target Record
// =======================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const deleted = await TargetMaster.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Target record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Target record deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete target record" },
      { status: 500 }
    );
  }
}
