import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await connectDB();
  const user = await getCurrentUser();

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const query: any = {};
  if (companyId) {
    query.companyId = companyId;
  } else if (user?.tenantId) {
    query.tenantId = user.tenantId;
  }

  const years = await FinancialYear.find(query)
    .populate("companyId", "companyName companyCode")
    .sort({ startDate: -1 });

  return NextResponse.json(years);
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await req.json();

    if (user.tenantId && !data.tenantId) {
      data.tenantId = user.tenantId;
    }

    if (data.isCurrent) {
      await FinancialYear.updateMany(
        data.companyId ? { companyId: data.companyId } : {},
        { isCurrent: false }
      );
    }

    const fy = await FinancialYear.create(data);
    return NextResponse.json(fy);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}