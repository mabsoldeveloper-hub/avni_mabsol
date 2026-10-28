import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendEmailOTP } from "@/lib/mail";
import { validateEmail } from "@/lib/constants/validation.constant";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email } = await req.json();

    // Validate email format
    const emailErr = validateEmail(email || "");
    if (emailErr) {
      return NextResponse.json({ success: false, message: emailErr });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ── Check if email is already registered ──────────────────────────────────
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: "This email address is already registered to another account. Please use a different email.",
      });
    }

    // Generate 6-digit OTP and store
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email: cleanEmail, type: "company_email" },
      {
        $set: {
          email: cleanEmail,
          type: "company_email",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      },
      { upsert: true, new: true }
    );

    console.log(`\n[COMPANY EMAIL OTP] ${cleanEmail} → ${otp}`);

    // Dispatch email in background so the API responds in <50ms without waiting for slow SMTP handshake
    sendEmailOTP(cleanEmail, otp).catch((mailErr) => {
      console.warn("[COMPANY EMAIL OTP] Background delivery notice:", mailErr?.message || mailErr);
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
