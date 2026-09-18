import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import { sendOtpEmail } from "@/lib/sendEmail";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import Otp from "@/models/Otp";
import User from "@/models/User";
import {
  ensureSuperAdminUser,
  isSuperAdminUser,
  validateUserLoginAccess,
} from "@/lib/services/superAdmin.service";
import { SUPER_ADMIN_CREDENTIALS } from "@/lib/constants/superAdmin.constant";
import {
  SESSION_DURATION_JWT,
  SESSION_DURATION_SECONDS,
  getUserSessionDuration,
} from "@/lib/constants/session.constant";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password, isDesktopAgent } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Auto-seed or sync Super Admin account if logging in with Super Admin email
    if (cleanEmail === SUPER_ADMIN_CREDENTIALS.EMAIL.toLowerCase()) {
      await ensureSuperAdminUser();
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Password",
        },
        { status: 401 }
      );
    }

    // Validate Super Admin approval & time-bound access expiry
    const accessCheck = await validateUserLoginAccess(user);
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: accessCheck.message,
        },
        { status: accessCheck.statusCode || 403 }
      );
    }

    // Direct Login for Super Administrator
    // Direct Login for Super Administrator (Persistent Session - Never forced to relogin after 1hr)
    if (isSuperAdminUser(user)) {
      const isAgent = Boolean(isDesktopAgent);
      const sessionTiming = getUserSessionDuration(user);

      const token = jwt.sign(
        {
          id: user._id,
          tenantId: user.tenantId,
          roleId: user.roleId,
          companyId: user.companyId,
          roleType: user.roleType || "SuperAdmin",
          isSuperAdmin: true,
        },
        process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026",
        { expiresIn: (isAgent ? "30d" : sessionTiming.jwtExpiry) as any }
      );

      const userResponse = {
        _id: user._id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleType: user.roleType,
        companyId: user.companyId,
        status: user.status,
        isApproved: true,
        isSuperAdmin: true,
      };

      const response = NextResponse.json({
        success: true,
        directLogin: true,
        redirectUrl: "/dashboard/super-admin",
        user: userResponse,
        token,
        message: "Welcome Super Administrator",
      });

      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: isAgent ? 30 * 24 * 60 * 60 : sessionTiming.maxAgeSeconds,
      });

      return response;
    }

    // Standard Users: Generate OTP and send via Email + WhatsApp
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Remove any previous OTPs for this email, then store the new one
    await Otp.deleteMany({ email: user.email });
    await Otp.create({
      email: user.email,
      type: "email",
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // Send OTP via email and WhatsApp in parallel
    const [emailRes, waRes] = await Promise.allSettled([
      sendOtpEmail(user.email, otp),
      user.mobile ? sendWhatsAppOTP(user.mobile, otp) : Promise.resolve(null),
    ]);

    if (emailRes.status === "rejected") {
      console.error("Email OTP failed to send:", emailRes.reason);
    }
    if (waRes.status === "rejected") {
      console.error("WhatsApp OTP failed to send:", waRes.reason);
    }

    return NextResponse.json({
      success: true,
      otpRequired: true,
      email: user.email,
      message: "Verification code sent to your email" + (user.mobile ? " and WhatsApp" : ""),
    });
  } catch (error: unknown) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 }
    );
  }
} 