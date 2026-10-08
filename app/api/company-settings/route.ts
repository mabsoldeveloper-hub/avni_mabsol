import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import { getCurrentUser } from "@/lib/auth";
import {
  EMAIL_REGEX,
  MOBILE_REGEX,
  GSTIN_REGEX,
  PINCODE_REGEX,
  PAN_REGEX,
} from "@/lib/constants/validation.constant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const requestedCompanyId = searchParams.get("companyId") || "";

    let query: any = {};
    if (requestedCompanyId && requestedCompanyId.length === 24) {
      query._id = requestedCompanyId;
    } else if (user?.companyId) {
      const userCompId = typeof user.companyId === "object" ? user.companyId._id : user.companyId;
      query._id = userCompId;
    } else if (user?.tenantId) {
      query.tenantId = user.tenantId;
    } else {
      query.tenantId = "TENANT001";
    }

    let company = await Company.findOne(query);

    // Fallback: If not found by query, try user tenantId or any active company
    if (!company && requestedCompanyId) {
      company = await Company.findById(requestedCompanyId);
    }
    if (!company && user?.tenantId) {
      company = await Company.findOne({ tenantId: user.tenantId });
    }
    if (!company) {
      company = await Company.findOne({});
    }

    return NextResponse.json(company || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const data = await req.json();
    const { searchParams } = new URL(req.url);
    const targetCompanyId = data.companyId || data._id || searchParams.get("companyId") || "";

    // Validation
    const errors: Record<string, string> = {};

    if (!data.companyName || String(data.companyName).trim().length < 2) {
      errors.companyName = "Company legal name is required (min 2 characters)";
    }

    if (data.email && !EMAIL_REGEX.test(String(data.email).trim())) {
      errors.email = "Enter a valid email address (e.g. contact@company.com)";
    }

    if (data.mobile) {
      const digits = String(data.mobile).replace(/\D/g, "");
      if (digits.length !== 10 || !MOBILE_REGEX.test(digits)) {
        errors.mobile = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
      }
    }

    if (data.gstNo && String(data.gstNo).trim()) {
      const gst = String(data.gstNo).trim().toUpperCase();
      if (gst.length !== 15 || !GSTIN_REGEX.test(gst)) {
        errors.gstNo = "Enter a valid 15-character GSTIN (e.g. 06AALCM8009M1Z1)";
      }
    }

    if (data.panNo && String(data.panNo).trim()) {
      const pan = String(data.panNo).trim().toUpperCase();
      if (pan.length !== 10 || !PAN_REGEX.test(pan)) {
        errors.panNo = "Enter a valid 10-character PAN (e.g. AALCM8009M)";
      }
    }

    if (data.pincode && String(data.pincode).trim()) {
      const pin = String(data.pincode).trim();
      if (!PINCODE_REGEX.test(pin)) {
        errors.pincode = "Enter a valid 6-digit PIN code (e.g. 110001)";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please correct the highlighted validation errors",
          errors,
        },
        { status: 400 }
      );
    }

    let query: any = {};
    if (targetCompanyId && String(targetCompanyId).length === 24) {
      query._id = targetCompanyId;
    } else if (user?.companyId) {
      const userCompId = typeof user.companyId === "object" ? user.companyId._id : user.companyId;
      query._id = userCompId;
    } else if (user?.tenantId) {
      query.tenantId = user.tenantId;
    } else {
      query.tenantId = "TENANT001";
    }

    // Prepare update fields (exclude non-schema or dangerous fields)
    const updatePayload: any = {
      companyName: String(data.companyName || "").trim(),
      ownerName: String(data.ownerName || "").trim(),
      email: String(data.email || "").trim(),
      mobile: String(data.mobile || "").trim(),
      website: String(data.website || "").trim(),
      gstNo: String(data.gstNo || "").trim().toUpperCase(),
      panNo: String(data.panNo || "").trim().toUpperCase(),
      drugLicenseNo: String(data.drugLicenseNo || "").trim(),
      address: String(data.address || "").trim(),
      city: String(data.city || "").trim(),
      state: String(data.state || "").trim(),
      pincode: String(data.pincode || "").trim(),
      invoicePrefix: String(data.invoicePrefix || "INV").trim().toUpperCase(),
      purchasePrefix: String(data.purchasePrefix || "PUR").trim().toUpperCase(),
      currency: String(data.currency || "INR").trim().toUpperCase(),
    };

    // Update logo if provided (or if explicitly emptied)
    if (data.logo !== undefined) {
      updatePayload.logo = String(data.logo || "").trim();
    }

    if (user?._id) {
      updatePayload.updatedBy = user._id;
    }

    let company = await Company.findOneAndUpdate(query, updatePayload, {
      new: true,
      upsert: false,
    });

    if (!company && targetCompanyId) {
      company = await Company.findByIdAndUpdate(targetCompanyId, updatePayload, {
        new: true,
      });
    }

    if (!company) {
      // If still not found, create new company with defaults
      company = await Company.create({
        ...updatePayload,
        tenantId: user?.tenantId || "TENANT001",
        companyCode: data.companyCode || `MAB${Math.floor(100 + Math.random() * 900)}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Company settings updated successfully",
      company,
    });
  } catch (error: any) {
    console.error("Save company settings error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save company settings" },
      { status: 500 }
    );
  }
}