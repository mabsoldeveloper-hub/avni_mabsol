import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
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
    // 2. Head Office (isHeadOffice === true): can see all branches under its tenant
    // 3. Branch (isHeadOffice === false): can ONLY see itself and any sub-branches created under it
    //    (Cannot see Head Office, cannot see sibling branches)
    let query: Record<string, any> = {};

    if (isSuperAdmin) {
      query = {};
    } else if (userCompany?.isHeadOffice) {
      query = { tenantId: user.tenantId };
    } else if (userCompany) {
      // Find all companies in the tenant to resolve child branch hierarchy
      const allTenantCompanies = await Company.find({ tenantId: user.tenantId }).lean();

      const allowedIds = new Set<string>();
      allowedIds.add(userCompany._id.toString());

      // Collect all descendants recursively
      let addedNew = true;
      while (addedNew) {
        addedNew = false;
        for (const comp of allTenantCompanies) {
          const compIdStr = comp._id.toString();
          const parentIdStr = comp.parentCompanyId ? comp.parentCompanyId.toString() : null;
          if (parentIdStr && allowedIds.has(parentIdStr) && !allowedIds.has(compIdStr)) {
            allowedIds.add(compIdStr);
            addedNew = true;
          }
        }
      }

      query = {
        _id: { $in: Array.from(allowedIds) },
      };
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

    const company = await Company.create({
      tenantId: targetTenantId,
      companyCode: data.companyCode,
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

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Company Create Error =>", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}