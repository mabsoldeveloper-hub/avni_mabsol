import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpEmail } from "@/lib/sendEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const email = (body.email || body.userEmail || "").trim().toLowerCase();
    const deviceId = (body.deviceId || "").trim();
    const deviceName = (body.deviceName || "Desktop Agent").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid account email is required." },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Machine device ID is required." },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: `No active account found for ${email}. Please check your email or sign up.` },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email, type: "email" },
      {
        $set: {
          email,
          type: "email",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes validity
        },
      },
      { upsert: true, new: true }
    );

    // Send email with OTP
    try {
      await sendOtpEmail(email, otp);
    } catch (mailErr: any) {
      console.error(`[License Device OTP] Failed to send email to ${email}:`, mailErr);
      return NextResponse.json(
        { success: false, error: "Failed to dispatch verification email. Please check SMTP settings or try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      deviceId,
      deviceName,
      message: `A 6-digit activation code has been sent to ${email} for device "${deviceName}".`,
    });
  } catch (err: any) {
    console.error("[License Send Device OTP Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process device activation request." },
      { status: 500 }
    );
  }
}
