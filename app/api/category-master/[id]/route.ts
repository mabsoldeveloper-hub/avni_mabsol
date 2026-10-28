import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/models/Category";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ==============================
// GET Category By ID
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

    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error fetching category",
      },
      { status: 500 }
    );
  }
}

// ==============================
// UPDATE Category
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
      categoryCode,
      categoryName,
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
      !subDivisionName ||
      !categoryCode ||
      !categoryName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company, Division, Sub Division, Category Code, and Category Name are required.",
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
    const formattedCategoryCode = categoryCode.trim().toUpperCase();
    const formattedCategoryName = categoryName.trim();

    // Duplicate Code check excluding current id
    const codeExists = await Category.findOne({
      _id: { $ne: id },
      companyCode: formattedCompanyCode,
      divisionCode: formattedDivisionCode,
      subDivisionCode: formattedSubDivisionCode,
      categoryCode: formattedCategoryCode,
    });

    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Category Code '${formattedCategoryCode}' already exists for this Sub Division.`,
        },
        { status: 400 }
      );
    }

    // Duplicate Name check excluding current id
    const nameExists = await Category.findOne({
      _id: { $ne: id },
      companyCode: formattedCompanyCode,
      divisionCode: formattedDivisionCode,
      subDivisionCode: formattedSubDivisionCode,
      categoryName: {
        $regex: `^${formattedCategoryName}$`,
        $options: "i",
      },
    });

    if (nameExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Category Name '${formattedCategoryName}' already exists for this Sub Division.`,
        },
        { status: 400 }
      );
    }

    const category = await Category.findByIdAndUpdate(
      id,
      {
        companyCode: formattedCompanyCode,
        companyName: formattedCompanyName,
        divisionCode: formattedDivisionCode,
        divisionName: formattedDivisionName,
        subDivisionCode: formattedSubDivisionCode,
        subDivisionName: formattedSubDivisionName,
        categoryCode: formattedCategoryCode,
        categoryName: formattedCategoryName,
        shortName: shortName?.trim() || "",
        description: description?.trim() || "",
        status: status || "Active",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update category",
      },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE Category
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

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete category",
      },
      { status: 500 }
    );
  }
}
