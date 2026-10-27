import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SaleType from "@/models/SaleType";
import Company from "@/models/Company";
import Division from "@/models/Division";
import SubDivision from "@/models/SubDivision";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function clean(v: unknown): string {
  return String(v ?? "").replace(/\u0000/g, "").trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const selectedCompanyCode = clean(searchParams.get("companyCode"));
    const selectedDivisionCode = clean(searchParams.get("divisionCode"));
    const selectedSubDivisionCode = clean(searchParams.get("subDivisionCode"));
    const selectedCategoryCode = clean(searchParams.get("categoryCode"));
    const searchProduct = clean(searchParams.get("searchProduct"));

    // 1. Fetch Companies (from SaleType ZZZZZZ, Company model, and Product distincts)
    const [saleTypeComps, dbComps, distinctProductComps] = await Promise.all([
      SaleType.find({ SGCODE: "ZZZZZZ" }).select("SCODE SNAME").lean().catch(() => []),
      Company.find({}).select("companyCode companyName").lean().catch(() => []),
      Product.distinct("COMPANY").catch(() => []),
    ]);

    const companyMap = new Map<string, string>();

    // From SaleType (standard pharma VFP mapping)
    for (const c of saleTypeComps as any[]) {
      const code = clean(c.SCODE);
      const name = clean(c.SNAME);
      if (code) companyMap.set(code, name || code);
    }

    // From Company master
    for (const c of dbComps as any[]) {
      const code = clean(c.companyCode);
      const name = clean(c.companyName);
      if (code) companyMap.set(code, name || code);
    }

    // From Product table
    for (const raw of distinctProductComps as any[]) {
      const code = clean(raw);
      if (code && !companyMap.has(code) && code !== "ZZZZZZ 144") {
        companyMap.set(code, code);
      }
    }

    const companies = Array.from(companyMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 2. Fetch Divisions
    const divFilter: any = { status: { $ne: "Inactive" } };
    if (selectedCompanyCode) {
      const escComp = escapeRegex(selectedCompanyCode);
      divFilter.$or = [
        { companyCode: { $regex: new RegExp(`^${escComp}$`, "i") } },
        { companyName: { $regex: new RegExp(`^${escComp}$`, "i") } },
      ];
    }

    const [dbDivs, distinctProductDivs] = await Promise.all([
      Division.find(divFilter).select("companyCode divisionCode divisionName").lean().catch(() => []),
      selectedCompanyCode
        ? Product.distinct("DIV", {
            $or: [
              { COMPANY: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
              { GCODE: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
            ],
          }).catch(() => [])
        : Product.distinct("DIV").catch(() => []),
    ]);

    const divisionMap = new Map<string, { code: string; name: string; companyCode: string }>();

    for (const d of dbDivs as any[]) {
      const code = clean(d.divisionCode);
      const name = clean(d.divisionName);
      const compCode = clean(d.companyCode);
      if (code) {
        divisionMap.set(`${compCode}_${code}`, { code, name: name || code, companyCode: compCode });
      }
    }

    for (const raw of distinctProductDivs as any[]) {
      const code = clean(raw);
      if (code && !divisionMap.has(`${selectedCompanyCode}_${code}`)) {
        divisionMap.set(`${selectedCompanyCode}_${code}`, {
          code,
          name: code,
          companyCode: selectedCompanyCode,
        });
      }
    }

    const divisions = Array.from(divisionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // 3. Fetch Sub-Divisions
    const subDivFilter: any = { status: { $ne: "Inactive" } };
    if (selectedCompanyCode) {
      const escComp = escapeRegex(selectedCompanyCode);
      subDivFilter.$or = [
        { companyCode: { $regex: new RegExp(`^${escComp}$`, "i") } },
        { companyName: { $regex: new RegExp(`^${escComp}$`, "i") } },
      ];
    }
    if (selectedDivisionCode) {
      const escDiv = escapeRegex(selectedDivisionCode);
      subDivFilter.divisionCode = { $regex: new RegExp(`^${escDiv}$`, "i") };
    }

    const [dbSubDivs, distinctProductSubDivs] = await Promise.all([
      SubDivision.find(subDivFilter)
        .select("companyCode divisionCode subDivisionCode subDivisionName")
        .lean()
        .catch(() => []),
      Product.distinct("SUBDIV", {
        ...(selectedCompanyCode
          ? {
              $or: [
                { COMPANY: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
                { GCODE: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
              ],
            }
          : {}),
        ...(selectedDivisionCode ? { DIV: new RegExp(`^${escapeRegex(selectedDivisionCode)}$`, "i") } : {}),
      }).catch(() => []),
    ]);

    const subDivisionMap = new Map<string, { code: string; name: string; companyCode: string; divisionCode: string }>();

    for (const s of dbSubDivs as any[]) {
      const code = clean(s.subDivisionCode);
      const name = clean(s.subDivisionName);
      const compCode = clean(s.companyCode);
      const divCode = clean(s.divisionCode);
      if (code) {
        subDivisionMap.set(`${compCode}_${divCode}_${code}`, {
          code,
          name: name || code,
          companyCode: compCode,
          divisionCode: divCode,
        });
      }
    }

    for (const raw of distinctProductSubDivs as any[]) {
      const code = clean(raw);
      if (code && !subDivisionMap.has(`${selectedCompanyCode}_${selectedDivisionCode}_${code}`)) {
        subDivisionMap.set(`${selectedCompanyCode}_${selectedDivisionCode}_${code}`, {
          code,
          name: code,
          companyCode: selectedCompanyCode,
          divisionCode: selectedDivisionCode,
        });
      }
    }

    const subDivisions = Array.from(subDivisionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // 4. Fetch Categories
    const catFilter: any = { status: { $ne: "Inactive" } };
    if (selectedCompanyCode) {
      const escComp = escapeRegex(selectedCompanyCode);
      catFilter.$or = [
        { companyCode: { $regex: new RegExp(`^${escComp}$`, "i") } },
        { companyName: { $regex: new RegExp(`^${escComp}$`, "i") } },
      ];
    }
    if (selectedDivisionCode) {
      const escDiv = escapeRegex(selectedDivisionCode);
      catFilter.divisionCode = { $regex: new RegExp(`^${escDiv}$`, "i") };
    }
    if (selectedSubDivisionCode) {
      const escSub = escapeRegex(selectedSubDivisionCode);
      catFilter.subDivisionCode = { $regex: new RegExp(`^${escSub}$`, "i") };
    }

    const [dbCats, distinctProductCats] = await Promise.all([
      Category.find(catFilter)
        .select("companyCode divisionCode subDivisionCode categoryCode categoryName")
        .lean()
        .catch(() => []),
      Product.distinct("CAT", {
        ...(selectedCompanyCode
          ? {
              $or: [
                { COMPANY: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
                { GCODE: new RegExp(`^${escapeRegex(selectedCompanyCode)}$`, "i") },
              ],
            }
          : {}),
        ...(selectedDivisionCode ? { DIV: new RegExp(`^${escapeRegex(selectedDivisionCode)}$`, "i") } : {}),
        ...(selectedSubDivisionCode ? { SUBDIV: new RegExp(`^${escapeRegex(selectedSubDivisionCode)}$`, "i") } : {}),
      }).catch(() => []),
    ]);

    const categoryMap = new Map<string, { code: string; name: string; companyCode: string; divisionCode: string; subDivisionCode: string }>();

    for (const c of dbCats as any[]) {
      const code = clean(c.categoryCode);
      const name = clean(c.categoryName);
      const compCode = clean(c.companyCode);
      const divCode = clean(c.divisionCode);
      const subDivCode = clean(c.subDivisionCode);
      if (code) {
        categoryMap.set(`${compCode}_${divCode}_${subDivCode}_${code}`, {
          code,
          name: name || code,
          companyCode: compCode,
          divisionCode: divCode,
          subDivisionCode: subDivCode,
        });
      }
    }

    for (const raw of distinctProductCats as any[]) {
      const code = clean(raw);
      if (code && !categoryMap.has(`${selectedCompanyCode}_${selectedDivisionCode}_${selectedSubDivisionCode}_${code}`)) {
        categoryMap.set(`${selectedCompanyCode}_${selectedDivisionCode}_${selectedSubDivisionCode}_${code}`, {
          code,
          name: code,
          companyCode: selectedCompanyCode,
          divisionCode: selectedDivisionCode,
          subDivisionCode: selectedSubDivisionCode,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // 5. Fetch Products (cascaded by selected Company, Division, SubDivision, Category)
    const productQuery: any = {};
    const andClauses: any[] = [];

    if (selectedCompanyCode) {
      const escComp = escapeRegex(selectedCompanyCode);
      andClauses.push({
        $or: [
          { COMPANY: new RegExp(`^${escComp}$`, "i") },
          { GCODE: new RegExp(`^${escComp}$`, "i") },
          { companyCode: selectedCompanyCode },
        ],
      });
    }

    if (selectedDivisionCode) {
      const escDiv = escapeRegex(selectedDivisionCode);
      andClauses.push({
        $or: [
          { DIV: new RegExp(`^${escDiv}$`, "i") },
          { DIVISION: new RegExp(`^${escDiv}$`, "i") },
          { divisionCode: selectedDivisionCode },
        ],
      });
    }

    if (selectedSubDivisionCode) {
      const escSub = escapeRegex(selectedSubDivisionCode);
      andClauses.push({
        $or: [
          { SUBDIV: new RegExp(`^${escSub}$`, "i") },
          { SUB_DIV: new RegExp(`^${escSub}$`, "i") },
          { subDivisionCode: selectedSubDivisionCode },
        ],
      });
    }

    if (selectedCategoryCode) {
      const escCat = escapeRegex(selectedCategoryCode);
      andClauses.push({
        $or: [
          { CAT: new RegExp(`^${escCat}$`, "i") },
          { CATEGORY: new RegExp(`^${escCat}$`, "i") },
          { categoryCode: selectedCategoryCode },
        ],
      });
    }

    if (searchProduct) {
      const escProd = escapeRegex(searchProduct);
      andClauses.push({
        $or: [
          { PRODUCT: new RegExp(escProd, "i") },
          { BILLNAME: new RegExp(escProd, "i") },
          { CODE: new RegExp(escProd, "i") },
        ],
      });
    }

    if (andClauses.length > 0) {
      productQuery.$and = andClauses;
    }

    const rawProducts = await Product.find(productQuery)
      .select("CODE PRODUCT BILLNAME COMPANY GCODE DIV SUBDIV CAT PACK BALANCE MRP PRATE")
      .sort({ PRODUCT: 1 })
      .limit(1000)
      .lean();

    const productMap = new Map<string, any>();
    for (const p of rawProducts) {
      const code = clean(p.CODE);
      if (!code) continue;
      if (!productMap.has(code)) {
        productMap.set(code, {
          code,
          name: clean(p.PRODUCT || p.BILLNAME || `Product ${code}`),
          pack: clean(p.PACK || p.PACKING || ""),
          stock: Number(p.BALANCE || 0),
          company: clean(p.COMPANY || p.GCODE || ""),
          division: clean(p.DIV || p.DIVISION || ""),
          subDivision: clean(p.SUBDIV || p.SUB_DIV || ""),
          category: clean(p.CAT || p.CATEGORY || ""),
        });
      } else {
        const existing = productMap.get(code);
        existing.stock += Number(p.BALANCE || 0);
      }
    }

    const products = Array.from(productMap.values());

    return NextResponse.json({
      success: true,
      companies,
      divisions,
      subDivisions,
      categories,
      products,
    });
  } catch (error: any) {
    console.error("Error in /api/inventory-intelligence/filter-options:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

