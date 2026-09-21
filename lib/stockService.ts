import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import StockMovement from "@/models/StockMovement";
import StockBalance from "@/models/StockBalance";

export type StockMovementType =
  | "OPENING"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "PURCHASE"
  | "PURCHASE_RETURN"
  | "SALE"
  | "SALE_RETURN"
  | "DAMAGE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export interface StockItemInput {
  companyId: string;
  companyCode?: string;
  fyId: string;
  fyCode?: string;
  productId?: string;
  productCode: string;
  productName?: string;
  batchNo?: string;
  expiry?: string;
  mfgDate?: string;
  quantity: number;
  type: StockMovementType;
  referenceType?: string;
  referenceId?: string;
  referenceNo?: string;
  referenceKey: string;
  rate?: number;
  mrp?: number;
  remarks?: string;
  createdBy?: string;
}

const clean = (v: any) => String(v ?? "").trim();
const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function aliases(input: Pick<StockItemInput, "productCode" | "productName">) {
  return Array.from(
    new Set(
      [clean(input.productCode), clean(input.productName)]
        .filter(Boolean)
        .map((x) => x.toUpperCase())
    )
  );
}

function productConditions(productCode: string, productName = "") {
  const vals = Array.from(new Set([clean(productCode), clean(productName)].filter(Boolean)));
  const out: any[] = [];
  for (const v of vals) {
    out.push({ PRODUCT: v }, { NAME: v }, { CODE: v }, { CODEP: v });
    if (/^\d+$/.test(v)) {
      out.push({ CODE: Number(v) }, { CODEP: Number(v) });
    }
  }
  return out;
}

function batchConditions(productCode: string, productName: string, batchNo: string) {
  return {
    $and: [
      { $or: productConditions(productCode, productName) },
      {
        $or: [
          { BATCHNO: batchNo },
          { BATCH: batchNo },
          { BNO: batchNo },
        ],
      },
    ],
  };
}

function isOutMovement(type: StockMovementType) {
  return ["STOCK_OUT", "PURCHASE_RETURN", "SALE", "DAMAGE", "ADJUSTMENT_OUT"].includes(type);
}

function isDefaultBatch(batchNo: string) {
  const b = clean(batchNo).toUpperCase();
  return !b || ["DEFAULT", "DEF", "-", "N/A", "NA"].includes(b);
}

function firstStockValue(row: any) {
  if (!row) return 0;
  // Marg rule: PRO.BALANCE / PROBAT.BALANCE is current stock.
  return num(row.BALANCE);
}

async function resolveProduct(input: Pick<StockItemInput, "productCode" | "productName" | "productId">) {
  const code = clean(input.productCode);
  const name = clean(input.productName);
  let product: any = null;

  if (clean(input.productId)) {
    try {
      product = await Product.findById(input.productId).lean();
    } catch {}
  }

  if (!product) {
    product = await Product.findOne({
      $or: productConditions(code, name),
    }).lean();
  }

  const canonicalCode = clean(product?.PRODUCT || product?.NAME || code);
  const canonicalName = clean(product?.PRODUCT || product?.NAME || name || code);

  return { product, canonicalCode, canonicalName };
}

async function findLegacyProduct(productCode: string, productName = "") {
  return Product.findOne({
    $or: productConditions(productCode, productName),
  }).lean();
}

async function readLegacyStock(
  productCode: string,
  productName: string,
  batchNo: string
) {
  // For a real batch, use the exact PROBAT row.
  if (batchNo && !isDefaultBatch(batchNo)) {
    const batch: any = await ProductBatch.findOne(
      batchConditions(productCode, productName, batchNo)
    ).lean();

    if (batch) {
      return {
        available: firstStockValue(batch),
        source: "PRODUCT_BATCH" as const,
        batch,
      };
    }

    // Some Marg imports expose BATCHNO as the internal batch id while the
    // invoice UI can carry the visible BATCH value. Try both product aliases.
    const batchByOnlyNo: any = await ProductBatch.findOne({
      $or: [
        { BATCHNO: batchNo },
        { BATCH: batchNo },
        { BNO: batchNo },
      ],
    }).lean();

    if (batchByOnlyNo) {
      return {
        available: firstStockValue(batchByOnlyNo),
        source: "PRODUCT_BATCH" as const,
        batch: batchByOnlyNo,
      };
    }

    return { available: 0, source: "NONE" as const, batch: null };
  }

  // DEFAULT/no-batch uses the product master current balance.
  const product: any = await findLegacyProduct(productCode, productName);
  return {
    available: firstStockValue(product),
    source: "PRODUCT" as const,
    batch: null,
  };
}

/**
 * Read available stock without changing the database.
 *
 * Priority:
 *   1) exact company + FY + product + batch StockBalance
 *   2) alias product/batch StockBalance created by an older version
 *   3) existing Marg ProductBatch balance for a real batch
 *   4) existing Marg Product balance for DEFAULT/no-batch
 */
export async function getAvailableStock(
  input: Pick<
    StockItemInput,
    "companyId" | "fyId" | "productId" | "productCode" | "productName" | "batchNo"
  >
) {
  const companyId = clean(input.companyId);
  const fyId = clean(input.fyId);
  const batchNo = clean(input.batchNo);
  const { product, canonicalCode, canonicalName } = await resolveProduct(input);

  if (!companyId || !fyId) return 0;

  // Marg PRO/PROBAT BALANCE is authoritative current stock.
  // StockBalance is the CRM movement mirror and does not override it.
  const legacy = await readLegacyStock(
    canonicalCode || clean(input.productCode),
    canonicalName || clean(input.productName),
    batchNo
  );
  return num(legacy.available);
}

async function seedLegacyStockIfNeeded(input: StockItemInput) {
  const companyId = clean(input.companyId);
  const fyId = clean(input.fyId);
  const batchNo = clean(input.batchNo);

  if (!isOutMovement(input.type)) return null;

  const { product, canonicalCode, canonicalName } = await resolveProduct(input);
  const existing = await StockBalance.findOne({
    companyId,
    fyId,
    productCode: canonicalCode,
    batchNo,
  }).lean();

  if (existing) return existing;

  // If an older row used the UI alias, adopt it instead of creating another bucket.
  const aliasRows = await StockBalance.find({
    companyId,
    fyId,
    productCode: { $in: aliases({ productCode: canonicalCode, productName: canonicalName }) },
    batchNo,
  }).lean();

  if (aliasRows.length) return aliasRows.sort((a: any, b: any) => num(b.currentQty) - num(a.currentQty))[0];

  const legacy = await readLegacyStock(canonicalCode, canonicalName, batchNo);
  const legacyQty = num(legacy.available);

  // A real batch must never borrow product-total stock.
  if (batchNo && !isDefaultBatch(batchNo) && legacy.source !== "PRODUCT_BATCH") {
    return null;
  }

  const referenceKey =
    `LEGACY-SEED:${companyId}:${fyId}:${canonicalCode}:${batchNo || "__NO_BATCH__"}`;

  const alreadySeeded = await StockMovement.findOne({ referenceKey }).lean();
  if (alreadySeeded) {
    return StockBalance.findOne({
      companyId,
      fyId,
      productCode: canonicalCode,
      batchNo,
    }).lean();
  }

  const legacyBatch: any = legacy.batch;
  const seeded = await StockBalance.findOneAndUpdate(
    { companyId, fyId, productCode: canonicalCode, batchNo },
    {
      $setOnInsert: {
        companyCode: clean(input.companyCode),
        fyCode: clean(input.fyCode),
        productId: clean(input.productId || product?._id),
        productName: canonicalName,
        batchNo,
        expiry: clean(input.expiry) || clean(legacyBatch?.EXP || legacyBatch?.EXPIRY),
        mfgDate: clean(input.mfgDate) || clean(legacyBatch?.MFD || legacyBatch?.MFG),
        mrp: num(input.mrp) || num(legacyBatch?.MRP || product?.MRP),
        rate: num(input.rate) || num(legacyBatch?.PRATE || legacyBatch?.LPRATE || product?.PRATE || product?.LPRATE),
        openingQty: 0,
        currentQty: legacyQty,
        lastMovementAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await StockMovement.create({
      companyId,
      companyCode: clean(input.companyCode),
      fyId,
      fyCode: clean(input.fyCode),
      productId: clean(input.productId || product?._id),
      productCode: canonicalCode,
      productName: canonicalName,
      batchNo,
      expiry: clean(input.expiry) || clean(legacyBatch?.EXP || legacyBatch?.EXPIRY),
      mfgDate: clean(input.mfgDate) || clean(legacyBatch?.MFD || legacyBatch?.MFG),
      type: "ADJUSTMENT_IN",
      quantity: legacyQty,
      referenceType: "LEGACY_STOCK_MIGRATION",
      referenceNo: "LEGACY-STOCK",
      referenceKey,
      rate: num(input.rate) || num(legacyBatch?.PRATE || legacyBatch?.LPRATE || product?.PRATE),
      mrp: num(input.mrp) || num(legacyBatch?.MRP || product?.MRP),
      remarks: "Initial stock imported from existing Marg VFP Product/ProductBatch balance",
      createdBy: clean(input.createdBy),
    });
  } catch (e: any) {
    if (e?.code !== 11000) throw e;
  }

  return seeded;
}

export async function applyStockMovement(input: StockItemInput) {
  const companyId = clean(input.companyId);
  const fyId = clean(input.fyId);
  const requestedCode = clean(input.productCode);
  const requestedName = clean(input.productName);
  const batchNo = clean(input.batchNo);

  if (!companyId) throw new Error("companyId is required for stock movement");
  if (!fyId) throw new Error("fyId is required for stock movement");
  if (!requestedCode && !requestedName) throw new Error("productCode is required for stock movement");

  const { product, canonicalCode, canonicalName } = await resolveProduct(input);
  const productCode = canonicalCode || requestedCode || requestedName;
  const productName = canonicalName || requestedName || requestedCode;

  let signedQty = num(input.quantity);

  if (isOutMovement(input.type)) {
    signedQty = -Math.abs(signedQty);
  } else if (
    ["OPENING", "STOCK_IN", "PURCHASE", "SALE_RETURN", "ADJUSTMENT_IN"].includes(input.type)
  ) {
    signedQty = Math.abs(signedQty);
  }

  if (signedQty === 0) {
    return { movement: null, balance: null, alreadyApplied: false };
  }

  const referenceKey = clean(input.referenceKey);
  if (!referenceKey) throw new Error("referenceKey is required for stock movement");

  const existingMovement: any = await StockMovement.findOne({ referenceKey }).lean();
  if (existingMovement) {
    const existingBalance = await StockBalance.findOne({
      companyId,
      fyId,
      productCode,
      batchNo,
    }).lean();

    return {
      movement: existingMovement,
      balance: existingBalance,
      alreadyApplied: true,
    };
  }

  if (signedQty < 0) {
    await seedLegacyStockIfNeeded({
      ...input,
      productId: clean(input.productId || product?._id),
      productCode,
      productName,
      companyId,
      fyId,
      batchNo,
    });
  }

  // Adopt an alias balance if it already exists.
  let existingBalance: any = await StockBalance.findOne({
    companyId,
    fyId,
    productCode,
    batchNo,
  }).lean();

  if (!existingBalance) {
    const aliasesFound = await StockBalance.find({
      companyId,
      fyId,
      productCode: { $in: aliases({ productCode: requestedCode, productName: requestedName }) },
      batchNo,
    }).lean();

    if (aliasesFound.length) existingBalance = aliasesFound.sort(
      (a: any, b: any) => num(b.currentQty) - num(a.currentQty)
    )[0];
  }

  // Always start from the authoritative Marg balance. This deliberately
  // reconciles any stale StockBalance row left by earlier test versions.
  const legacyCurrent = await readLegacyStock(productCode, productName, batchNo);
  const currentQty = num(legacyCurrent.available);

  if (signedQty < 0 && currentQty + signedQty < 0) {
    throw new Error(
      `Insufficient stock for ${productName}${batchNo ? ` (Batch ${batchNo})` : ""}. Available: ${currentQty}, Required: ${Math.abs(signedQty)}`
    );
  }

  const now = new Date();
  const balanceFilter = existingBalance?._id
    ? { _id: existingBalance._id }
    : { companyId, fyId, productCode, batchNo };

  const balance: any = await StockBalance.findOneAndUpdate(
    balanceFilter,
    {
      $set: {
        companyId, companyCode: clean(input.companyCode), fyId, fyCode: clean(input.fyCode),
        productId: clean(input.productId || product?._id), productCode, productName, batchNo,
        expiry: clean(input.expiry), mfgDate: clean(input.mfgDate), mrp: num(input.mrp), rate: num(input.rate),
        currentQty: currentQty + signedQty, lastMovementAt: now,
      },
      ...(input.type === "OPENING" ? { $inc: { openingQty: signedQty } } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Keep legacy Marg fields synchronized for old screens.
  try {
    const inc = { BALANCE: signedQty };
    await Product.updateOne(
      { _id: product?._id } as any,
      { $inc: inc }
    );
  } catch (e) {
    console.error("Legacy Product stock sync failed:", e);
  }

  // Only synchronize a real selected batch. DEFAULT is a synthetic invoice bucket.
  if (batchNo && !isDefaultBatch(batchNo)) {
    try {
      const batchFilter = batchConditions(requestedCode || productCode, requestedName || productName, batchNo);
      const existingBatch: any = await ProductBatch.findOne(batchFilter).lean();

      if (existingBatch) {
        await ProductBatch.updateOne(
          { _id: existingBatch._id },
          { $inc: { BALANCE: signedQty } }
        );
      } else {
        const numericCode =
          /^\d+$/.test(productCode) ? Number(productCode) : productCode;

        await ProductBatch.create({
          CODE: numericCode,
          PRODUCT: productCode,
          BATCHNO: batchNo,
          BATCH: batchNo,
          EXP: clean(input.expiry),
          MFD: clean(input.mfgDate),
          MRP: num(input.mrp),
          PRATE: num(input.rate),
          LPRATE: num(input.rate),
          BALANCE: signedQty,
          OPENING: input.type === "OPENING" ? signedQty : 0,
        });
      }
    } catch (e) {
      console.error("Legacy ProductBatch stock sync failed:", e);
    }
  }

  try {
    const movement = await StockMovement.create({
      companyId,
      companyCode: clean(input.companyCode),
      fyId,
      fyCode: clean(input.fyCode),
      productId: clean(input.productId || product?._id),
      productCode,
      productName,
      batchNo,
      expiry: clean(input.expiry),
      mfgDate: clean(input.mfgDate),
      type: input.type,
      quantity: signedQty,
      referenceType: clean(input.referenceType),
      referenceId: clean(input.referenceId),
      referenceNo: clean(input.referenceNo),
      referenceKey,
      rate: num(input.rate),
      mrp: num(input.mrp),
      remarks: clean(input.remarks),
      createdBy: clean(input.createdBy),
    });

    return { movement, balance, alreadyApplied: false };
  } catch (e: any) {
    if (e?.code === 11000) {
      const movement = await StockMovement.findOne({ referenceKey }).lean();
      const balance = await StockBalance.findOne({
        companyId,
        fyId,
        productCode,
        batchNo,
      }).lean();
      return { movement, balance, alreadyApplied: true };
    }
    throw e;
  }
}

export async function replaceOpeningStock(
  input: Omit<StockItemInput, "type" | "quantity" | "referenceKey"> & { quantity: number }
) {
  const { canonicalCode } = await resolveProduct(input);
  const productCode = canonicalCode || clean(input.productCode);
  const batchNo = clean(input.batchNo);

  const referenceKey =
    `OPENING:${clean(input.companyId)}:${clean(input.fyId)}:${productCode}:${batchNo}`;

  const old: any = await StockMovement.findOne({ referenceKey }).lean();

  if (old) {
    const oldQty = Math.max(0, num(old.quantity));
    const newQty = Math.max(0, num(input.quantity));
    const delta = newQty - oldQty;

    if (delta !== 0) {
      const result = await applyStockMovement({
        ...input,
        productCode,
        type: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity: Math.abs(delta),
        referenceType: "OPENING_EDIT",
        referenceId: String(old._id),
        referenceNo: input.referenceNo || "OPENING",
        referenceKey: `OPENING_EDIT:${clean(input.companyId)}:${clean(input.fyId)}:${productCode}:${batchNo}:${Date.now()}`,
        remarks: `Opening stock correction: ${oldQty} → ${newQty}`,
      });

      await StockMovement.updateOne(
        { referenceKey },
        { $set: { quantity: newQty } }
      );

      await StockBalance.updateOne(
        {
          companyId: clean(input.companyId),
          fyId: clean(input.fyId),
          productCode,
          batchNo,
        },
        { $set: { openingQty: newQty } }
      );

      return result;
    }

    return {
      movement: old,
      balance: await StockBalance.findOne({
        companyId: input.companyId,
        fyId: input.fyId,
        productCode,
        batchNo,
      }).lean(),
      alreadyApplied: true,
    };
  }

  return applyStockMovement({
    ...input,
    productCode,
    type: "OPENING",
    quantity: Math.max(0, num(input.quantity)),
    referenceType: "OPENING_STOCK",
    referenceNo: input.referenceNo || "OPENING",
    referenceKey,
  });
}

export async function getCurrentStock(
  companyId: string,
  fyId: string,
  productCode?: string,
  batchNo?: string
) {
  const query: any = {
    companyId: clean(companyId),
    fyId: clean(fyId),
  };

  if (productCode) query.productCode = clean(productCode);
  if (batchNo) query.batchNo = clean(batchNo);

  return StockBalance.find(query)
    .sort({ productName: 1, batchNo: 1 })
    .lean();
}
