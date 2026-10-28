import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrDcr from "@/models/MrDcr";
import MrCallLog from "@/models/MrCallLog";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// =======================
// GET - List DCR Records
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId") || "";
    const approvalStatus = searchParams.get("approvalStatus") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    let targetUserId = userIdParam;

    // Territory / Role Restriction
    const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();
    // If user is MR (non-admin), default to their own DCRs unless specified
    if (!roleName.includes("admin") && !targetUserId) {
      targetUserId = String(user._id);
    }

    const filter: any = {};
    if (targetUserId) filter.userId = targetUserId;
    if (approvalStatus) filter.approvalStatus = approvalStatus;

    if (startDate || endDate) {
      filter.dcrDate = {};
      if (startDate) filter.dcrDate.$gte = new Date(startDate);
      if (endDate) filter.dcrDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { areaVisited: { $regex: search, $options: "i" } },
        { workType: { $regex: search, $options: "i" } },
      ];
    }

    const dcrs = await MrDcr.find(filter)
      .populate("userId", "name email employeeCode mobile designation")
      .sort({ dcrDate: -1 });

    return NextResponse.json({
      success: true,
      count: dcrs.length,
      data: dcrs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch DCR records" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Submit Daily Call Report (DCR)
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      dcrDate,
      workType,
      stationType,
      areaVisited,
      remarks,
      calls, // Array of Doctor/Chemist visit logs
    } = body;

    if (!dcrDate) {
      return NextResponse.json(
        { success: false, message: "DCR Date is required." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(dcrDate);

    // Duplicate check for same user on same date
    const existing = await MrDcr.findOne({
      userId: user._id,
      dcrDate: {
        $gte: new Date(parsedDate.setHours(0, 0, 0, 0)),
        $lte: new Date(parsedDate.setHours(23, 59, 59, 999)),
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "A DCR has already been submitted for this date.",
        },
        { status: 400 }
      );
    }

    // Process calls array to compute metrics
    let totalDoctorCalls = 0;
    let totalChemistCalls = 0;
    let totalStockistCalls = 0;
    let totalPobAmount = 0;

    const callLogsToCreate: any[] = [];

    if (Array.isArray(calls)) {
      calls.forEach((c: any) => {
        const cType = c.callType || "Doctor";
        if (cType === "Doctor") totalDoctorCalls++;
        else if (cType === "Chemist") totalChemistCalls++;
        else if (cType === "Stockist") totalStockistCalls++;

        const pob = Number(c.pobAmount || 0);
        totalPobAmount += pob;

        callLogsToCreate.push({
          userId: user._id,
          userName: user.name,
          callType: cType,
          partyName: c.partyName || "Unknown Party",
          speciality: c.speciality || "",
          visitShift: c.visitShift || "Morning",
          visitedWith: c.visitedWith || "Self",
          productsPromoted: Array.isArray(c.productsPromoted) ? c.productsPromoted : [],
          pobAmount: pob,
          remarks: c.remarks || "",
        });
      });
    }

    // Create DCR Header
    const dcr = await MrDcr.create({
      userId: user._id,
      userName: user.name,
      employeeCode: user.employeeCode || "",
      dcrDate: new Date(dcrDate),
      workType: workType || "Field Work",
      stationType: stationType || "HQ",
      areaVisited: (areaVisited || "").trim(),
      totalDoctorCalls,
      totalChemistCalls,
      totalStockistCalls,
      totalPobAmount,
      approvalStatus: "Pending",
      remarks: (remarks || "").trim(),
    });

    // Create attached Call Logs
    if (callLogsToCreate.length > 0) {
      const callDocs = callLogsToCreate.map((doc) => ({
        ...doc,
        dcrId: dcr._id,
      }));
      await MrCallLog.insertMany(callDocs);
    }

    return NextResponse.json(
      {
        success: true,
        message: "DCR submitted successfully.",
        data: dcr,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit DCR" },
      { status: 500 }
    );
  }
}
