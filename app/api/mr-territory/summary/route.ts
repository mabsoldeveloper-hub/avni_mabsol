import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrTerritory from "@/models/MrTerritory";
import User from "@/models/User";

import { getCurrentUser } from "@/lib/auth";

// ==============================
// GET - All MRs Summary (Territory Coverage Overview)
// ==============================
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyCode = searchParams.get("companyCode") || "";
    const status = searchParams.get("status") || "Active";

    const filter: any = {};
    if (companyCode) filter.companyCode = companyCode;
    if (status) filter.status = status;

    // Aggregate to group by MR
    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userName" },
          employeeCode: { $first: "$employeeCode" },
          totalTerritories: { $sum: 1 },
          companies: { $addToSet: "$companyCode" },
          divisions: { $addToSet: "$divisionCode" },
          territories: {
            $push: {
              companyCode: "$companyCode",
              companyName: "$companyName",
              divisionCode: "$divisionCode",
              divisionName: "$divisionName",
              subDivisionCode: "$subDivisionCode",
              subDivisionName: "$subDivisionName",
              categoryCode: "$categoryCode",
              categoryName: "$categoryName",
              status: "$status",
            },
          },
        },
      },
      {
        $addFields: {
          totalCompanies: { $size: "$companies" },
          totalDivisions: { $size: "$divisions" },
        },
      },
      { $sort: { userName: 1 } },
    ];

    const mrSummaries = await MrTerritory.aggregate(pipeline);

    // Populate user details
    const userIds = mrSummaries.map((m: any) => m._id);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email employeeCode mobile designation"
    );
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enriched = mrSummaries.map((m: any) => ({
      ...m,
      userDetails: userMap.get(m._id?.toString()) || null,
    }));

    return NextResponse.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch MR summary" },
      { status: 500 }
    );
  }
}
