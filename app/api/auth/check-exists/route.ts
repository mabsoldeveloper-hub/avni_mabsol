import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, mobile } = await req.json();

    if (email) {
      const cleanEmail = String(email).toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return NextResponse.json({
          exists: true,
          field: "email",
          message: "This email address is already registered in the system. Please use a different email.",
        });
      }
    }

    if (mobile) {
      const cleanMobile = String(mobile).replace(/\D/g, "");
      if (cleanMobile.length >= 10) {
        const existingUser = await User.findOne({ mobile: cleanMobile });
        if (existingUser) {
          return NextResponse.json({
            exists: true,
            field: "mobile",
            message: "This mobile number is already registered in the system. Please use a different number.",
          });
        }
      }
    }

    return NextResponse.json({
      exists: false,
      message: "Available",
    });
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, error: error.message },
      { status: 500 }
    );
  }
}
