import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Otp from "@/models/Otp";
import { sendEmailOTP } from "@/lib/mail";

import jwt from "jsonwebtoken";
import User from "@/models/User";
import { getLicenseOtpRecipientEmails } from "@/lib/constants/licenseAlert.constant";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    let email = "";

    // 1. Check Bearer token from header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (payload && payload.id) {
          const user = await User.findById(payload.id);
          if (user?.email) email = user.email;
        }
      } catch {}
    }

    // 2. Check session cookie
    if (!email) {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser?.email) email = currentUser.email;
      } catch {}
    }

    // 3. Check x-agent-email header
    if (!email) {
      const headerEmail = req.headers.get("x-agent-email");
      if (headerEmail && headerEmail.includes("@")) {
        email = headerEmail.trim();
      }
    }

    // 4. Fallback to email in body (support case-insensitive match or direct)
    if (!email && body.email) {
      const trimmed = String(body.email).trim();
      if (trimmed.includes("@")) {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const foundUser = await User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, "i") } });
        email = foundUser?.email || trimmed;
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Target verification emails configured in lib/constants/licenseAlert.constant.ts:
    const targetEmails = getLicenseOtpRecipientEmails(email);

    for (const targetEmail of targetEmails) {
      await Otp.findOneAndUpdate(
        { email: targetEmail, type: "email" },
        {
          email: targetEmail,
          type: "email",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
        { upsert: true, new: true }
      );
    }

    // Send email OTP to all recipients in parallel
    try {
      await Promise.allSettled(targetEmails.map(targetEmail => sendEmailOTP(targetEmail, otp)));
    } catch (mailErr: any) {
      console.error("Email send error:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Verification OTP sent to ${targetEmails.join(", ")}`,
      ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
    });
  } catch (err: any) {
    console.error("SEND FILE UNLOCK OTP ERROR:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
