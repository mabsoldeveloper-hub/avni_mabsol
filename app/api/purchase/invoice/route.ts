import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Pendings from "@/models/Pendings";
import Order from "@/models/Order";
import Product from "@/models/Product";

import {
  consumeNextVoucherNumber,
  peekNextVoucherNumber,
} from "@/lib/voucherSeriesHelper";

import {
  getFYDateRange,
  buildFYDateQuery,
} from "@/lib/financialYearHelper";

import {
  getCompanyVfpFilter,
  combineFilters,
} from "@/lib/companyVfpHelper";

import { getCurrentUser } from "@/lib/auth";
import { applyStockMovement } from "@/lib/stockService";

export const dynamic = "force-dynamic";

/**
 * IMPORTANT MARG RELATION
 *
 * Purchase Header = MDIS
 * Purchase Items  = DIS
 *
 * For imported Marg purchase bills:
 *
 *   MDIS.CODEP    == DIS.CODEP
 *   MDIS.VOUCHER  == DIS.VOUCHER
 *
 * DO NOT use:
 *
 *   MDIS.VCN == DIS.VCN
 *
 * because Marg can have:
 *
 *   MDIS: VCN=P000035, VOUCHER=4120408, CODEP=CGVQ
 *   DIS : VCN=397,     VOUCHER=4120408, CODEP=CGVQ
 *
 * Therefore VOUCHER + CODEP is the item linkage.
 */

function clean(value: any): string {
  return String(value ?? "").trim();
}

function upper(value: any): string {
  return clean(value).toUpperCase();
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDate(value: any): string {
  if (!value) return "";

  const s = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  const d = new Date(value);

  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return s.slice(0, 10);
}

function getPaymentStatus(finalAmount: number, balanceAmount: number) {
  const finalAmt = Math.abs(num(finalAmount));
  const balance = Math.abs(num(balanceAmount));

  if (balance <= 0) return "Paid";
  if (balance < finalAmt) return "Partial";
  return "Pending";
}

/**
 * Find the supplier/party name using MDIS.CODEP -> ORDER.ORDNO.
 */
async function resolveVendorName(codep: string, fallback = "") {
  const code = clean(codep);

  if (!code) {
    return fallback || "Supplier";
  }

  const order = await Order.findOne(
    {
      $or: [
        { ORDNO: code },
        { ORDNO: code.toUpperCase() },
        { ORDNO: code.toLowerCase() },
      ],
    },
    {
      ORDNO: 1,
      PARNAM: 1,
      NAME: 1,
    }
  ).lean();

  return (
    clean(order?.PARNAM) ||
    clean(order?.NAME) ||
    fallback ||
    code ||
    "Supplier"
  );
}

/**
 * Build the frontend item object from one Marg DIS row.
 */
function mapDisRow(row: any, productMap: Map<string, any>, index: number) {
  const code = clean(row.CODE || row.PRODUCT || row.PCODE);

  const prod =
    productMap.get(code) ||
    productMap.get(upper(code)) ||
    null;

  const qty = num(row.QTY);
  const freeQty = num(row.FREE ?? row.FREEQTY);

  const rate = num(row.RATE ?? row.PRATE ?? row.LPRATE);
  const mrp = num(row.MRP ?? prod?.MRP);

  const disc1 = num(row.DISC1 ?? row.DISC);
  const disc2 = num(row.DISC2);
  const discountPercent = disc1 + disc2;

  const gstPercent =
    num(row.CGST) +
    num(row.SSTA ?? row.SGST) +
    num(row.IGST);

  const gross = qty * rate;
  const discountAmount = gross * (discountPercent / 100);

  const taxableAmount =
    row.AMMMWOD !== undefined
      ? num(row.AMMMWOD)
      : Math.max(0, gross - discountAmount);

  const gstAmount =
    num(row.CGSTAMO) +
    num(row.SSTAAMO ?? row.SGSTAMO) +
    num(row.IGSTAMO);

  const total =
    row.AMMMOUNT !== undefined
      ? num(row.AMMMOUNT)
      : taxableAmount + gstAmount;

  return {
    sno: index + 1,

    productId: prod?._id ? String(prod._id) : code,
    productCode: code,

    productName:
      clean(row.NAME) ||
      clean(row.PRODUCT) ||
      clean(prod?.PRODUCT) ||
      clean(prod?.BILLNAME) ||
      clean(prod?.NAME) ||
      `Product ${code}`,

    hsnCode:
      clean(row.HSN) ||
      clean(prod?.HSN) ||
      "",

    batchNo:
      clean(row.BATCH) ||
      clean(row.BATCHNO) ||
      "",

    expDate:
      clean(row.EXP) ||
      clean(row.EXPIRY) ||
      "",

    mfgDate:
      clean(row.MFD) ||
      clean(row.MFG) ||
      "",

    mrp,

    qty,
    freeQty,

    unit:
      clean(row.UNIT) ||
      clean(prod?.UNIT) ||
      "Box",

    rate,

    discountPercent,
    gstPercent,

    taxableAmount: Math.round(taxableAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Load DIS items for a Marg purchase header.
 *
 * PRIMARY LINK:
 *   CODEP + VOUCHER
 *
 * Secondary fallback only for manually-created records where CODEP
 * may not have existed in old data:
 *   VOUCHER
 */
async function loadPurchaseItems(mdis: any) {
  const codep = clean(mdis?.CODEP);
  const voucherRaw = mdis?.VOUCHER;
  const voucherText = clean(voucherRaw);

  if (!voucherText) {
    return [];
  }

  /*
   * IMPORTANT:
   * Marg stores VOUCHER as a numeric value in the imported DIS_F18 data.
   * The MDIS value may therefore be converted to text by clean().
   *
   * Example from the actual MDIS record:
   *   CODEP   = CGVQ
   *   VCN     = P000035
   *   VOUCHER = 4120408
   *
   * Build both numeric and string candidates so the lookup works
   * regardless of the Mongoose schema type used for VOUCHER.
   */
  const voucherNumber = Number(voucherText);
  const voucherCandidates = Number.isFinite(voucherNumber)
    ? [voucherNumber, voucherText]
    : [voucherText];

  let disRows: any[] = [];

  if (codep) {
    /*
     * PRIMARY Marg item relation:
     *   DIS.CODEP   == MDIS.CODEP
     *   DIS.VOUCHER == MDIS.VOUCHER
     *
     * TYPE is intentionally NOT filtered.
     */
    disRows = await SalesDis.find({
      CODEP: codep,
      VOUCHER: { $in: voucherCandidates },
    })
      .sort({ _vfpRowNumber: 1, _id: 1 })
      .lean();
  }

  /*
   * Fallback:
   * If CODEP did not match, use the same Marg voucher only.
   * Still do not filter TYPE.
   */
  if (disRows.length === 0) {
    disRows = await SalesDis.find({
      VOUCHER: { $in: voucherCandidates },
    })
      .sort({ _vfpRowNumber: 1, _id: 1 })
      .lean();
  }

  if (disRows.length === 0) {
    return [];
  }

  const productCodes = [
    ...new Set(
      disRows
        .map((r: any) => clean(r.CODE || r.PRODUCT || r.PCODE))
        .filter(Boolean)
    ),
  ];

  let products: any[] = [];

  if (productCodes.length > 0) {
    products = await Product.find(
      {
        $or: [
          { CODE: { $in: productCodes } },
          { PCODE: { $in: productCodes } },
          { PRODUCT: { $in: productCodes } },
        ],
      },
      {
        _id: 1,
        CODE: 1,
        PCODE: 1,
        PRODUCT: 1,
        BILLNAME: 1,
        NAME: 1,
        HSN: 1,
        UNIT: 1,
        MRP: 1,
      }
    ).lean();
  }

  const productMap = new Map<string, any>();

  for (const product of products) {
    for (const key of [
      product?.CODE,
      product?.PCODE,
      product?.PRODUCT,
    ]) {
      const k = clean(key);

      if (!k) continue;

      productMap.set(k, product);
      productMap.set(upper(k), product);
    }
  }

  return disRows.map((row, index) =>
    mapDisRow(row, productMap, index)
  );
}

/**
 * Convert one MDIS header into the frontend bill object.
 *
 * No PurchaseBill collection is used here.
 */
async function mapMdisToBill(
  mdis: any,
  options?: {
    includeItems?: boolean;
    pendingMap?: Map<string, any>;
    vendorMap?: Map<string, string>;
  }
) {
  const codep = clean(mdis.CODEP);
  const vcn = clean(mdis.VCN);
  const voucher = clean(mdis.VOUCHER);

  const supplierInvoiceNo =
    clean(mdis.PM) ||
    clean(mdis.SUPPINVNO) ||
    clean(mdis.INVNO);

  /*
   * Marg purchase screen:
   *   Bill Number      = VCN (example P000035)
   *   Supplier Inv No = PM  (example 397)
   */
  const displayBillNumber =
    vcn ||
    supplierInvoiceNo ||
    voucher ||
    "N/A";

  let vendorName =
    options?.vendorMap?.get(upper(codep)) ||
    clean(mdis.PARNAM) ||
    clean(mdis.NAME);

  if (!vendorName) {
    vendorName = await resolveVendorName(codep, codep);
  }

  let pending: any = null;

  if (options?.pendingMap) {
    pending =
      options.pendingMap.get(upper(supplierInvoiceNo)) ||
      options.pendingMap.get(upper(vcn)) ||
      options.pendingMap.get(upper(voucher));
  }

  const finalAmount = Math.abs(
    num(
      mdis.FINAL ??
      mdis.NETAMT ??
      mdis.AMOUNTT ??
      0
    )
  );

  const balanceAmount = pending
    ? Math.abs(
        num(
          pending.BALANCE ??
          pending.BAL ??
          finalAmount
        )
      )
    : finalAmount;

  const paidAmount = Math.max(
    0,
    finalAmount - balanceAmount
  );

  const bill: any = {
    _id: String(mdis._id),

    billNumber: displayBillNumber,

    supplierInvoiceNo,

    voucherNo: voucher,

    supplierPartyCode: codep,

    /**
     * Keep Marg's actual identifiers available.
     * This is useful for debugging and the detail modal.
     */
    margVcn: vcn,
    margVoucher: voucher,
    margCodep: codep,

    billDate: normalizeDate(mdis.DATE),

    dueDate:
      normalizeDate(mdis.DDATE) ||
      normalizeDate(mdis.DUEDATE),

    vendorId: codep,
    vendorCode: codep,
    vendorName,

    vendorGst: clean(mdis.GSTIN),
    vendorPhone: clean(mdis.PHONE),
    vendorAddress: clean(mdis.ADDRESS),

    poNumber:
      clean(mdis.PONO) ||
      clean(mdis.PO),

    netAmount: finalAmount,
    paidAmount,
    balanceAmount,

    paymentStatus: getPaymentStatus(
      finalAmount,
      balanceAmount
    ),

    items: [],

    isLegacy: true,
    source: "MDIS_DIS",
  };

  if (options?.includeItems) {
    bill.items = await loadPurchaseItems(mdis);
  }

  return bill;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action");

    /**
     * ---------------------------------------------------------
     * NEXT PURCHASE VOUCHER
     * ---------------------------------------------------------
     */
    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("PURCHASE");

      return NextResponse.json({
        success: true,
        nextVcn,
      });
    }

    const billId = clean(searchParams.get("id"));
    const vendorId = clean(searchParams.get("vendorId"));

    const companyId = clean(searchParams.get("companyId"));

    const search = clean(
      searchParams.get("search") ||
      searchParams.get("q")
    );

    /**
     * ---------------------------------------------------------
     * DETAIL
     *
     * IMPORTANT:
     * billId is now expected to be MDIS _id.
     * We do NOT search PurchaseBill.
     * ---------------------------------------------------------
     */
    if (billId) {
      let mdis: any = null;

      /**
       * First try Mongo ObjectId _id.
       */
      try {
        mdis = await SalesMdis.findById(billId).lean();
      } catch {
        mdis = null;
      }

      /**
       * Fallback: allow VCN / VOUCHER / supplier invoice number.
       */
      if (!mdis) {
        mdis = await SalesMdis.findOne({
          $or: [
            { VCN: billId },
            { VOUCHER: billId },
            { PM: billId },
            { SUPPINVNO: billId },
            { INVNO: billId },
          ],
        }).lean();
      }

      if (!mdis) {
        return NextResponse.json(
          {
            success: false,
            message: "Marg purchase bill not found in MDIS",
          },
          { status: 404 }
        );
      }

      const bill = await mapMdisToBill(mdis, {
        includeItems: true,
      });

      return NextResponse.json({
        success: true,
        bill,
      });
    }

    /**
     * ---------------------------------------------------------
     * LIST FILTER
     * ---------------------------------------------------------
     */
    const companyVfpMatch =
      await getCompanyVfpFilter(searchParams);

    const fyRange =
      await getFYDateRange(searchParams);

    const dateMatch =
      buildFYDateQuery(
        "DATE",
        fyRange.startDate,
        fyRange.endDate
      );

    let purchaseFilter: any =
      combineFilters(
        {
          TYPE: {
            $in: ["P", "PURCHASE"],
          },
        },
        dateMatch,
        companyVfpMatch
      );

    /**
     * Vendor filter is based on Marg CODEP.
     */
    if (vendorId) {
      purchaseFilter = combineFilters(
        purchaseFilter,
        {
          $or: [
            { CODEP: vendorId },
            { CODEP: upper(vendorId) },
          ],
        }
      );
    }

    /**
     * Search:
     * - VCN
     * - VOUCHER
     * - PM / supplier invoice
     * - CODEP
     * - party name
     */
    if (search) {
      const sReg = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      const matchingVendors =
        await Order.find(
          {
            $or: [
              { PARNAM: sReg },
              { NAME: sReg },
              { ORDNO: sReg },
            ],
          },
          {
            ORDNO: 1,
          }
        )
          .limit(500)
          .lean();

      const matchingCodes = [
        ...new Set(
          matchingVendors
            .map((v: any) => clean(v.ORDNO))
            .filter(Boolean)
        ),
      ];

      purchaseFilter = combineFilters(
        purchaseFilter,
        {
          $or: [
            { VCN: sReg },
            { VOUCHER: sReg },
            { PM: sReg },
            { SUPPINVNO: sReg },
            { INVNO: sReg },
            { CODEP: sReg },
            { NAME: sReg },
            { PARNAM: sReg },

            ...(matchingCodes.length
              ? [
                  {
                    CODEP: {
                      $in: matchingCodes,
                    },
                  },
                ]
              : []),
          ],
        }
      );
    }

    /**
     * ---------------------------------------------------------
     * MDIS HEADER QUERY
     * ---------------------------------------------------------
     *
     * We intentionally do NOT load PurchaseBill.
     */
    const mdisRows = await SalesMdis.find(
      purchaseFilter,
      {
        _id: 1,

        VCN: 1,
        VOUCHER: 1,
        TYPE: 1,

        CODEP: 1,
        NAME: 1,
        PARNAM: 1,

        DATE: 1,
        DDATE: 1,

        PM: 1,
        SUPPINVNO: 1,
        INVNO: 1,

        PONO: 1,
        PO: 1,

        FINAL: 1,
        NETAMT: 1,
        AMOUNTT: 1,

        PHONE: 1,
        GSTIN: 1,
        ADDRESS: 1,

        companyId: 1,
        companyCode: 1,
        fyId: 1,
        fyCode: 1,
      }
    )
      .sort({
        DATE: -1,
        _id: -1,
      })
      .limit(500)
      .lean();

    /**
     * ---------------------------------------------------------
     * PARTY MAP
     * MDIS.CODEP -> ORDER.ORDNO
     * ---------------------------------------------------------
     */
    const partyCodes = [
      ...new Set(
        mdisRows
          .map((row: any) => clean(row.CODEP))
          .filter(Boolean)
      ),
    ];

    const orders =
      partyCodes.length > 0
        ? await Order.find(
            {
              ORDNO: {
                $in: partyCodes,
              },
            },
            {
              ORDNO: 1,
              PARNAM: 1,
              NAME: 1,
            }
          ).lean()
        : [];

    const vendorMap =
      new Map<string, string>();

    for (const order of orders) {
      const code = upper(order.ORDNO);

      if (!code) continue;

      vendorMap.set(
        code,
        clean(order.PARNAM) ||
        clean(order.NAME) ||
        code
      );
    }

    /**
     * ---------------------------------------------------------
     * PENDINGS MAP
     *
     * Used only for payment/outstanding status.
     * It does NOT provide item rows.
     */
    const pmList = [
      ...new Set(
        mdisRows
          .map((row: any) =>
            clean(
              row.PM ||
              row.SUPPINVNO ||
              row.INVNO
            )
          )
          .filter(Boolean)
      ),
    ];

    const vcnList = [
      ...new Set(
        mdisRows
          .map((row: any) =>
            clean(row.VCN)
          )
          .filter(Boolean)
      ),
    ];

    const voucherList = [
      ...new Set(
        mdisRows
          .map((row: any) =>
            clean(row.VOUCHER)
          )
          .filter(Boolean)
      ),
    ];

    let pendings: any[] = [];

    if (
      pmList.length ||
      vcnList.length ||
      voucherList.length
    ) {
      const pendingOr: any[] = [];

      if (pmList.length || vcnList.length) {
        pendingOr.push({
          VCN: {
            $in: [
              ...pmList,
              ...vcnList,
            ],
          },
        });
      }

      if (voucherList.length) {
        pendingOr.push(
          {
            VOUCHER: {
              $in: voucherList,
            },
          },
          {
            SVOUCHER: {
              $in: voucherList,
            },
          }
        );
      }

      if (pendingOr.length) {
        pendings = await Pendings.find(
          {
            $or: pendingOr,
          },
          {
            VCN: 1,
            VOUCHER: 1,
            SVOUCHER: 1,
            BALANCE: 1,
            FINAL: 1,
            AMOUNT: 1,
          }
        ).lean();
      }
    }

    const pendingMap =
      new Map<string, any>();

    for (const pending of pendings) {
      const keys = [
        pending.VCN,
        pending.VOUCHER,
        pending.SVOUCHER,
      ];

      for (const key of keys) {
        const k = upper(key);

        if (!k) continue;

        /**
         * First pending record wins.
         * This avoids replacing a real balance with a duplicate
         * re-sync row.
         */
        if (!pendingMap.has(k)) {
          pendingMap.set(k, pending);
        }
      }
    }

    /**
     * ---------------------------------------------------------
     * BUILD FRONTEND LIST
     * ---------------------------------------------------------
     */
    const bills: any[] = [];

    for (const mdis of mdisRows) {
      const bill = await mapMdisToBill(
        mdis,
        {
          includeItems: false,
          pendingMap,
          vendorMap,
        }
      );

      bills.push(bill);
    }

    return NextResponse.json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error: any) {
    console.error(
      "GET Purchase Invoice / MDIS error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Server error while loading Marg purchase invoices",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      supplierInvoiceNo,
      poNumber,

      companyId,
      companyCode,

      fyId,
      fyCode,

      billDate,
      dueDate,

      vendorId,
      vendorCode,
      vendorName,

      vendorGst,
      vendorPhone,
      vendorAddress,

      items,
      remarks,
      paidAmount,
    } = body;

    if (!vendorName) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor Name is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least 1 item is required in the purchase bill",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ---------------------------------------------------------
     * VOUCHER NUMBER
     * ---------------------------------------------------------
     */
    let finalBillNumber =
      clean(body.billNumber);

    if (!finalBillNumber) {
      finalBillNumber =
        await consumeNextVoucherNumber(
          "PURCHASE"
        );
    }

    /**
     * ---------------------------------------------------------
     * CALCULATE ITEMS
     * ---------------------------------------------------------
     */
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems =
      items.map((it: any) => {
        const qty =
          num(it.qty, 0);

        const freeQty =
          num(it.freeQty, 0);

        const rate =
          num(it.rate, 0);

        const disc =
          num(it.discountPercent, 0);

        const gst =
          num(it.gstPercent, 0);

        const gross =
          qty * rate;

        const discountAmount =
          gross * (disc / 100);

        const taxable =
          Math.max(
            0,
            gross - discountAmount
          );

        const gstAmount =
          taxable * (gst / 100);

        const lineTotal =
          taxable + gstAmount;

        subtotal += gross;
        totalDiscount +=
          discountAmount;
        totalTax +=
          gstAmount;

        return {
          productId:
            clean(it.productId),

          productCode:
            clean(
              it.productCode ||
              it.code
            ),

          productName:
            clean(
              it.productName ||
              it.name
            ) || "Product",

          hsnCode:
            clean(it.hsnCode),

          batchNo:
            clean(
              it.batchNo ||
              it.batch ||
              ""
            ),

          expDate:
            clean(
              it.expDate ||
              it.expiry ||
              ""
            ),

          mfgDate:
            clean(
              it.mfgDate ||
              it.mfg ||
              ""
            ),

          mrp:
            num(it.mrp),

          qty,
          freeQty,

          unit:
            clean(it.unit) ||
            "Box",

          rate,

          discountPercent:
            disc,

          gstPercent:
            gst,

          taxableAmount:
            Math.round(
              taxable * 100
            ) / 100,

          gstAmount:
            Math.round(
              gstAmount * 100
            ) / 100,

          total:
            Math.round(
              lineTotal * 100
            ) / 100,
        };
      });

    const calculatedNetAmount =
      Math.round(
        (
          subtotal -
          totalDiscount +
          totalTax
        ) * 100
      ) / 100;

    const netAmount =
      body.netAmount !== undefined
        ? num(
            body.netAmount,
            calculatedNetAmount
          )
        : calculatedNetAmount;

    const paid =
      Math.max(
        0,
        num(paidAmount)
      );

    const balanceAmount =
      Math.max(
        0,
        Math.round(
          (
            netAmount -
            paid
          ) * 100
        ) / 100
      );

    /**
     * ---------------------------------------------------------
     * GST / ROUND OFF
     * ---------------------------------------------------------
     */
    const cgst =
      body.cgst !== undefined
        ? num(body.cgst)
        : 0;

    const sgst =
      body.sgst !== undefined
        ? num(body.sgst)
        : 0;

    const igst =
      body.igst !== undefined
        ? num(body.igst)
        : 0;

    const roundOff =
      body.roundOff !== undefined
        ? num(body.roundOff)
        : Math.round(
            (
              netAmount -
              (
                subtotal -
                totalDiscount +
                totalTax
              )
            ) * 100
          ) / 100;

    const vfpDate =
      clean(billDate) ||
      new Date()
        .toISOString()
        .slice(0, 10);

    const vfpDueDate =
      clean(dueDate) ||
      vfpDate;

    const vfpVendorCode =
      upper(
        vendorCode ||
        vendorId ||
        ""
      );

    if (!vfpVendorCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vendor CODEP / vendorCode is required for Marg purchase bill",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ---------------------------------------------------------
     * MDIS HEADER
     * ---------------------------------------------------------
     *
     * THIS is now the purchase bill header.
     *
     * VCN      = application bill number
     * VOUCHER  = same voucher used by DIS
     * CODEP    = supplier party code
     */
    const mdisDoc =
      await SalesMdis.create({
        VCN: finalBillNumber,

        VOUCHER:
          finalBillNumber,

        TYPE: "P",

        CODEP:
          vfpVendorCode,

        NAME:
          vendorName,

        PARNAM:
          vendorName,

        DATE:
          vfpDate,

        DDATE:
          vfpDueDate,

        FINAL:
          netAmount,

        NETAMT:
          netAmount,

        AMOUNT:
          subtotal,

        AMOUNTT:
          subtotal -
          totalDiscount,

        DISCOUNT:
          totalDiscount,

        TAXAMO:
          totalTax,

        CGSTAMO:
          cgst,

        STAXAMO:
          sgst,

        IGSTAMO:
          igst,

        FREIGHT:
          num(body.freightCharges),

        ROUND:
          roundOff,

        PM:
          clean(
            supplierInvoiceNo
          ) || finalBillNumber,

        PONO:
          clean(poNumber),

        PHONE:
          clean(vendorPhone),

        GSTIN:
          clean(vendorGst),

        ADDRESS:
          clean(vendorAddress),

        REMARK:
          clean(remarks),

        companyId:
          clean(companyId),

        companyCode:
          clean(companyCode),

        fyId:
          clean(fyId),

        fyCode:
          clean(fyCode),

        _vfpTable:
          "MDIS_F18",

        _vfpSourceKey:
          `MANUAL_PURCHASE_MDIS_${finalBillNumber}`,
      });

    /**
     * ---------------------------------------------------------
     * DIS ITEMS
     * ---------------------------------------------------------
     *
     * VERY IMPORTANT:
     *
     * CODEP = same as MDIS.CODEP
     * VOUCHER = same as MDIS.VOUCHER
     *
     * This makes:
     *
     * MDIS.CODEP + MDIS.VOUCHER
     *          =
     * DIS.CODEP + DIS.VOUCHER
     */
    const disDocs =
      processedItems.map(
        (item: any, index: number) => ({
          VCN:
            finalBillNumber,

          VOUCHER:
            finalBillNumber,

          CODEP:
            vfpVendorCode,

          DATE:
            vfpDate,

          TYPE:
            "P",

          CODE:
            item.productCode ||
            item.productId ||
            `P${index + 1}`,

          PRODUCT:
            item.productCode ||
            item.productId ||
            "",

          NAME:
            item.productName,

          BATCH:
            item.batchNo,

          QTY:
            num(item.qty),

          FREE:
            num(item.freeQty),

          FREEQTY:
            num(item.freeQty),

          RATE:
            num(item.rate),

          PRATE:
            num(item.rate),

          MRP:
            num(item.mrp),

          EXP:
            item.expDate,

          EXPIRY:
            item.expDate,

          MFD:
            item.mfgDate,

          MFG:
            item.mfgDate,

          HSN:
            item.hsnCode,

          UNIT:
            item.unit,

          DISC1:
            num(item.discountPercent),

          DISC2:
            0,

          CGST:
            num(item.gstPercent) / 2,

          SSTA:
            num(item.gstPercent) / 2,

          SGST:
            num(item.gstPercent) / 2,

          IGST:
            0,

          CGSTAMO:
            num(item.gstAmount) / 2,

          SSTAAMO:
            num(item.gstAmount) / 2,

          SGSTAMO:
            num(item.gstAmount) / 2,

          IGSTAMO:
            0,

          AMMMWOD:
            num(item.taxableAmount),

          AMMMOUNT:
            num(item.total),

          companyId:
            clean(companyId),

          companyCode:
            clean(companyCode),

          fyId:
            clean(fyId),

          fyCode:
            clean(fyCode),

          _vfpTable:
            "DIS_F18",

          _vfpSourceKey:
            `MANUAL_PURCHASE_DIS_${finalBillNumber}_${index}`,
        })
      );

    if (disDocs.length > 0) {
      await SalesDis.insertMany(
        disDocs
      );
    }

    /**
     * ---------------------------------------------------------
     * PENDINGS
     * ---------------------------------------------------------
     */
    await Pendings.create({
      ORD:
        vfpVendorCode,

      CODEP:
        vfpVendorCode,

      PARNAM:
        vendorName,

      NAME:
        vendorName,

      VCN:
        finalBillNumber,

      VOUCHER:
        finalBillNumber,

      DATE:
        vfpDate,

      DDATE:
        vfpDueDate,

      FINAL:
        netAmount,

      AMOUNT:
        netAmount,

      BALANCE:
        balanceAmount,

      ACGROUP:
        "D",

      INVTYPE:
        "I",

      companyId:
        clean(companyId),

      companyCode:
        clean(companyCode),

      fyId:
        clean(fyId),

      fyCode:
        clean(fyCode),

      _vfpTable:
        "PENDINGS_F18",

      _vfpSourceKey:
        `MANUAL_PURCHASE_PENDING_${vfpVendorCode}_${finalBillNumber}`,
    });

    /**
     * ---------------------------------------------------------
     * STOCK
     * ---------------------------------------------------------
     *
     * Purchase = inward stock.
     * Qty + Free Qty is added.
     *
     * Stock service remains separate from Marg display tables.
     */
    try {
      const currentUser: any =
        await getCurrentUser();

      for (
        let i = 0;
        i < processedItems.length;
        i++
      ) {
        const item =
          processedItems[i];

        const productCode =
          clean(
            item.productCode ||
            item.productId
          );

        if (!productCode) {
          continue;
        }

        const inwardQty =
          num(item.qty) +
          num(item.freeQty);

        if (inwardQty <= 0) {
          continue;
        }

        await applyStockMovement({
          companyId:
            clean(companyId),

          companyCode:
            clean(companyCode),

          fyId:
            clean(fyId),

          fyCode:
            clean(fyCode),

          productId:
            clean(item.productId),

          productCode,

          productName:
            clean(item.productName),

          batchNo:
            clean(item.batchNo),

          expiry:
            clean(item.expDate),

          mfgDate:
            clean(item.mfgDate),

          quantity:
            inwardQty,

          type:
            "PURCHASE",

          referenceType:
            "PURCHASE_BILL",

          referenceId:
            String(mdisDoc._id),

          referenceNo:
            finalBillNumber,

          referenceKey:
            `PURCHASE_MDIS:${mdisDoc._id}:${i}`,

          rate:
            num(item.rate),

          mrp:
            num(item.mrp),

          remarks:
            `Purchase Bill ${finalBillNumber}`,

          createdBy:
            String(
              currentUser?._id ||
              ""
            ),
        });
      }
    } catch (stockError) {
      /**
       * Do not rollback Marg documents silently.
       * Log stock failure so it can be investigated.
       */
      console.error(
        "Purchase stock movement error:",
        stockError
      );
    }

    /**
     * ---------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------
     *
     * Return the same bill shape expected by the create page,
     * but source is MDIS + DIS, not PurchaseBill.
     */
    const responseBill =
      await mapMdisToBill(
        mdisDoc.toObject(),
        {
          includeItems: true,
        }
      );

    responseBill.netAmount =
      netAmount;

    responseBill.paidAmount =
      paid;

    responseBill.balanceAmount =
      balanceAmount;

    responseBill.paymentStatus =
      getPaymentStatus(
        netAmount,
        balanceAmount
      );

    return NextResponse.json({
      success: true,

      message:
        "Purchase bill saved successfully in Marg MDIS + DIS + Pendings",

      bill:
        responseBill,

      marg: {
        mdisId:
          String(mdisDoc._id),

        vcn:
          finalBillNumber,

        voucher:
          finalBillNumber,

        codep:
          vfpVendorCode,

        disCount:
          disDocs.length,
      },
    });
  } catch (error: any) {
    console.error(
      "POST Purchase Bill / MDIS-DIS error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Server error while saving Marg purchase bill",
      },
      {
        status: 500,
      }
    );
  }
}
