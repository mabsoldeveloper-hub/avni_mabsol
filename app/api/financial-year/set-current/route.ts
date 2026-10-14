import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { fyId, companyId } = await req.json();
    const targetCompanyId = companyId || (user.companyId ? String(user.companyId) : null);
    const scopeFilter: any = {};
    if (targetCompanyId) {
      scopeFilter.companyId = targetCompanyId;
    } else if (user.tenantId) {
      scopeFilter.tenantId = user.tenantId;
    }

    if (fyId === "ALL") {
      await FinancialYear.updateMany(scopeFilter, { isCurrent: false });
    } else if (fyId) {
      await FinancialYear.updateMany(scopeFilter, { isCurrent: false });
      await FinancialYear.findByIdAndUpdate(fyId, { isCurrent: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
  }
}