import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrTerritory from "@/models/MrTerritory";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

// =======================
// GET - List MR Territories
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId") || "";
    const companyCode = searchParams.get("companyCode") || "";
    const divisionCode = searchParams.get("divisionCode") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (userId) filter.userId = userId;
    if (companyCode) filter.companyCode = companyCode;
    if (divisionCode) filter.divisionCode = divisionCode;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { divisionName: { $regex: search, $options: "i" } },
        { subDivisionName: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
      ];
    }

    const territories = await MrTerritory.find(filter)
      .populate("userId", "name email employeeCode mobile designation")
      .sort({ userName: 1, companyName: 1, divisionName: 1 });

    return NextResponse.json({
      success: true,
      count: territories.length,
      data: territories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch MR territories" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create MR Territory Assignment
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

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

    // Required field validation
    if (!userId || !companyCode || !companyName || !divisionCode || !divisionName) {
      return NextResponse.json(
        {
          success: false,
          message: "MR (User), Company, and Division are required.",
        },
        { status: 400 }
      );
    }

    // Validate MR exists and is not an Admin
    const user = await User.findById(userId).populate("roleId", "roleName");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Selected MR/User not found." },
        { status: 404 }
      );
    }

    const targetRoleName = String((user.roleId as any)?.roleName || "").trim().toLowerCase();
    if (targetRoleName.includes("admin")) {
      return NextResponse.json(
        {
          success: false,
          message: "Territories cannot be assigned to Admin users. Admin users have full access to all products and territories by default.",
        },
        { status: 400 }
      );
    }


    const formattedSubDivCode = (subDivisionCode || "").trim().toUpperCase();
    const formattedCategoryCode = (categoryCode || "").trim().toUpperCase();

    // Check for duplicate territory assignment
    const duplicate = await MrTerritory.findOne({
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
            "This territory (Company + Division + Sub Division + Category) is already assigned to this MR.",
        },
        { status: 400 }
      );
    }

    const territory = await MrTerritory.create({
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
    });

    return NextResponse.json(
      {
        success: true,
        message: "MR Territory assigned successfully.",
        data: territory,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create MR territory" },
      { status: 500 }
    );
  }
}
