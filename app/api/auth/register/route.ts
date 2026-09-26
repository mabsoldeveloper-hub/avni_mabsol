import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";
import Role from "@/models/Role";
import Otp from "@/models/Otp";
import { extractPanFromGstin, extractStateCodeFromGstin } from "@/lib/gstHelper";
import {
  validateName,
  validateEmail,
  validateMobile,
  validatePassword,
} from "@/lib/constants/validation.constant";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";
import { USER_APPROVAL_STATUS, DEFAULT_ACCESS_DAYS } from "@/lib/constants/superAdmin.constant";

/**
 * Generate a unique tenant ID for multi-tenant data isolation.
 * Ensures each registered pharma firm has an isolated workspace.
 */
async function generateUniqueTenantId(): Promise<string> {
  const count = await Company.countDocuments({ isHeadOffice: true });
  const nextNum = (count + 1).toString().padStart(4, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  let candidate = `TENANT_${nextNum}_${randomSuffix}`;

  let exists = await Company.findOne({ tenantId: candidate });
  while (exists) {
    const extraRand = Math.floor(1000 + Math.random() * 9000);
    candidate = `TENANT_${nextNum}_${extraRand}`;
    exists = await Company.findOne({ tenantId: candidate });
  }
  return candidate;
}

async function generateUniqueEmployeeCode(userName: string): Promise<string> {
  const cleaned = (userName || "").trim().replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = cleaned.length >= 3 ? cleaned.slice(0, 5) : (cleaned || "ADMIN");

  let isUnique = false;
  let employeeCode = "";

  while (!isUnique) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    employeeCode = `${prefix}-${randNum}`;

    const existing = await User.findOne({ employeeCode });
    if (!existing) {
      isUnique = true;
    }
  }

  return employeeCode;
}

export async function POST(req: Request) {
  let createdCompanyId: any = null;
  let userCreated = false;
  try {
    await connectDB();

    const body = await req.json();
    const {
      name,
      email,
      mobile,
      password,
      designation,
      // Company & GST details
      companyName,
      gstNo,
      panNo,
      drugLicenseNo,
      address,
      city,
      state,
      pincode,
      additionalGstins,
      businessType,
      termsAccepted,
    } = body;

    // ── Field Validation ─────────────────────────────────────────────────────
    const nameErr = validateName(name || "");
    if (nameErr) return NextResponse.json({ success: false, message: nameErr }, { status: 400 });

    const emailErr = validateEmail(email || "");
    if (emailErr) return NextResponse.json({ success: false, message: emailErr }, { status: 400 });

    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "") : "";
    if (cleanMobile) {
      const mobileErr = validateMobile(cleanMobile);
      if (mobileErr) return NextResponse.json({ success: false, message: mobileErr }, { status: 400 });
    }

    const passwordErr = validatePassword(password || "");
    if (passwordErr) return NextResponse.json({ success: false, message: passwordErr }, { status: 400 });

    if (!companyName?.trim()) {
      return NextResponse.json({ success: false, message: "Company name is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ── Duplicate Checks for Head Office ──────────────────────────────────────
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return NextResponse.json({
        success: false,
        message: "This email address is already registered. Please use a different email or sign in.",
      }, { status: 409 });
    }

    // If an orphaned company exists without any active user from an earlier failed signup, clean it up
    const existingCompanies = await Company.find({ email: cleanEmail });
    for (const ec of existingCompanies) {
      const companyUser = await User.findOne({ companyId: ec._id });
      if (!companyUser) {
        await Company.deleteOne({ _id: ec._id }).catch(() => {});
      }
    }

    if (cleanMobile) {
      const mobileExists = await User.findOne({ mobile: cleanMobile });
      if (mobileExists) {
        return NextResponse.json({
          success: false,
          message: "This mobile number is already registered. Please use a different number or sign in.",
        }, { status: 409 });
      }
    }

    // ── Branch Email Uniqueness & Database Validation ─────────────────────────
    if (Array.isArray(additionalGstins) && additionalGstins.length > 0) {
      const branchEmailSet = new Set<string>();

      for (let i = 0; i < additionalGstins.length; i++) {
        const br = additionalGstins[i];
        const brEmail = br.email ? String(br.email).trim().toLowerCase() : "";

        if (!brEmail || !brEmail.includes("@")) {
          return NextResponse.json({
            success: false,
            message: `Please enter a valid email address for Branch #${i + 1}.`,
          }, { status: 400 });
        }

        // Must not match Head Office email
        if (brEmail === cleanEmail) {
          return NextResponse.json({
            success: false,
            message: `Branch #${i + 1} email (${brEmail}) cannot be the same as Head Office email. Please use a unique email for this branch.`,
          }, { status: 400 });
        }

        // Must not duplicate other branches in this request
        if (branchEmailSet.has(brEmail)) {
          return NextResponse.json({
            success: false,
            message: `Duplicate branch email detected: "${brEmail}". Each branch must have a unique email address.`,
          }, { status: 400 });
        }
        branchEmailSet.add(brEmail);

        // Must not already exist in database as an active User
        const userWithBranchEmail = await User.findOne({ email: brEmail });
        if (userWithBranchEmail) {
          return NextResponse.json({
            success: false,
            message: `Branch #${i + 1} email (${brEmail}) is already registered in the system. Please use a different email address.`,
          }, { status: 409 });
        }
        // Clean up any stale orphaned company record matching this branch email
        const branchComps = await Company.find({ email: brEmail });
        for (const bComp of branchComps) {
          const compUser = await User.findOne({ companyId: bComp._id });
          if (!compUser) {
            await Company.deleteOne({ _id: bComp._id }).catch(() => {});
          }
        }
      }
    }

    // ── OTP Verification ──────────────────────────────────────────────────────
    const emailOtp = await Otp.findOne({
      email: cleanEmail,
      type: "email",
      verified: true,
    });

    if (!emailOtp) {
      return NextResponse.json({
        success: false,
        message: "Email OTP verification is required for Head Office before registration. Please verify your email.",
      }, { status: 400 });
    }

    if (cleanMobile) {
      const mobileOtp = await Otp.findOne({
        mobile: cleanMobile,
        type: "mobile",
        verified: true,
      });

      if (!mobileOtp) {
        return NextResponse.json({
          success: false,
          message: "Mobile OTP verification is required before registration. Please verify your mobile number.",
        }, { status: 400 });
      }
    }

    // ── Branch Email OTP Verification ─────────────────────────────────────────
    if (Array.isArray(additionalGstins) && additionalGstins.length > 0) {
      for (let i = 0; i < additionalGstins.length; i++) {
        const br = additionalGstins[i];
        const brEmail = br.email ? String(br.email).trim().toLowerCase() : "";
        if (brEmail && brEmail !== cleanEmail) {
          const brOtp = await Otp.findOne({
            email: brEmail,
            type: "email",
            verified: true,
          });
          if (!brOtp) {
            return NextResponse.json({
              success: false,
              message: `Email OTP verification is required for Branch #${i + 1} (${brEmail}). Please verify branch email.`,
            }, { status: 400 });
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Company & Tenant Setup ────────────────────────────────────────────────
    const tenantId = await generateUniqueTenantId();
    const finalCompanyName = companyName.trim();
    const cleanGstNo = String(gstNo || "").trim().toUpperCase();
    const derivedPan = panNo || extractPanFromGstin(cleanGstNo) || "";
    const stateCode = extractStateCodeFromGstin(cleanGstNo);
    const finalState = (state || "").trim();

    // Generate unique company code: first 4 letters + 3-digit random
    const baseCode = finalCompanyName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "PHAR";
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const companyCode = `${baseCode}${randomSuffix}`;

    // Ensure company code is unique
    const codeExists = await Company.findOne({ companyCode });
    const finalCompanyCode = codeExists ? `${baseCode}${Math.floor(100 + Math.random() * 900)}` : companyCode;

    const formattedAdditionalGstins = Array.isArray(additionalGstins)
      ? additionalGstins
          .filter((g: any) => g && typeof g === "object" && (g.branchName || g.gstNo || g.city || g.address || g.mobile || g.email))
          .map((g: any, idx: number) => ({
            branchName: (g.branchName || "").trim() || `${finalCompanyName} - Branch ${idx + 1}`,
            gstNo: String(g.gstNo || "").trim().toUpperCase(),
            state: (g.state || finalState || "").trim(),
            stateCode: g.stateCode || extractStateCodeFromGstin(g.gstNo || "") || stateCode,
            verified: Boolean(g.verified),
            address: g.address || "",
            city: g.city || "",
            pincode: g.pincode || "",
            email: g.email ? String(g.email).trim().toLowerCase() : cleanEmail,
            mobile: g.mobile ? String(g.mobile).replace(/\D/g, "") : cleanMobile,
            password: g.password ? String(g.password) : "",
          }))
      : [];

    // ── Create Primary Head Office Company ────────────────────────────────────
    const newCompany = await Company.create({
      tenantId,
      companyCode: finalCompanyCode,
      companyName: finalCompanyName,
      ownerName: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      gstNo: cleanGstNo,
      panNo: derivedPan,
      drugLicenseNo: drugLicenseNo || "",
      address: address || "",
      city: city || "",
      state: finalState,
      pincode: pincode || "",
      businessType: businessType || "",
      additionalGstins: formattedAdditionalGstins,
      enabledModules: [],
      status: "Active",
      isDefault: true,
      isHeadOffice: true,
      parentCompanyId: null,
      companyId: null,
      invoicePrefix: null,
      purchasePrefix: null,
      currency: null,
      termsAccepted: Boolean(termsAccepted),
    });
    createdCompanyId = newCompany._id;

    // ── Dynamically Calculate Active Financial Year (April 1 to March 31) ─────
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 0=Jan, 3=Apr
    const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    const dynamicFyName = `${startYear}-${endYear.toString().slice(2)}`;
    const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59));

    await FinancialYear.create({
      tenantId,
      companyId: newCompany._id,
      fyCode: `${finalCompanyCode}_${dynamicFyName.replace(/[^0-9]/g, "")}`,
      fyName: dynamicFyName,
      startDate,
      endDate,
      isCurrent: true,
      status: "Active",
    });

    // ── Ensure Admin Role (Multi-Tenant safe) ───────────────────────────────────
    let adminRole = await Role.findOne({
      $or: [
        { tenantId, roleName: ROLE_TYPE.ADMIN },
        { roleName: ROLE_TYPE.ADMIN },
      ],
    });
    if (!adminRole) {
      try {
        adminRole = await Role.create({
          tenantId,
          roleName: ROLE_TYPE.ADMIN,
          description: "Company Administrator with full system access",
          status: "Active",
        });
      } catch {
        adminRole = await Role.findOne({ roleName: ROLE_TYPE.ADMIN });
      }
    }

    // ── Create Admin User ─────────────────────────────────────────────────────
    const generatedEmployeeCode = await generateUniqueEmployeeCode(name.trim());

    const user = await User.create({
      tenantId,
      companyId: newCompany._id,
      roleId: adminRole._id,
      roleName: ROLE_TYPE.ADMIN,
      roleType: ROLE_TYPE.ADMIN,
      role: ROLE_TYPE.ADMIN,
      dashboardType: "admin",
      employeeCode: generatedEmployeeCode,
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      designation: designation || "Company Admin",
      gstNo: cleanGstNo,
      address: address ? address.trim() : "",
      city: city ? city.trim() : "",
      state: finalState,
      country: "India",
      pincode: pincode ? pincode.trim() : "",
      status: USER_APPROVAL_STATUS.PENDING,
      isApproved: false,
      accessDurationDays: DEFAULT_ACCESS_DAYS,
      accessValidUntil: null,
      mobileVerified: true,
      termsAccepted: Boolean(termsAccepted),
    });
    userCreated = true;

    // Link createdBy on Head Office
    newCompany.createdBy = user._id;
    await newCompany.save();

    // ── Create Separate Company Documents for Each Branch ──────────────────────
    for (let i = 0; i < formattedAdditionalGstins.length; i++) {
      const branch = formattedAdditionalGstins[i];
      const branchSuffix = Math.floor(100 + Math.random() * 900);
      const branchCompanyCode = `${baseCode}_BR${i + 1}_${branchSuffix}`;
      const branchDerivedPan = branch.gstNo ? extractPanFromGstin(branch.gstNo) : derivedPan;
      const branchState = branch.state || finalState;

      const branchCompany = await Company.create({
        tenantId,
        companyCode: branchCompanyCode,
        companyName: branch.branchName || `${finalCompanyName} - Branch ${i + 1}`,
        ownerName: name.trim(),
        email: branch.email || cleanEmail,
        mobile: branch.mobile || cleanMobile,
        gstNo: branch.gstNo || "",
        panNo: branchDerivedPan || "",
        drugLicenseNo: drugLicenseNo || "",
        address: branch.address || "",
        city: branch.city || "",
        state: branchState,
        pincode: branch.pincode || "",
        businessType: businessType || "",
        status: "Active",
        isDefault: false,
        isHeadOffice: false,
        companyId: newCompany._id,
        parentCompanyId: newCompany._id,
        invoicePrefix: null,
        purchasePrefix: null,
        currency: null,
        createdBy: user._id,
        termsAccepted: Boolean(termsAccepted),
      });

      // Create dedicated User account for this Branch Admin if password was provided
      if (branch.password) {
        const branchHashedPassword = await bcrypt.hash(branch.password, 12);
        const branchEmployeeCode = await generateUniqueEmployeeCode(branch.branchName || `BR${i + 1}`);

        const branchUser = await User.create({
          tenantId,
          companyId: branchCompany._id,
          roleId: adminRole._id,
          roleName: ROLE_TYPE.ADMIN,
          roleType: ROLE_TYPE.ADMIN,
          role: ROLE_TYPE.ADMIN,
          dashboardType: "admin",
          employeeCode: branchEmployeeCode,
          name: branch.branchName || `${finalCompanyName} - Branch ${i + 1}`,
          email: branch.email,
          mobile: branch.mobile || cleanMobile,
          password: branchHashedPassword,
          designation: "Branch Admin",
          gstNo: branch.gstNo || cleanGstNo,
          address: branch.address || "",
          city: branch.city || "",
          state: branchState,
          country: "India",
          pincode: branch.pincode || "",
          status: USER_APPROVAL_STATUS.PENDING,
          isApproved: false,
          accessDurationDays: DEFAULT_ACCESS_DAYS,
          accessValidUntil: null,
          mobileVerified: true,
          termsAccepted: Boolean(termsAccepted),
        });

        branchCompany.createdBy = branchUser._id;
        await branchCompany.save();
      }
    }

    // ── Cleanup OTPs ──────────────────────────────────────────────────────────
    const allEmailsToClean = [cleanEmail, ...formattedAdditionalGstins.map((g: any) => g.email).filter(Boolean)];
    const otpCleanupConditions: Array<{ email?: { $in: string[] }; mobile?: string; type: string }> = [
      { email: { $in: allEmailsToClean }, type: "email" },
    ];
    if (cleanMobile) {
      otpCleanupConditions.push({ mobile: cleanMobile, type: "mobile" });
    }
    await Otp.deleteMany({
      $or: otpCleanupConditions,
    });

    return NextResponse.json({
      success: true,
      message: "MabsolCrm Workspace & Account Created. Your account is pending Super Admin approval before you can log in.",
      isApproved: false,
      status: USER_APPROVAL_STATUS.PENDING,
      tenantId,
      user: {
        _id: user._id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        roleType: user.roleType,
        gstNo: user.gstNo || cleanGstNo,
        companyId: newCompany._id,
        companyName: newCompany.companyName,
      },
      company: {
        _id: newCompany._id,
        tenantId: newCompany.tenantId,
        companyName: newCompany.companyName,
        companyCode: finalCompanyCode,
        gstNo: newCompany.gstNo,
      },
    });
  } catch (error: any) {
    console.error("[REGISTER ERROR]:", error);
    // If company was created but registration failed before User was created, delete orphaned company
    if (createdCompanyId && !userCreated) {
      await Company.deleteOne({ _id: createdCompanyId }).catch(() => {});
    }
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Registration Failed. Please try again.",
      },
      { status: 500 }
    );
  }
}