import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import { sendOtpEmail } from "@/lib/sendEmail";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import Otp from "@/models/Otp";
import User from "@/models/User";
import Company from "@/models/Company";
import Tenant from "@/models/Tenant";
import VfpConfig from "@/models/VfpConfig";
import Role from "@/models/Role";
import CompanyCatalog from "@/models/CompanyCatalog";
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

    const body = await req.json();
    const rawIdentifier = String(body.identifier || body.email || "").trim();
    const password = body.password;
    const isDesktopAgent = body.isDesktopAgent;

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: "Identifier (Email/GST/Phone/Branch Code) and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = rawIdentifier.toLowerCase();
    const cleanGst = rawIdentifier.toUpperCase();
    const cleanDigits = rawIdentifier.replace(/\D/g, "");

    // Auto-seed or sync Super Admin account if logging in with Super Admin email
    if (cleanEmail === SUPER_ADMIN_CREDENTIALS.EMAIL.toLowerCase()) {
      await ensureSuperAdminUser();
    }

    // 1. First, search directly in User model
    const userOrQuery: any[] = [{ email: cleanEmail }];
    if (cleanGst.length === 15) {
      userOrQuery.push({ gstNo: cleanGst });
    }
    if (cleanDigits.length >= 10) {
      userOrQuery.push({ mobile: { $regex: new RegExp(`${cleanDigits.slice(-10)}$`) } });
      userOrQuery.push({ phone: { $regex: new RegExp(`${cleanDigits.slice(-10)}$`) } });
    }

    let user: any = await User.findOne({ $or: userOrQuery }).select("+password");

    // 2. If not found, lookup via CompanyCatalog (by shortCode, gstNo, phone, or email)
    if (!user) {
      const catalogQuery: any[] = [
        { shortCode: cleanGst },
        { ccode: cleanGst },
      ];
      if (cleanGst.length === 15) catalogQuery.push({ gstNo: cleanGst });
      if (cleanDigits.length >= 10) {
        catalogQuery.push({ mobile: { $regex: new RegExp(`${cleanDigits.slice(-10)}$`) } });
      }
      catalogQuery.push({ email: cleanEmail });

      const catalogMatch = await CompanyCatalog.findOne({ $or: catalogQuery }).lean();
      if (catalogMatch) {
        const linkedQueries: any[] = [];
        if (catalogMatch.email) linkedQueries.push({ email: catalogMatch.email.toLowerCase() });
        if (catalogMatch.mobile) linkedQueries.push({ mobile: { $regex: new RegExp(`${catalogMatch.mobile.slice(-10)}$`) } });
        if (catalogMatch.gstNo) linkedQueries.push({ gstNo: catalogMatch.gstNo.toUpperCase() });

        if (linkedQueries.length > 0) {
          user = await User.findOne({ $or: linkedQueries }).select("+password");
        }
      }
    }

    // 3. Fallback: Lookup in Company collection by companyCode or gstNo
    if (!user) {
      const companyMatch = await Company.findOne({
        $or: [
          { companyCode: cleanGst },
          { gstNo: cleanGst },
        ]
      }).lean();
      if (companyMatch) {
        const compEmail = (companyMatch as any).email;
        if (compEmail) {
          user = await User.findOne({ email: compEmail.toLowerCase() }).select("+password");
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found with the provided Email, GSTIN, Phone, or Branch Code",
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

    // ── Direct Login for Web Users; OTP Verification Enforced for Desktop Agent (EXE) ──
    const isSuperAdmin = isSuperAdminUser(user);
    const isAgent = Boolean(isDesktopAgent);
    const sessionTiming = getUserSessionDuration(user);

    // In Desktop EXE: Enforce multi-factor account verification (OTP)
    if (isAgent) {
      const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(rawOtp, 10);

      await Otp.deleteMany({ email: user.email });
      await Otp.create({
        email: user.email,
        type: "email",
        otp: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });

      console.log(`[DESKTOP AGENT LOGIN OTP] Verification code dispatched for ${user.email}`);

      try {
        await sendOtpEmail(user.email, rawOtp);
      } catch (mailErr) {
        console.warn("Failed to send desktop verification email:", mailErr);
      }

      const targetPhone = user.phone || user.mobile;
      if (targetPhone) {
        try {
          await sendWhatsAppOTP(targetPhone, rawOtp);
        } catch (waErr) {
          console.warn("Failed to send desktop verification WhatsApp OTP:", waErr);
        }
      }

      return NextResponse.json({
        success: true,
        otpRequired: true,
        email: user.email,
        message: "Desktop account verification required. Verification code sent to your registered email & phone.",
      });
    }

    let effectiveRoleType = isSuperAdmin ? "SuperAdmin" : (user.roleType || "Admin");
    if (!isSuperAdmin && user.roleId) {
      try {
        const roleDoc: any = await Role.findById(user.roleId).lean();
        if (roleDoc?.roleName) {
          effectiveRoleType = roleDoc.roleName;
        }
      } catch {}
    }
    const isAdmin =
      effectiveRoleType?.toLowerCase() === "admin" ||
      user.roleName?.toLowerCase() === "admin" ||
      user.roleType?.toLowerCase() === "admin" ||
      user.dashboardType === "admin";

    if (isAdmin) {
      effectiveRoleType = "Admin";
    } else {
      // Check if user is the owner/creator of the company
      const ownedCompany = await Company.findOne({
        $or: [{ createdBy: user._id }, { email: user.email }],
      }).lean();
      if (ownedCompany) {
        effectiveRoleType = "Admin";
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        tenantId: user.tenantId,
        roleId: user.roleId,
        roleName: effectiveRoleType,
        companyId: user.companyId,
        roleType: effectiveRoleType,
        isSuperAdmin,
      },
      process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026",
      { expiresIn: (isAgent ? "30d" : sessionTiming.jwtExpiry) as any }
    );

    let companyName = "";
    try {
      if (user.companyId) {
        const comp: any = await Company.findById(user.companyId).lean();
        if (comp) companyName = comp.companyName || comp.name || "";
      }
      if (!companyName && user.tenantId) {
        const tenant: any = await Tenant.findOne({ tenantId: user.tenantId }).lean();
        if (tenant) companyName = tenant.companyName || tenant.name || "";
      }
      if (!companyName) {
        const vfp: any = await VfpConfig.findOne({ email: user.email }).lean();
        if (vfp) companyName = vfp.companyName || "";
      }
    } catch {}

    const userResponse = {
      _id: user._id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      companyName,
      roleId: user.roleId,
      roleType: user.roleType,
      companyId: user.companyId,
      status: user.status,
      isApproved: user.isApproved,
      isSuperAdmin,
      sessionTimeoutHours: user.sessionTimeoutHours || 1,
      accessValidUntil: user.accessValidUntil,
    };

    const isSuper = Boolean(isSuperAdmin && cleanEmail === SUPER_ADMIN_CREDENTIALS.EMAIL.toLowerCase());

    const roleSlug = isSuper
      ? "super-admin"
      : String(effectiveRoleType || user.roleType || "admin")
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, "-");

    const redirectUrl = isSuper
      ? "/dashboard/super-admin/dashboard"
      : `/dashboard/${roleSlug}`;


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