import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Division from "@/models/Division";
import { getCurrentUser } from "@/lib/auth";

// =======================
// GET - List Divisions
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const companyCode = searchParams.get("companyCode") || searchParams.get("companyId") || "";

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (companyCode) {
      filter.companyCode = companyCode;
    }

    if (search) {
      filter.$or = [
        { divisionCode: { $regex: search, $options: "i" } },
        { divisionName: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { companyCode: { $regex: search, $options: "i" } },
      ];
    }

    const divisions = await Division.find(filter).sort({ companyName: 1, divisionName: 1 });

    return NextResponse.json({
      success: true,
      count: divisions.length,
      data: divisions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch divisions",
      },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create Division
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
      shortName,
      description,
      status,
    } = body;

    // Validation
    if (!companyCode || !companyName || !divisionCode || !divisionName) {
      return NextResponse.json(
        {
          success: false,
          message: "Company Code, Company Name, Division Code, and Division Name are required.",
        },
        { status: 400 }
      );
    }

    const formattedCompanyCode = companyCode.trim();
    const formattedCompanyName = companyName.trim();
    const formattedDivisionCode = divisionCode.trim().toUpperCase();
    const formattedDivisionName = divisionName.trim();

    // Duplicate Code under same company
    const codeExists = await Division.findOne({
      companyCode: formattedCompanyCode,
      divisionCode: formattedDivisionCode,
    });

    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Division Code '${formattedDivisionCode}' already exists for this Company.`,
        },
        { status: 400 }
      );
    }

    // Duplicate Name under same company
    const nameExists = await Division.findOne({
      companyCode: formattedCompanyCode,
      divisionName: {
        $regex: `^${formattedDivisionName}$`,
        $options: "i",
      },
    });

    if (nameExists) {
      return NextResponse.json(
        {
          success: false,
          message: `Division Name '${formattedDivisionName}' already exists for this Company.`,
        },
        { status: 400 }
      );
    }

    const division = await Division.create({
      companyCode: formattedCompanyCode,
      companyName: formattedCompanyName,
      divisionCode: formattedDivisionCode,
      divisionName: formattedDivisionName,
      shortName: shortName?.trim() || "",
      description: description?.trim() || "",
      status: status || "Active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Division created successfully.",
        data: division,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create division",
      },
      { status: 500 }
    );
  }
}