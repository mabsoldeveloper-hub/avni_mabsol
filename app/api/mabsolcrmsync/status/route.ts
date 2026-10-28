import { NextRequest, NextResponse } from "next/server";
import { getVfpStatus } from "@/lib/vfp/status";
import { getCurrentUser } from "@/lib/auth";
import { startServerSyncScheduler } from "@/lib/vfp/serverSyncScheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Ensure autonomous server scheduler is running
    startServerSyncScheduler();

    const { searchParams } = request.nextUrl;
    const companyCode = searchParams.get("companyCode") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const companyName = searchParams.get("companyName") || undefined;

    const status = await getVfpStatus({ companyCode, companyId, companyName }, user.email);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load VFP status",
      },
      { status: 500 }
    );
  }
}
