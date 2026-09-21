import mongoose, { Schema } from "mongoose";

const StockBalanceSchema = new Schema(
  {
    companyId: { type: String, required: true, index: true },
    companyCode: { type: String, default: "", index: true },
    fyId: { type: String, required: true, index: true },
    fyCode: { type: String, default: "", index: true },

    productId: { type: String, default: "", index: true },
    productCode: { type: String, required: true, index: true },
    productName: { type: String, default: "" },
    batchNo: { type: String, default: "", index: true },
    expiry: { type: String, default: "" },
    mfgDate: { type: String, default: "" },
    mrp: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },

    openingQty: { type: Number, default: 0 },
    currentQty: { type: Number, default: 0 },
    lastMovementAt: { type: Date, default: null },
  },
  {
    collection: "stock_balances",
    timestamps: true,
  }
);


StockBalanceSchema.index(
  { companyId: 1, fyId: 1, productCode: 1, batchNo: 1 },
  { unique: true }
);

export default mongoose.models.StockBalance ||
  mongoose.model("StockBalance", StockBalanceSchema);
