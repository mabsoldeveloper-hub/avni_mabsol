import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItemStockAudit {
  itemCode: string;
  itemName: string;
  batchNo?: string;
  quantityOrdered: number;
  unit?: string;
  stockBefore: number;
  stockAfter: number; // Stock left after this purchase
}

export interface IOrderTrackingMilestone {
  stage: "Ordered" | "Confirmed" | "Packed" | "Dispatched" | "Out for Delivery" | "Delivered" | "Cancelled" | "Returned";
  timestamp: Date;
  updatedBy?: string;
  notes?: string;
  location?: string;
}

export interface IOrderTracking extends Document {
  tenantId: string;
  companyId?: string;
  orderId: string; // Internal Order Id or Voucher Number
  orderNumber: string;
  orderDate: Date;
  
  // Buyer Details
  customerCode?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  areaName?: string;
  deliveryAddress?: string;

  // Assigned MR / Salesperson
  salespersonId?: string;
  salespersonName?: string;
  salespersonPhone?: string;

  // Order Financials
  totalAmount: number;
  itemCount: number;

  // Real-Time Stock Balance & Audit
  items: IOrderItemStockAudit[];

  // Current Tracking Status
  currentStatus: "Ordered" | "Confirmed" | "Packed" | "Dispatched" | "Out for Delivery" | "Delivered" | "Cancelled" | "Returned";
  
  // Shipping & Dispatch Info
  courierPartner?: string;
  trackingNumber?: string; // AWB Number / LR Number
  trackingUrl?: string;
  estimatedDeliveryDate?: Date;
  dispatchedDate?: Date;
  deliveredDate?: Date;
  dispatchNotes?: string;

  // History Progression
  milestones: IOrderTrackingMilestone[];

  // Notification Dispatch Logs
  notificationsSent: {
    dispatchedWhatsappSent?: boolean;
    dispatchedEmailSent?: boolean;
    dispatchedSmsSent?: boolean;
    deliveredWhatsappSent?: boolean;
    deliveredEmailSent?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemStockAuditSchema = new Schema<IOrderItemStockAudit>(
  {
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    batchNo: { type: String, default: "" },
    quantityOrdered: { type: Number, required: true, default: 1 },
    unit: { type: String, default: "PCS" },
    stockBefore: { type: Number, default: 0 },
    stockAfter: { type: Number, default: 0 },
  },
  { _id: false }
);

const OrderTrackingMilestoneSchema = new Schema<IOrderTrackingMilestone>(
  {
    stage: {
      type: String,
      enum: ["Ordered", "Confirmed", "Packed", "Dispatched", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: String, default: "System" },
    notes: { type: String, default: "" },
    location: { type: String, default: "" },
  },
  { _id: false }
);

const OrderTrackingSchema = new Schema<IOrderTracking>(
  {
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: String, default: "" },
    orderId: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    orderDate: { type: Date, default: Date.now },

    customerCode: { type: String, default: "" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    areaName: { type: String, default: "" },
    deliveryAddress: { type: String, default: "" },

    salespersonId: { type: String, default: "" },
    salespersonName: { type: String, default: "" },
    salespersonPhone: { type: String, default: "" },

    totalAmount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },

    items: [OrderItemStockAuditSchema],

    currentStatus: {
      type: String,
      enum: ["Ordered", "Confirmed", "Packed", "Dispatched", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
      default: "Ordered",
      index: true,
    },

    courierPartner: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    trackingUrl: { type: String, default: "" },
    estimatedDeliveryDate: { type: Date },
    dispatchedDate: { type: Date },
    deliveredDate: { type: Date },
    dispatchNotes: { type: String, default: "" },

    milestones: [OrderTrackingMilestoneSchema],

    notificationsSent: {
      dispatchedWhatsappSent: { type: Boolean, default: false },
      dispatchedEmailSent: { type: Boolean, default: false },
      dispatchedSmsSent: { type: Boolean, default: false },
      deliveredWhatsappSent: { type: Boolean, default: false },
      deliveredEmailSent: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.OrderTracking ||
  mongoose.model<IOrderTracking>("OrderTracking", OrderTrackingSchema);
