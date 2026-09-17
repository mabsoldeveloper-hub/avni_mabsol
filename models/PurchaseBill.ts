import mongoose, { Schema } from "mongoose";

const PurchaseBillItemSchema = new Schema({
  productId: { type: String },
  productCode: { type: String },
  productName: { type: String, required: true },
  companyName: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  batchNo: { type: String, default: "BATCH-01" },
  expDate: { type: String, default: "" }, // MM/YY or YYYY-MM
  mfgDate: { type: String, default: "" },
  mrp: { type: Number, default: 0 },
  qty: { type: Number, required: true, default: 1 },
  freeQty: { type: Number, default: 0 },
  unit: { type: String, default: "Box" },
  rate: { type: Number, required: true, default: 0 },
  discountPercent: { type: Number, default: 0 },
  schemeDiscountPercent: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 12 },
  taxableAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  location: { type: String, default: "" },
  itemRemark: { type: String, default: "" },
});

const PurchaseBillSchema = new Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    supplierInvoiceNo: { type: String, default: "" },
    poId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    poNumber: { type: String, default: "" },
    companyId: { type: String },
    companyCode: { type: String, default: "" },
    fyId: { type: String },
    fyCode: { type: String, default: "" },
    billDate: { type: String, required: true }, // YYYY-MM-DD
    dueDate: { type: String, default: "" },
    vendorId: { type: String },
    vendorCode: { type: String, default: "" },
    vendorName: { type: String, required: true },
    vendorGst: { type: String, default: "" },
    vendorPhone: { type: String, default: "" },
    vendorAddress: { type: String, default: "" },
    items: [PurchaseBillItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["Pending", "Partial", "Paid"], default: "Pending" },
    remarks: { type: String, default: "" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === "development" && mongoose.models && mongoose.models.PurchaseBill) {
  delete (mongoose.models as any).PurchaseBill;
}

export default mongoose.models.PurchaseBill || mongoose.model("PurchaseBill", PurchaseBillSchema);
