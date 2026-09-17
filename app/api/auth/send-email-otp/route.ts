import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import Otp from "@/models/Otp";
import { sendEmailOTP } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Work email address is required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    const existingCompany = await Company.findOne({ email: cleanEmail });
    if (existingUser || existingCompany) {
      return NextResponse.json({
        success: false,
        message: "This email address is already registered in the system. Please use a different email or sign in.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email: cleanEmail, type: "email" },
      {
        $set: {
          email: cleanEmail,
          type: "email",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      },
      { upsert: true, new: true }
    );

    console.log(`\n======================================================`);
    console.log(`[EMAIL VERIFICATION OTP] Sent to: ${cleanEmail} | OTP: ${otp}`);
    console.log(`======================================================\n`);

    // Send email asynchronously in background so response returns instantly
    sendEmailOTP(cleanEmail, otp).catch((err) => {
      console.error("Background Email delivery warning:", err?.message || err);
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error("EMAIL OTP ERROR:", err);
    return NextResponse.json({
      success: false,
      message: err.message || "Failed to send email verification code",
    });
  }
}