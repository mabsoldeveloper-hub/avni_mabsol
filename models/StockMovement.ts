import mongoose, { Schema } from "mongoose";

const StockMovementSchema = new Schema(
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

    type: {
      type: String,
      required: true,
      enum: [
        "OPENING",
        "STOCK_IN",
        "STOCK_OUT",
        "PURCHASE",
        "PURCHASE_RETURN",
        "SALE",
        "SALE_RETURN",
        "DAMAGE",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
      ],
      index: true,
    },

    // Signed quantity: + = stock in, - = stock out.
    quantity: { type: Number, required: true },

    referenceType: { type: String, default: "" },
    referenceId: { type: String, default: "" },
    referenceNo: { type: String, default: "", index: true },
    referenceKey: { type: String, required: true, unique: true, index: true },

    rate: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    remarks: { type: String, default: "" },

    createdBy: { type: String, default: "" },
  },
  {
    collection: "stock_movements",
    timestamps: true,
  }
);

export default mongoose.models.StockMovement ||
  mongoose.model("StockMovement", StockMovementSchema);
