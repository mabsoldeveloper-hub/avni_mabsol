import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const companyVfpMatch = await getCompanyVfpFilter(searchParams);
  const restriction = await getMrTerritoryRestriction();

  let productFilter: any = combineFilters(companyVfpMatch);
  if (restriction.isMrRestricted) {
    if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
      productFilter = combineFilters(companyVfpMatch, {
        GCODE: {
          $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes],
        },
      });
    } else {
      return NextResponse.json([]);
    }
  }

  const [products, saleTypes, productBatches] = await Promise.all([
    Product.find(productFilter).sort({ PRODUCT: 1, NAME: 1 }).lean(),
    SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean(),
    ProductBatch.find({}).lean(),
  ]);

  // SCODE -> SNAME map (Company Name)
  const companyMap = new Map();
  saleTypes.forEach((st: any) => {
    companyMap.set(String(st.SCODE).trim(), String(st.SNAME).trim());
  });

  // Batch Map (Product Code/Name -> Batches Array)
  const batchMap = new Map<string, any[]>();
  productBatches.forEach((b: any) => {
    const keys = [
      String(b.PRODUCT || "").trim().toUpperCase(),
      String(b.CODE || "").trim().toUpperCase(),
      String(b.ITEM || "").trim().toUpperCase(),
    ].filter(Boolean);

    const batchObj = {
      batchNo: b.BATCH || b.BATCHNO || "DEFAULT",
      expiry: b.EXPIRY || "",
      stock: Number(b.BALANCE ?? 0),
      mrp: Number(b.MRP || 0),
      ratef: Number(b.RATEF || 0),
    };

    keys.forEach((key) => {
      const list = batchMap.get(key) || [];
      list.push(batchObj);
      batchMap.set(key, list);
    });
  });

  const result = products.map((p: any) => {
    const gcodeStr = String(p.GCODE || "").trim();
    const codeKey = String(p.PRODUCT || p.CODE || "").trim().toUpperCase();
    const nameKey = String(p.NAME || "").trim().toUpperCase();

    const batches = batchMap.get(codeKey) || batchMap.get(nameKey) || [];

    // Fallback batch if p.BATCH exists directly on product
    const finalBatches =
      batches.length > 0
        ? batches
        : p.BATCH
        ? [
            {
              batchNo: p.BATCH,
              expiry: p.EXPIRY || "",
              stock: Number(p.BALANCE ?? 0),
              mrp: Number(p.MRP || 0),
              ratef: Number(p.RATEF || 0),
            },
          ]
        : [];

    const exactProductName = String(p.PRODUCT || p.NAME || p.DESCRIPT || "Unnamed Product").trim();

    // Marg rule: Product.BALANCE is the authoritative current product stock.
    const currentStock = Number(p.BALANCE ?? 0);

    return {
      ...p,
      currentStock: currentStock,
      NAME: exactProductName,
      PRODUCT: exactProductName,
      companyName: companyMap.get(gcodeStr) || (p.COMPANY && p.COMPANY !== "ZZZZZZ 144" ? p.COMPANY : "N/A"),
      batches: finalBatches,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const productName = String(body.PRODUCT || body.NAME || "").trim();

    if (!productName) {
      return NextResponse.json(
        { success: false, message: "Product Name is required" },
        { status: 400 }
      );
    }

    const numericFields = [
      "MRP", "PRATE", "RATEF", "LPRATE", "COST", "RATEA", "RATEB", "RATEC", "RATED", "RATEE", "RATEG",
      "CONVRATE", "CGST", "SGST", "IGST", "CESS", "STAX", "CLBAL", "STOCK", "MINQTY", "MAXQTY", "REORDER",
      "DISCOUNT", "MAXDISC", "NETRATE"
    ];

    const productData: Record<string, any> = {};

    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined && body[key] !== null) {
        productData[key] = body[key];
      }
    });

    productData.PRODUCT = productName;
    productData.NAME = productName;
    productData.CODE = body.CODE || `PROD_${Date.now().toString().slice(-6)}`;

    // Unique VFP keys to prevent E11000 index collision
    productData._vfpTable = body._vfpTable || "vfp_new_folder_pro";
    productData._vfpSourceKey = body._vfpSourceKey || `MANUAL_PROD_${productData.CODE}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    numericFields.forEach((field) => {
      if (field in body && body[field] !== "" && body[field] !== null && body[field] !== undefined) {
        const num = Number(body[field]);
        productData[field] = isNaN(num) ? 0 : num;
      }
    });

    const newProduct = await Product.create(productData);

    // Also create initial ProductBatch if batch is provided
    if (body.BATCH && String(body.BATCH).trim()) {
      await ProductBatch.create({
        PRODUCT: productData.CODE,
        BATCH: String(body.BATCH).trim(),
        EXPIRY: body.EXPIRY || "",
        CLBAL: Number(productData.CLBAL || productData.STOCK || 0),
        MRP: Number(productData.MRP || 0),
        RATEF: Number(productData.RATEF || 0),
        _vfpTable: "vfp_new_folder_probat",
        _vfpSourceKey: `MANUAL_BAT_${productData.CODE}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });
    }

    return NextResponse.json(
      { success: true, message: "Product created successfully", data: newProduct },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}