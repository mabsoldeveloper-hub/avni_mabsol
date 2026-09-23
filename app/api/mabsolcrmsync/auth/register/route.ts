import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import Role from "@/models/Role";
import FinancialYear from "@/models/FinancialYear";
import { USER_APPROVAL_STATUS, DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, password, companyName, mobile } = body;

    // 1. Validate fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Please enter your company/firm name (at least 2 characters)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "") : "";

    // 2. Check if user email already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "This email address is already registered. Please sign in or use a different email.",
        },
        { status: 409 }
      );
    }

    // 3. Generate isolated tenant ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tenantId = `TENANT_${Date.now()}_${randomSuffix}`;

    // 4. Generate company code
    const rawLetters = companyName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const basePrefix = rawLetters.length >= 3 ? rawLetters.slice(0, 3) : "CMP";
    const companyCode = `${basePrefix}${Math.floor(10 + Math.random() * 90)}`;

    // 5. Create Company
    const newCompany = await Company.create({
      tenantId,
      companyCode,
      companyName: companyName.trim(),
      ownerName: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      status: "Active",
      isDefault: true,
      isHeadOffice: true,
    });

    // 6. Dynamically Calculate Active Financial Year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    const dynamicFyName = `${startYear}-${endYear.toString().slice(2)}`;

    await FinancialYear.create({
      tenantId,
      companyId: newCompany._id,
      fyCode: `${companyCode}_${dynamicFyName.replace(/[^0-9]/g, "")}`,
      fyName: dynamicFyName,
      startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)),
      endDate: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59)),
      isCurrent: true,
      status: "Active",
    }).catch(() => {});

    // 7. Find or create Admin Role
    let adminRole = await Role.findOne({
      $or: [{ tenantId, roleName: "Admin" }, { roleName: "Admin" }],
    });
    if (!adminRole) {
      try {
        adminRole = await Role.create({
          tenantId,
          roleName: "Admin",
          description: "Company Administrator",
          status: "Active",
        });
      } catch {
        adminRole = await Role.findOne();
      }
    }

    // 8. Hash Password & Create User with PENDING status and isApproved=false
    const hashedPassword = await bcrypt.hash(password, 12);
    const employeeCode = `${basePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      tenantId,
      companyId: newCompany._id,
      roleId: adminRole?._id,
      roleName: "Admin",
      roleType: "Admin",
      role: "Admin",
      dashboardType: "admin",
      employeeCode,
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      status: USER_APPROVAL_STATUS.PENDING,
      isApproved: false,
      accessDurationDays: DEFAULT_ACCESS_DAYS,
      accessValidUntil: null,
      approvedAt: null,
      approvedBy: null,
      mobileVerified: false,
      termsAccepted: true,
    });

    newCompany.createdBy = newUser._id;
    await newCompany.save().catch(() => {});

    // Crucially: DO NOT return token, DO NOT direct login!
    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message: "Account created successfully! Your account is pending approval from the Superadmin. You will be able to sign in once approved.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        companyName: newCompany.companyName,
        status: newUser.status,
        isApproved: false,
      },
    });
  } catch (error: any) {
    console.error("[Agent Register Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
