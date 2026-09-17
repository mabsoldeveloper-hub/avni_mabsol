import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Otp from "@/models/Otp";

import jwt from "jsonwebtoken";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { otp } = body;
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

    // 4. Fallback to email in body
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

    if (!otp) {
      return NextResponse.json(
        { success: false, message: "OTP code is required." },
        { status: 400 }
      );
    }

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const record = await Otp.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, "i") },
      type: "email"
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "OTP not found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { success: false, message: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (record.otp !== String(otp).trim()) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // OTP is valid! Mark as verified
    record.verified = true;
    await record.save();

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. File names unlocked for 5 minutes.",
      unlockedUntil: Date.now() + 5 * 60 * 1000, // 5 minutes in ms
    });
  } catch (err: any) {
    console.error("VERIFY FILE UNLOCK OTP ERROR:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
