import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import Role from "@/models/Role";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userCompany = user.companyId ? await Company.findById(user.companyId) : null;
    const isSuperAdmin = user.roleType === ROLE_TYPE.SUPER_ADMIN;

    // Visibility Rules:
    // 1. SuperAdmin: can see all companies across all tenants
    // 2. Head Office (isHeadOffice === true): can see its own company AND all child branches under it
    // 3. Child Branch (isHeadOffice === false): can ONLY see itself (cannot access parent or sibling company data)
    let query: Record<string, any> = {};

    if (isSuperAdmin) {
      query = {};
    } else if (userCompany?.isHeadOffice) {
      query = {
        $or: [
          { _id: userCompany._id },
          { parentCompanyId: userCompany._id },
          { tenantId: user.tenantId },
        ],
      };
    } else if (userCompany) {
      query = { _id: userCompany._id };
    } else if (user.tenantId) {
      query = { tenantId: user.tenantId };
    } else {
      return NextResponse.json([]);
    }

    const companies = await Company.find(query).sort({ createdAt: -1 });
    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("Company Master GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Always use the logged-in user's tenantId
    const targetTenantId = user.tenantId || `TENANT_${user._id}`;
    const userCompany = user.companyId ? await Company.findById(user.companyId) : null;
    const parentCompanyId = userCompany ? userCompany._id : null;

    // Validate company name
    if (!data.companyName?.trim()) {
      return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 });
    }

    // Auto-generate unique company CRM code based on Company Name + Random Number (e.g. ABHI724, SUNP512)
    // Code should be company name and random number, never MAB... or generic
    let finalCode = (data.companyCode || "").trim().toUpperCase();
    if (!finalCode || finalCode.startsWith("MAB") || finalCode.startsWith("COM")) {
      const words = data.companyName.trim().split(/\s+/).filter(Boolean);
      let prefix = "";
      if (words.length > 0) {
        const firstWord = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (firstWord.length >= 3) {
          prefix = firstWord.slice(0, 5);
        } else {
          prefix = words.map((w: string) => w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()).join("").slice(0, 5);
        }
      }
      if (prefix.length < 3) {
        prefix = data.companyName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
      }

      const existing = await Company.find({}, { companyCode: 1 }).lean();
      const existingCodes = new Set(existing.map((c: any) => String(c.companyCode || "").toUpperCase()));

      let attempts = 0;
      do {
        const rand = Math.floor(100 + Math.random() * 900);
        finalCode = `${prefix}${rand}`;
        attempts++;
      } while (existingCodes.has(finalCode) && attempts < 100);

      if (existingCodes.has(finalCode)) {
        finalCode = `${prefix}${Date.now().toString().slice(-4)}`;
      }
    }

    const company = await Company.create({
      tenantId: targetTenantId,
      companyCode: finalCode,
      companyName: data.companyName.trim(),
      ownerName: data.ownerName || user.name || "",
      email: data.email?.toLowerCase?.().trim() || user.email || "",
      mobile: data.mobile?.replace(/\D/g, "") || "",
      website: data.website || "",
      gstNo: String(data.gstNo || "").trim().toUpperCase(),
      panNo: data.panNo || "",
      drugLicenseNo: data.drugLicenseNo || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      invoicePrefix: data.invoicePrefix || null,
      purchasePrefix: data.purchasePrefix || null,
      currency: data.currency || null,
      logo: data.logo || "",
      enabledModules: Array.isArray(data.enabledModules) ? data.enabledModules : [],
      status: data.status || "Active",
      isDefault: false,
      isHeadOffice: false,
      parentCompanyId: parentCompanyId,
      createdBy: user._id || null,
    });

    // Create or link Administrator User for this company so they can log in directly
    if (data.email) {
      const cleanEmail = String(data.email).toLowerCase().trim();
      let companyUser = await User.findOne({ email: cleanEmail });
      const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : "";

      if (companyUser) {
        companyUser.companyId = company._id;
        if (hashedPassword) companyUser.password = hashedPassword;
        companyUser.status = "Active";
        companyUser.isApproved = true;
        companyUser.isUnlimitedAccess = true;
        companyUser.accessValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await companyUser.save();
      } else {
        let adminRole = await Role.findOne({
          $or: [
            { tenantId: targetTenantId, roleName: ROLE_TYPE.ADMIN },
            { roleName: ROLE_TYPE.ADMIN },
          ],
        });
        if (!adminRole) {
          try {
            adminRole = await Role.create({
              tenantId: targetTenantId,
              roleName: ROLE_TYPE.ADMIN,
              description: "Company Administrator",
              status: "Active",
            });
          } catch {
            adminRole = await Role.findOne({ roleName: ROLE_TYPE.ADMIN });
          }
        }

        const employeeCode = `EMP_${Math.floor(1000 + Math.random() * 9000)}`;
        await User.create({
          tenantId: targetTenantId,
          companyId: company._id,
          roleId: adminRole?._id,
          roleName: ROLE_TYPE.ADMIN,
          roleType: ROLE_TYPE.ADMIN,
          role: ROLE_TYPE.ADMIN,
          dashboardType: "admin",
          employeeCode,
          name: data.ownerName?.trim() || data.companyName.trim(),
          email: cleanEmail,
          mobile: data.mobile?.replace(/\D/g, "") || "",
          password: hashedPassword || (await bcrypt.hash("Admin@123", 10)),
          designation: "Company Administrator",
          status: "Active",
          isApproved: true,
          isUnlimitedAccess: true,
          accessDurationDays: 365,
          accessValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }
    }

    return NextResponse.json({ success: true, company, companyCode: finalCode });
  } catch (error: any) {
    console.error("Company Create Error =>", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}