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

    // ── Direct Login for All Users (OTP Disabled) ───────────────────────────
    const isSuperAdmin = isSuperAdminUser(user);
    const isAgent = Boolean(isDesktopAgent);
    const sessionTiming = getUserSessionDuration(user);

    const token = jwt.sign(
      {
        id: user._id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        companyId: user.companyId,
        roleType: user.roleType || (isSuperAdmin ? "SuperAdmin" : "Admin"),
        isSuperAdmin,
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
      isApproved: user.isApproved,
      isSuperAdmin,
      sessionTimeoutHours: user.sessionTimeoutHours || 1,
      accessValidUntil: user.accessValidUntil,
    };

    const redirectUrl = isSuperAdmin || user.roleType === "SuperAdmin"
      ? "/dashboard/super-admin"
      : "/dashboard";

    const response = NextResponse.json({
      success: true,
      directLogin: true,
      redirectUrl,
      user: userResponse,
      token,
      message: isSuperAdmin ? "Welcome Super Administrator" : "Login successful",
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: isAgent ? 30 * 24 * 60 * 60 : sessionTiming.maxAgeSeconds,
    });

    return response;
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