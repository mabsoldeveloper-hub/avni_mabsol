import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import Division from "@/models/Division";
import SubDivision from "@/models/SubDivision";
import Category from "@/models/Category";
import MrTerritory from "@/models/MrTerritory";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

const PRODUCT_PROJECTION = {
  _id: 1,
  CODE: 1,
  PRODUCT: 1,
  NAME: 1,
  DESCRIPT: 1,
  GCODE: 1,
  GCODE6: 1,
  COMPANY: 1,
  DIV: 1,
  DIVISION: 1,
  SUBDIV: 1,
  SUB_DIV: 1,
  CAT: 1,
  CATEGORY: 1,
  PACK: 1,
  PACKING: 1,
  MRP: 1,
  PRATE: 1,
  RATEF: 1,
  BALANCE: 1,
  IGST: 1,
  STATUS: 1,
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: Request) {
  const startedAt = Date.now();

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Optional: allow frontend to request limited data
    const limit = Math.min(Number(searchParams.get("limit") || 0) || 0, 5000); // 0 = no limit
    const search = clean(searchParams.get("search"));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(Number(searchParams.get("pageSize") || 50), 200);

    const [companyVfpMatch, user] = await Promise.all([
      getCompanyVfpFilter(searchParams),
      getCurrentUser(),
    ]);

    // ---------- MR Territory ----------
    let allowedGCODEs: string[] | null = null;

    if (user) {
      const roleName = clean(user.roleId?.roleName).toLowerCase();

      if (!roleName.includes("admin")) {
        const territories = await MrTerritory.find(
          { userId: user._id, status: "Active" },
          { companyCode: 1, _id: 0 }
        )
          .lean()
          .maxTimeMS(3000);

        if (territories.length > 0) {
          allowedGCODEs = Array.from(
            new Set(
              territories
                .map((t: any) => clean(t.companyCode))
                .filter(Boolean)
            )
          );
        }
      }
    }

    if (allowedGCODEs !== null && allowedGCODEs.length === 0) {
      return NextResponse.json([]);
    }

    // ---------- Product Filter ----------
    let productFilter: any = combineFilters(companyVfpMatch);

    if (allowedGCODEs !== null) {
      productFilter = combineFilters(productFilter, {
        GCODE: { $in: allowedGCODEs },
      });
    }

    // Server-side search (very important for performance)
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      productFilter = {
        $and: [
          productFilter,
          {
            $or: [
              { PRODUCT: regex },
              { CODE: regex },
              { GCODE: regex },
              { COMPANY: regex },
            ],
          },
        ],
      };
    }

    // ---------- Count + Data in parallel (if paginated) ----------
    const usePagination = !limit && searchParams.has("page");

    let products: any[] = [];
    let total = 0;

    if (usePagination) {
      const skip = (page - 1) * pageSize;

      const [countResult, productResult] = await Promise.all([
        Product.countDocuments(productFilter).maxTimeMS(5000),
        Product.find(productFilter, PRODUCT_PROJECTION)
          .sort({ PRODUCT: 1 })
          .skip(skip)
          .limit(pageSize)
          .lean()
          .maxTimeMS(8000),
      ]);

      total = countResult;
      products = productResult;
    } else {
      // Full list (old behaviour) – but with optional hard limit
      const query = Product.find(productFilter, PRODUCT_PROJECTION)
        .sort({ PRODUCT: 1 })
        .lean()
        .maxTimeMS(12000);

      if (limit > 0) {
        query.limit(limit);
      }

      products = await query;
    }

    if (products.length === 0) {
      console.log(
        `GET /api/master/product: 0 products in ${Date.now() - startedAt}ms`
      );
      return NextResponse.json(usePagination ? { data: [], total: 0, page, pageSize } : []);
    }

    // ---------- SaleType & Hierarchy Masters ----------
    const requiredCodes = Array.from(
      new Set(
        products
          .flatMap((p: any) => [clean(p.GCODE), clean(p.GCODE6)])
          .filter(Boolean)
      )
    );

    const [saleTypes, dbDivisions, dbSubDivisions, dbCategories] = await Promise.all([
      requiredCodes.length > 0
        ? SaleType.find(
            { SCODE: { $in: requiredCodes } },
            { _id: 0, SCODE: 1, SNAME: 1, SGCODE: 1 }
          )
            .lean()
            .maxTimeMS(4000)
        : [],
      Division.find({ status: { $ne: "Inactive" } }, { divisionCode: 1, divisionName: 1, companyCode: 1 })
        .lean()
        .maxTimeMS(4000)
        .catch(() => []),
      SubDivision.find(
        { status: { $ne: "Inactive" } },
        { subDivisionCode: 1, subDivisionName: 1, divisionCode: 1, companyCode: 1 }
      )
        .lean()
        .maxTimeMS(4000)
        .catch(() => []),
      Category.find({ status: { $ne: "Inactive" } }, { categoryCode: 1, categoryName: 1 })
        .lean()
        .maxTimeMS(4000)
        .catch(() => []),
    ]);

    const companyMap = new Map<string, string>();
    const hsnMap = new Map<string, string>();

    for (const item of saleTypes as any[]) {
      const code = clean(item.SCODE);
      if (!code) continue;

      if (item.SNAME) companyMap.set(code, clean(item.SNAME));
      if (clean(item.SGCODE).toUpperCase() === "COMMCD") {
        hsnMap.set(code, clean(item.SNAME));
      }
    }

    const divisionMap = new Map<string, string>();
    for (const d of dbDivisions as any[]) {
      const dCode = clean(d.divisionCode).toUpperCase();
      const dName = clean(d.divisionName);
      if (dCode && dName) {
        divisionMap.set(dCode, dName);
        if (d.companyCode) {
          divisionMap.set(`${clean(d.companyCode).toUpperCase()}_${dCode}`, dName);
        }
      }
    }

    const subDivisionMap = new Map<string, string>();
    for (const s of dbSubDivisions as any[]) {
      const sCode = clean(s.subDivisionCode).toUpperCase();
      const sName = clean(s.subDivisionName);
      if (sCode && sName) {
        subDivisionMap.set(sCode, sName);
        if (s.companyCode && s.divisionCode) {
          subDivisionMap.set(
            `${clean(s.companyCode).toUpperCase()}_${clean(s.divisionCode).toUpperCase()}_${sCode}`,
            sName
          );
        }
      }
    }

    const categoryMap = new Map<string, string>();
    for (const c of dbCategories as any[]) {
      const cCode = clean(c.categoryCode).toUpperCase();
      const cName = clean(c.categoryName);
      if (cCode && cName) {
        categoryMap.set(cCode, cName);
      }
    }

    // ---------- Enrich ----------
    const result = products.map((p: any) => {
      const gcode = clean(p.GCODE);
      const gcode6 = clean(p.GCODE6);
      const currentStock = Number(p.BALANCE ?? 0);
      const ratef = Number(p.RATEF ?? 0);
      const prate = Number(p.PRATE ?? 0);
      const mrp = Number(p.MRP ?? 0);

      const marginPct =
        ratef > 0 && prate > 0
          ? Math.round(((ratef - prate) / ratef) * 100)
          : 0;

      const stockValue =
        currentStock > 0 ? Math.round(currentStock * (prate || mrp)) : 0;

      const divRaw = clean(p.DIV || p.DIVISION || "");
      const subDivRaw = clean(p.SUBDIV || p.SUB_DIV || "");
      const catRaw = clean(p.CAT || p.CATEGORY || "");
      const pack = clean(p.PACK || p.PACKING || "");

      const divKey = divRaw.toUpperCase();
      const divisionName =
        divisionMap.get(`${gcode.toUpperCase()}_${divKey}`) ||
        divisionMap.get(divKey) ||
        divRaw;

      const subDivKey = subDivRaw.toUpperCase();
      const subDivisionName =
        subDivisionMap.get(`${gcode.toUpperCase()}_${divKey}_${subDivKey}`) ||
        subDivisionMap.get(subDivKey) ||
        subDivRaw;

      const catKey = catRaw.toUpperCase();
      const categoryName = categoryMap.get(catKey) || catRaw;

      return {
        ...p,
        companyName:
          companyMap.get(gcode) ||
          (p.COMPANY && p.COMPANY !== "ZZZZZZ 144" ? String(p.COMPANY) : ""),
        division: divisionName || divRaw || "",
        divisionCode: divRaw,
        subDivision: subDivisionName || subDivRaw || "",
        subDivisionCode: subDivRaw,
        category: categoryName || catRaw || "",
        categoryCode: catRaw,
        pack,
        HSN: hsnMap.get(gcode6) || "",
        marginPct,
        stockValue,
        BALANCE: currentStock,
        currentStock,
      };
    });

    console.log(
      `GET /api/master/product: ${result.length} products in ${Date.now() - startedAt}ms`
    );

    // Paginated response (recommended going forward)
    if (usePagination) {
      return NextResponse.json({
        data: result,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    }

    // Backward compatible (full list)
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/master/product error:", error);

    return NextResponse.json(
      {
        error: "Failed to load products",
        message:
          process.env.NODE_ENV === "development"
            ? String(error?.message || error)
            : undefined,
      },
      { status: 500 }
    );
  }
}