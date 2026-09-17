import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { runMargDataMapper } from "@/lib/margDataMapper";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runMargDataMapper(user.email);

    return NextResponse.json({
      success: true,
      message: `MabsolCRM Data Mapping completed! Customers: ${result.customersMapped}, Products: ${result.productsMapped}, Pendings: ${result.pendingsMapped}`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute MabsolCRM data mapper" },
      { status: 500 }
    );
  }
}
