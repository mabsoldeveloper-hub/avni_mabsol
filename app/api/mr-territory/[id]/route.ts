import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrTerritory from "@/models/MrTerritory";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ==============================
// GET MR Territory By ID
// ==============================
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

    const territory = await MrTerritory.findById(id).populate(
      "userId",
      "name email employeeCode mobile designation"
    );

    if (!territory) {
      return NextResponse.json(
        { success: false, message: "MR Territory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: territory });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Error fetching MR territory" },
      { status: 500 }
    );
  }
}

// ==============================
// UPDATE MR Territory
// ==============================
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

    const {
      userId,
      companyCode,
      companyName,
      divisionCode,
      divisionName,
      subDivisionCode,
      subDivisionName,
      categoryCode,
      categoryName,
      notes,
      status,
    } = body;

    if (!userId || !companyCode || !companyName || !divisionCode || !divisionName) {
      return NextResponse.json(
        {
          success: false,
          message: "MR (User), Company, and Division are required.",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Selected MR/User not found." },
        { status: 404 }
      );
    }

    const formattedSubDivCode = (subDivisionCode || "").trim().toUpperCase();
    const formattedCategoryCode = (categoryCode || "").trim().toUpperCase();

    // Duplicate check excluding current ID
    const duplicate = await MrTerritory.findOne({
      _id: { $ne: id },
      userId,
      companyCode: companyCode.trim(),
      divisionCode: divisionCode.trim().toUpperCase(),
      subDivisionCode: formattedSubDivCode,
      categoryCode: formattedCategoryCode,
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This territory is already assigned to this MR.",
        },
        { status: 400 }
      );
    }

    const territory = await MrTerritory.findByIdAndUpdate(
      id,
      {
        userId,
        userName: user.name,
        employeeCode: user.employeeCode || "",
        companyCode: companyCode.trim(),
        companyName: companyName.trim(),
        divisionCode: divisionCode.trim().toUpperCase(),
        divisionName: divisionName.trim(),
        subDivisionCode: formattedSubDivCode,
        subDivisionName: (subDivisionName || "").trim(),
        categoryCode: formattedCategoryCode,
        categoryName: (categoryName || "").trim(),
        notes: (notes || "").trim(),
        status: status || "Active",
      },
      { new: true, runValidators: true }
    );

    if (!territory) {
      return NextResponse.json(
        { success: false, message: "MR Territory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "MR Territory updated successfully.",
      data: territory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update MR territory" },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE MR Territory
// ==============================
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

    const territory = await MrTerritory.findByIdAndDelete(id);

    if (!territory) {
      return NextResponse.json(
        { success: false, message: "MR Territory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "MR Territory assignment removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete MR territory" },
      { status: 500 }
    );
  }
}
