import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/models/Category";
import { getCurrentUser } from "@/lib/auth";

// =======================
// GET - List Categories
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const companyCode = searchParams.get("companyCode") || "";
    const divisionCode = searchParams.get("divisionCode") || "";
    const subDivisionCode = searchParams.get("subDivisionCode") || "";

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (companyCode) {
      filter.companyCode = companyCode;
    }

    if (divisionCode) {
      filter.divisionCode = divisionCode;
    }

    if (subDivisionCode) {
      filter.subDivisionCode = subDivisionCode;
    }

    if (search) {
      filter.$or = [
        { categoryCode: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
        { subDivisionName: { $regex: search, $options: "i" } },
        { divisionName: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await Category.find(filter).sort({
      companyName: 1,
      divisionName: 1,
      subDivisionName: 1,
      categoryName: 1,
    });

    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch categories",
      },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create Category
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

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

    // Validation
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

    // Duplicate Code check
    const codeExists = await Category.findOne({
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

    // Duplicate Name check
    const nameExists = await Category.findOne({
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

    const category = await Category.create({
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
    });

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully.",
        data: category,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create category",
      },
      { status: 500 }
    );
  }
}
