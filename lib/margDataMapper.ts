import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export interface DataMapperResult {
  customersMapped: number;
  productsMapped: number;
  pendingsMapped: number;
  invoicesMapped: number;
  errors: string[];
}

/**
 * MARG ERP Data Mapper
 * Transforms raw MARG DBF collections (e.g. vfp_new_folder_order, vfp_new_folder_pro, vfp_new_folder_pend)
 * into structured CRM Collections used by MabsolCrm.
 */
export async function runMargDataMapper(email?: string): Promise<DataMapperResult> {
  await dbConnect();
  const db = mongoose.connection.db;

  const result: DataMapperResult = {
    customersMapped: 0,
    productsMapped: 0,
    pendingsMapped: 0,
    invoicesMapped: 0,
    errors: [],
  };

  if (!db) {
    result.errors.push("Database connection not available");
    return result;
  }

  try {
    // 1. Map Raw Customer / Ledger DBF -> `orders` (Customer Master collection in CRM)
    const rawCustomerCollections = ["vfp_new_folder_order", "vfp_new_folder_ledger", "vfp_new_folder_party"];
    for (const colName of rawCustomerCollections) {
      const exists = await db.listCollections({ name: colName }).hasNext();
      if (!exists) continue;

      const rawCol = db.collection(colName);
      const targetCol = db.collection("orders"); // Customer master collection in CRM

      const rawDocs = await rawCol.find({}).limit(5000).toArray();
      const bulkOps: any[] = [];

      for (const doc of rawDocs) {
        const ordNo = String(doc.ORDNO || doc.CODE || doc.CODEP || doc._vfpSourceKey || "").trim();
        const name = String(doc.PARNAM || doc.NAME || doc.PARTY || doc.FULLNAME || "").trim();
        if (!ordNo && !name) continue;

        const customerDoc = {
          ORDNO: ordNo || `CUST_${Date.now()}`,
          PARNAM: name || "Unknown Customer",
          MAILNAM: String(doc.MAILNAM || doc.EMAIL || "").trim(),
          CITY: String(doc.CITY || doc.TOWN || "").trim(),
          AREA: String(doc.AREA || "").trim(),
          ROUT: String(doc.ROUT || doc.ROUTE || "").trim(),
          DSM: String(doc.DSM || doc.SALESMAN || "").trim(),
          ASM: String(doc.ASM || "").trim(),
          RSM: String(doc.RSM || "").trim(),
          STATUS: String(doc.STATUS || "Active").trim(),
          PHONE1: String(doc.PHONE1 || doc.MOBILE || doc.TELEPHONE || "").trim(),
          PHONE2: String(doc.PHONE2 || "").trim(),
          GSTNO: String(doc.GSTNO || doc.GSTIN || "").trim(),
          DLNO: String(doc.DLNO || doc.DRUGLIC || "").trim(),
          CODEP: String(doc.CODEP || ordNo).trim(),
          SCODE: String(doc.SCODE || "").trim(),
          _vfpSyncedAt: new Date(),
        };

        bulkOps.push({
          updateOne: {
            filter: { ORDNO: customerDoc.ORDNO },
            update: { $set: customerDoc },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        const res = await targetCol.bulkWrite(bulkOps, { ordered: false });
        result.customersMapped += res.upsertedCount + res.modifiedCount;
      }
    }

    // 2. Map Raw Product DBF -> `products` (Product collection in CRM)
    const rawProductCollections = ["vfp_new_folder_pro", "vfp_new_folder_item", "vfp_new_folder_product"];
    for (const colName of rawProductCollections) {
      const exists = await db.listCollections({ name: colName }).hasNext();
      if (!exists) continue;

      const rawCol = db.collection(colName);
      const targetCol = db.collection("products");

      const rawDocs = await rawCol.find({}).limit(5000).toArray();
      const bulkOps: any[] = [];

      for (const doc of rawDocs) {
        const itemCode = String(doc.PCODE || doc.ITEMCODE || doc.CODE || doc._vfpSourceKey || "").trim();
        const itemName = String(doc.PNAME || doc.ITEMNAME || doc.NAME || "").trim();
        if (!itemCode && !itemName) continue;

        const productDoc = {
          PCODE: itemCode || `PROD_${Date.now()}`,
          PNAME: itemName || "Unnamed Product",
          PACK: String(doc.PACK || doc.PACKING || "").trim(),
          COMPANY: String(doc.COMPANY || doc.MFG || "").trim(),
          CATEGORY: String(doc.CATEGORY || doc.CATG || "").trim(),
          DIVISION: String(doc.DIVISION || doc.DIV || "").trim(),
          MRP: Number(doc.MRP || doc.RRP || 0),
          RATE: Number(doc.RATE || doc.SELLINGRATE || 0),
          PURRATE: Number(doc.PURRATE || doc.COST || 0),
          STOCK: Number(doc.STOCK || doc.QTY || 0),
          MINQTY: Number(doc.MINQTY || doc.REORDERLEVEL || 5),
          GST: Number(doc.GST || doc.TAX || 0),
          HSN: String(doc.HSN || doc.HSNCODE || "").trim(),
          STATUS: String(doc.STATUS || "Active").trim(),
          _vfpSyncedAt: new Date(),
        };

        bulkOps.push({
          updateOne: {
            filter: { PCODE: productDoc.PCODE },
            update: { $set: productDoc },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        const res = await targetCol.bulkWrite(bulkOps, { ordered: false });
        result.productsMapped += res.upsertedCount + res.modifiedCount;
      }
    }

    // 3. Map Raw Pending Dues -> `pends` (Outstanding Vouchers collection in CRM)
    const rawPendCollections = ["vfp_new_folder_pend", "vfp_new_folder_pending", "vfp_new_folder_outstanding"];
    for (const colName of rawPendCollections) {
      const exists = await db.listCollections({ name: colName }).hasNext();
      if (!exists) continue;

      const rawCol = db.collection(colName);
      const targetCol = db.collection("pends");

      const rawDocs = await rawCol.find({}).limit(5000).toArray();
      const bulkOps: any[] = [];

      for (const doc of rawDocs) {
        const ord = String(doc.ORD || doc.ORDNO || doc.CODEP || "").trim();
        const voucher = Number(doc.VOUCHER || doc.BILLNO || doc.VCN || 0);
        if (!ord && !voucher) continue;

        const pendDoc = {
          ORD: ord,
          VOUCHER: voucher,
          SVOUCHER: Number(doc.SVOUCHER || voucher),
          ADJVOUCHER: Number(doc.ADJVOUCHER || 0),
          VCN: String(doc.VCN || "").trim(),
          TYPE: String(doc.TYPE || "SALE").trim(),
          MR: String(doc.MR || doc.SALESMAN || "").trim(),
          AREA: String(doc.AREA || "").trim(),
          ROUT: String(doc.ROUT || "").trim(),
          DSM: String(doc.DSM || "").trim(),
          ASM: String(doc.ASM || "").trim(),
          RSM: String(doc.RSM || "").trim(),
          DDATE: doc.DDATE ? new Date(doc.DDATE) : new Date(),
          DUEDAYS: Number(doc.DUEDAYS || doc.DAYS || 0),
          FINAL: Number(doc.FINAL || doc.AMOUNT || doc.BALANCE || 0),
          ADVANCE: Number(doc.ADVANCE || 0),
          REMARK: String(doc.REMARK || "").trim(),
          _vfpSyncedAt: new Date(),
        };

        bulkOps.push({
          updateOne: {
            filter: { ORD: pendDoc.ORD, VOUCHER: pendDoc.VOUCHER },
            update: { $set: pendDoc },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        const res = await targetCol.bulkWrite(bulkOps, { ordered: false });
        result.pendingsMapped += res.upsertedCount + res.modifiedCount;
      }
    }

  } catch (err: any) {
    result.errors.push(`Transformation error: ${err.message}`);
  }

  return result;
}
