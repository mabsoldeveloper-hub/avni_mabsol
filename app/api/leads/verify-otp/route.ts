import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";

export const dynamic = "force-dynamic";

// ─── POST /api/leads/verify-otp ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { type, value, otp } = body;

    if (!type || !value || !otp) {
      return NextResponse.json(
        { error: "type, value and otp are required" },
        { status: 400 }
      );
    }

    const targetType = type === "whatsapp" ? "mobile" : "email";
    const cleanVal = String(value).trim().toLowerCase();
    const filter = targetType === "email" ? { email: cleanVal, type: "email" } : { mobile: cleanVal, type: "mobile" };

    const record = await Otp.findOne(filter);

    if (!record) {
      return NextResponse.json(
        { error: "OTP not found. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (new Date() > new Date(record.expiresAt)) {
      await Otp.deleteOne({ _id: record._id });
      return NextResponse.json(
        { error: "OTP expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if ((record.attempts || 0) >= 5) {
      await Otp.deleteOne({ _id: record._id });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    if (record.otp !== String(otp).trim()) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return NextResponse.json(
        { error: "Incorrect OTP. Please try again." },
        { status: 400 }
      );
    }

    // Valid! Delete so it cannot be reused
    await Otp.deleteOne({ _id: record._id });

    return NextResponse.json({ success: true, message: "OTP verified successfully" });
  } catch (error: any) {
    console.error("[VERIFY OTP]", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
