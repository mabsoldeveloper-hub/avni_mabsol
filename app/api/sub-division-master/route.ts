import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubDivision from "@/models/SubDivision";
import { getCurrentUser } from "@/lib/auth";

// =======================
// GET - List Sub Divisions
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const companyCode = searchParams.get("companyCode") || "";
    const divisionCode = searchParams.get("divisionCode") || "";

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

    if (search) {
      filter.$or = [
        { subDivisionCode: { $regex: search, $options: "i" } },
        { subDivisionName: { $regex: search, $options: "i" } },
        { divisionName: { $regex: search, $options: "i" } },
        { divisionCode: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
      ];
    }

    const subDivisions = await SubDivision.find(filter).sort({
      companyName: 1,
      divisionName: 1,
      subDivisionName: 1,
    });

    return NextResponse.json({
      success: true,
      count: subDivisions.length,
      data: subDivisions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch sub divisions",
      },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create Sub Division
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

    // Duplicate Code check
    const codeExists = await SubDivision.findOne({
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

    // Duplicate Name check
    const nameExists = await SubDivision.findOne({
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

    const subDivision = await SubDivision.create({
      companyCode: formattedCompanyCode,
      companyName: formattedCompanyName,
      divisionCode: formattedDivisionCode,
      divisionName: formattedDivisionName,
      subDivisionCode: formattedSubDivisionCode,
      subDivisionName: formattedSubDivisionName,
      shortName: shortName?.trim() || "",
      description: description?.trim() || "",
      status: status || "Active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Sub Division created successfully.",
        data: subDivision,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create sub division",
      },
      { status: 500 }
    );
  }
}
