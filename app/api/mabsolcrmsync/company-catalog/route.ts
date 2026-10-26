import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CompanyCatalog from "@/models/CompanyCatalog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const gstin = (searchParams.get("gstin") || searchParams.get("gstNo") || "").trim().toUpperCase();
    const shortCode = (searchParams.get("shortCode") || "").trim().toUpperCase();
    const companyName = (searchParams.get("companyName") || searchParams.get("name") || "").trim();
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const mobile = (searchParams.get("mobile") || searchParams.get("phone") || "").replace(/\D/g, "");

    if (!gstin && !shortCode && !email && !mobile && !companyName) {
      // Return list of all companies
      const all = await CompanyCatalog.find({}).sort({ ccode: 1 }).lean();
      return NextResponse.json({ success: true, count: all.length, data: all });
    }

    const queryConditions: any[] = [];
    if (gstin) queryConditions.push({ gstNo: gstin });
    if (shortCode) {
      queryConditions.push({ shortCode });
      queryConditions.push({ shortCode: { $regex: new RegExp(`^${shortCode}`, "i") } });
      const alphaPrefix = shortCode.replace(/[^A-Za-z]/g, "");
      if (alphaPrefix.length >= 3) {
        queryConditions.push({ shortCode: { $regex: new RegExp(`^${alphaPrefix}`, "i") } });
      }
    }
    if (companyName) {
      const escapedCompName = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryConditions.push({ companyName: { $regex: new RegExp(escapedCompName, "i") } });
      // Also match core words if full string doesn't match
      const firstWord = companyName.split(/[\s,]+/)[0];
      if (firstWord && firstWord.length >= 3) {
        queryConditions.push({ companyName: { $regex: new RegExp(`^${firstWord}`, "i") } });
      }
    }
    if (email) queryConditions.push({ email });
    if (mobile) {
      queryConditions.push({ mobile: { $regex: new RegExp(`${mobile}$`) } });
      queryConditions.push({ phone: { $regex: new RegExp(`${mobile}`) } });
    }

    const matched = await CompanyCatalog.findOne({ $or: queryConditions }).lean();

    if (!matched) {
      return NextResponse.json({
        success: false,
        message: "No matching company record found in catalog",
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Company found in catalog",
      data: matched,
    });
  } catch (error: any) {
    console.error("[company-catalog] GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to query catalog" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const companies: any[] = Array.isArray(body) ? body : body.companies ? body.companies : [body];

    if (!companies.length) {
      return NextResponse.json(
        { success: false, message: "No company data provided" },
        { status: 400 }
      );
    }

    const upsertResults: any[] = [];

    for (const comp of companies) {
      const ccode = String(comp.ccode || "").trim().toUpperCase();
      const gstNo = String(comp.gstNo || comp.gstin || "").trim().toUpperCase();
      if (!ccode && !gstNo) continue;

      // Extract cleaned 10-digit mobile if present
      let rawPhone = String(comp.phone || "").trim();
      let mobile = String(comp.mobile || "").trim();
      if (!mobile && rawPhone) {
        const digitsOnly = rawPhone.match(/\b\d{10}\b/);
        if (digitsOnly) mobile = digitsOnly[0];
      }

      // Filter and clean financialYears
      const financialYears: any[] = Array.isArray(comp.financialYears)
        ? comp.financialYears.map((fy: any) => ({
            exten: Number(fy.exten || 1),
            companyDataCode: String(fy.companyDataCode || `${ccode}${String(fy.exten || 1).padStart(2, "0")}`).toUpperCase().trim(),
            startDate: String(fy.startDate || "").trim(),
            endDate: String(fy.endDate || "").trim(),
            fyName: String(fy.fyName || "").trim(),
            device: String(fy.device || "data").trim(),
          }))
        : [];

      // Sort financial years in chronological order
      financialYears.sort((a, b) => a.exten - b.exten);

      const activeCode =
        comp.activeCompanyDataCode ||
        (financialYears.length > 0 ? financialYears[0].companyDataCode : `${ccode}01`);

      // Match filter: priority to GSTIN, fallback to CCODE
      const filter = gstNo ? { gstNo } : { ccode };

      const updateDoc: any = {
        ccode,
        gstNo,
        companyName: comp.companyName || "",
        shortCode: String(comp.shortCode || "").trim().toUpperCase(),
        email: String(comp.email || "").trim().toLowerCase(),
        phone: rawPhone,
        mobile,
        website: comp.website || "",
        address: comp.address || "",
        city: comp.city || "",
        state: comp.state || "",
        country: comp.country || "India",
        jurisdiction: comp.jurisdiction || "",
        drugLicNo: comp.drugLicNo || "",
        financialYears,
        activeCompanyDataCode: activeCode,
        totalFinancialYears: financialYears.length,
        sourceFiles: comp.sourceFiles || [],
        lastSyncedAt: new Date(),
      };

      // Upsert into 1 consolidated document per company/GST
      const saved = await CompanyCatalog.findOneAndUpdate(
        filter,
        { $set: updateDoc },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      upsertResults.push(saved);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${upsertResults.length} company catalog document(s)`,
      count: upsertResults.length,
      data: upsertResults,
    });
  } catch (error: any) {
    console.error("[company-catalog] POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to sync company catalog" },
      { status: 500 }
    );
  }
}
