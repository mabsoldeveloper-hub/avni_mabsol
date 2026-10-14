import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserTheme from "@/models/UserTheme";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    const key = user?.companyId ? `theme_${user.companyId}` : "mabsol_global_theme";
    let doc = await UserTheme.findOne({ themeKey: key });
    if (!doc && key !== "mabsol_global_theme") {
      doc = await UserTheme.findOne({ themeKey: "mabsol_global_theme" });
    }

    if (!doc) {
      return NextResponse.json({ success: true, theme: null });
    }
    return NextResponse.json({
      success: true,
      selectedTheme: doc.selectedTheme,
      customColors: doc.customColors,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { selectedTheme, customColors } = body;
    const key = user.companyId ? `theme_${user.companyId}` : "mabsol_global_theme";

    const updated = await UserTheme.findOneAndUpdate(
      { themeKey: key },
      { selectedTheme, customColors },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, theme: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
