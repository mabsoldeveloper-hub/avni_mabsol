import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubDivision from "@/models/SubDivision";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ==============================
// GET Sub Division By ID
// ==============================
export async function GET(
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

    const subDivision = await SubDivision.findById(id);

    if (!subDivision) {
      return NextResponse.json(
        {
          success: false,
          message: "Sub Division not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subDivision,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error fetching sub division",
      },
      { status: 500 }
    );
  }
}

// ==============================
// UPDATE Sub Division
// ==============================
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

    const {
      companyCode,
      companyName,
      divisionCode,
      divisionName,
      subDivisionCode,
      subDivisionName,
      shortName,
      description,
      status,
    } = body;

    if (
      !companyCode ||
      !companyName ||
      !divisionCode ||
      !divisionName ||
      !subDivisionCode ||
      !subDivisionName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company, Division, Sub Division Code, and Sub Division Name are required.",
        },
        { status: 400 }
      );
    }

    const formattedCompanyCode = companyCode.trim();
    const formattedCompanyName = companyName.trim();
    const formattedDivisionCode = divisionCode.trim().toUpperCase();
    const formattedDivisionName = divisionName.trim();
    const formattedSubDivisionCode = subDivisionCode.trim().toUpperCase();
    const formattedSubDivisionName = subDivisionName.trim();

    // Duplicate Code check excluding current id
    const codeExists = await SubDivision.findOne({
      _id: { $ne: id },
      companyCode: formattedCompanyCode,
      divisionCode: formattedDivisionCode,
      subDivisionCode: formattedSubDivisionCode,
    });

    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Sub Division Code '${formattedSubDivisionCode}' already exists for this Division.`,
        },
        { status: 400 }
      );
    }

    // Duplicate Name check excluding current id
    const nameExists = await SubDivision.findOne({
      _id: { $ne: id },
      companyCode: formattedCompanyCode,
      divisionCode: formattedDivisionCode,
      subDivisionName: {
        $regex: `^${formattedSubDivisionName}$`,
        $options: "i",
      },
    });

    if (nameExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Sub Division Name '${formattedSubDivisionName}' already exists for this Division.`,
        },
        { status: 400 }
      );
    }

    const subDivision = await SubDivision.findByIdAndUpdate(
      id,
      {
        companyCode: formattedCompanyCode,
        companyName: formattedCompanyName,
        divisionCode: formattedDivisionCode,
        divisionName: formattedDivisionName,
        subDivisionCode: formattedSubDivisionCode,
        subDivisionName: formattedSubDivisionName,
        shortName: shortName?.trim() || "",
        description: description?.trim() || "",
        status: status || "Active",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!subDivision) {
      return NextResponse.json(
        {
          success: false,
          message: "Sub Division not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sub Division updated successfully.",
      data: subDivision,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update sub division",
      },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE Sub Division
// ==============================
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

    const subDivision = await SubDivision.findByIdAndDelete(id);

    if (!subDivision) {
      return NextResponse.json(
        {
          success: false,
          message: "Sub Division not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sub Division deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete sub division",
      },
      { status: 500 }
    );
  }
}
