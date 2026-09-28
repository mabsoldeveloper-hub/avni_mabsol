"use client";

import React from "react";
import { FaBoxes, FaStethoscope, FaFlask, FaReceipt, FaUserPlus, FaTimes, FaPlusCircle } from "react-icons/fa";
import { FormFieldConfig, IFormCondition } from "./FormBuilder";

interface PharmaTemplatePreset {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: any;
  fields: FormFieldConfig[];
  conditions?: IFormCondition[];
}

export const PHARMA_PRESETS: PharmaTemplatePreset[] = [
  {
    id: "mr-dcr-reporting",
    title: "MR Daily Call Report (DCR) & Sampling Form",
    category: "Field Work",
    description: "Daily MR reporting form to capture station visited, doctor call counts, POB amount, sample line items, GPS stamp & doctor signature.",
    icon: FaStethoscope,
    fields: [
      {
        id: "f_dcr_1",
        key: "dcr_date",
        label: "DCR Date",
        type: "date",
        required: true,
        order: 0,
        section: "Visit & Work Details",
      },
      {
        id: "f_dcr_2",
        key: "work_type",
        label: "Work Type",
        type: "select",
        required: true,
        options: ["Field Work", "Joint Work", "Office Work", "Leave", "Meeting"],
        order: 1,
        section: "Visit & Work Details",
      },
      {
        id: "f_dcr_3",
        key: "area_visited",
        label: "Area / Station Visited",
        type: "text",
        required: true,
        placeholder: "e.g. Civil Lines, Central Market",
        order: 2,
        section: "Visit & Work Details",
      },
      {
        id: "f_dcr_4",
        key: "gps_location",
        label: "MR Field GPS Stamp",
        type: "gps",
        required: true,
        order: 3,
        section: "Visit & Work Details",
      },
      {
        id: "f_dcr_5",
        key: "doctor_calls_count",
        label: "Total Doctor Calls Made",
        type: "number",
        required: true,
        placeholder: "e.g. 12",
        order: 4,
        section: "Call Metrics",
      },
      {
        id: "f_dcr_6",
        key: "chemist_calls_count",
        label: "Total Chemist Calls Made",
        type: "number",
        required: false,
        placeholder: "e.g. 5",
        order: 5,
        section: "Call Metrics",
      },
      {
        id: "f_dcr_7",
        key: "pob_amount",
        label: "Total POB Amount (₹)",
        type: "number",
        required: false,
        placeholder: "e.g. 25000",
        order: 6,
        section: "Call Metrics",
      },
      {
        id: "f_dcr_8",
        key: "samples_table",
        label: "Sample Line Items & Free Goods Distributed",
        type: "repeaterTable",
        required: false,
        order: 7,
        section: "Sampling & Line Items",
      },
      {
        id: "f_dcr_9",
        key: "doctor_signature",
        label: "Doctor / Key Contact Signature",
        type: "signature",
        required: false,
        order: 8,
        section: "Verification & Signoff",
      },
    ],
  },
  {
    id: "doctor-feedback-survey",
    title: "Doctor Feedback & Brand Preference Survey",
    category: "Feedback",
    description: "Collect doctor specialty, brand prescription potential, product feedback rating, and sample requests.",
    icon: FaFlask,
    fields: [
      {
        id: "f_df_1",
        key: "doctor_name",
        label: "Doctor Name",
        type: "text",
        required: true,
        placeholder: "Dr. A. K. Sharma",
        order: 0,
        section: "Doctor Details",
      },
      {
        id: "f_df_2",
        key: "specialty",
        label: "Specialty",
        type: "select",
        required: true,
        options: ["General Physician", "Pediatrician", "Cardiologist", "Gynecologist", "Orthopedic", "Dermatologist"],
        order: 1,
        section: "Doctor Details",
      },
      {
        id: "f_df_3",
        key: "rx_potential",
        label: "Monthly Rx Potential",
        type: "select",
        required: true,
        options: ["High (>100 Rx/mo)", "Medium (30-100 Rx/mo)", "Low (<30 Rx/mo)"],
        order: 2,
        section: "Brand Potential",
      },
      {
        id: "f_df_4",
        key: "product_rating",
        label: "Efficacy & Packaging Rating",
        type: "rating",
        required: true,
        order: 3,
        section: "Feedback & Rating",
      },
      {
        id: "f_df_5",
        key: "feedback_notes",
        label: "Detailed Doctor Feedback",
        type: "textarea",
        required: false,
        placeholder: "Write doctor's remarks...",
        order: 4,
        section: "Feedback & Rating",
      },
      {
        id: "f_df_6",
        key: "dr_signature",
        label: "Doctor E-Signature",
        type: "signature",
        required: true,
        order: 5,
        section: "Verification",
      },
    ],
  },
  {
    id: "chemist-pob-booking",
    title: "Chemist POB Order Booking Form",
    category: "Sales",
    description: "Capture chemist purchase order booking with product quantity, discount rates, payment mode and bill photo upload.",
    icon: FaBoxes,
    fields: [
      {
        id: "f_cp_1",
        key: "chemist_name",
        label: "Chemist Shop Name",
        type: "text",
        required: true,
        placeholder: "e.g. Standard Medical Store",
        order: 0,
        section: "Party Info",
      },
      {
        id: "f_cp_2",
        key: "chemist_code",
        label: "Chemist Party Code",
        type: "text",
        required: false,
        placeholder: "e.g. CHEM-0012",
        order: 1,
        section: "Party Info",
      },
      {
        id: "f_cp_3",
        key: "order_items",
        label: "Order Line Items (Product & Qty)",
        type: "repeaterTable",
        required: true,
        order: 2,
        section: "Order Details",
      },
      {
        id: "f_cp_4",
        key: "payment_mode",
        label: "Payment Mode",
        type: "select",
        required: true,
        options: ["Credit", "Cash on Delivery", "PDC Cheque", "UPI Advance"],
        order: 3,
        section: "Payment Terms",
      },
      {
        id: "f_cp_5",
        key: "po_photo",
        label: "Upload Order Slip / Bill Photo",
        type: "fileUpload",
        required: false,
        order: 4,
        section: "Attachments",
      },
    ],
  },
  {
    id: "mr-expense-claim",
    title: "MR Expense Claim & Travel Bill Form",
    category: "Accounts",
    description: "Submit TA/DA claims, station travel type (HQ/EX/OS), hotel bills, fare receipts and manager approval request.",
    icon: FaReceipt,
    fields: [
      {
        id: "f_ex_1",
        key: "claim_date",
        label: "Expense Claim Date",
        type: "date",
        required: true,
        order: 0,
        section: "Claim Summary",
      },
      {
        id: "f_ex_2",
        key: "travel_type",
        label: "Travel Station Category",
        type: "select",
        required: true,
        options: ["HQ (Headquarters)", "EX (Ex-Station)", "OS (Outstation)"],
        order: 1,
        section: "Claim Summary",
      },
      {
        id: "f_ex_3",
        key: "fare_amount",
        label: "Travel Fare Amount (₹)",
        type: "number",
        required: true,
        placeholder: "e.g. 450",
        order: 2,
        section: "Amounts",
      },
      {
        id: "f_ex_4",
        key: "da_amount",
        label: "Daily Allowance (DA) (₹)",
        type: "number",
        required: true,
        placeholder: "e.g. 350",
        order: 3,
        section: "Amounts",
      },
      {
        id: "f_ex_5",
        key: "receipt_upload",
        label: "Upload Travel Ticket / Hotel Bill",
        type: "fileUpload",
        required: true,
        order: 4,
        section: "Proof Attachments",
      },
    ],
  },
  {
    id: "new-chemist-onboarding",
    title: "New Chemist / Stockist Registration Request",
    category: "Customers",
    description: "Onboard new chemist or stockist with DL copy upload, GSTIN, location GPS stamp and credit limit application.",
    icon: FaUserPlus,
    fields: [
      {
        id: "f_nc_1",
        key: "firm_name",
        label: "Firm / Shop Name",
        type: "text",
        required: true,
        placeholder: "e.g. Apex Pharma Agencies",
        order: 0,
        section: "Business Information",
      },
      {
        id: "f_nc_2",
        key: "proprietor_name",
        label: "Proprietor / Owner Name",
        type: "text",
        required: true,
        order: 1,
        section: "Business Information",
      },
      {
        id: "f_nc_3",
        key: "gstin_no",
        label: "GSTIN Number",
        type: "text",
        required: false,
        placeholder: "07AAAAA0000A1Z5",
        order: 2,
        section: "Tax & Licenses",
      },
      {
        id: "f_nc_4",
        key: "dl_no",
        label: "Drug License (DL) Number",
        type: "text",
        required: true,
        order: 3,
        section: "Tax & Licenses",
      },
      {
        id: "f_nc_5",
        key: "dl_photo",
        label: "Upload Drug License Copy Photo",
        type: "fileUpload",
        required: true,
        order: 4,
        section: "Tax & Licenses",
      },
      {
        id: "f_nc_6",
        key: "shop_gps",
        label: "Shop Location GPS Stamp",
        type: "gps",
        required: true,
        order: 5,
        section: "Location & Verification",
      },
    ],
  },
];

interface PharmaTemplatesModalProps {
  onSelect: (preset: PharmaTemplatePreset) => void;
  onClose: () => void;
}

export default function PharmaTemplatesModal({
  onSelect,
  onClose,
}: PharmaTemplatesModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-3xl w-full rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
              <FaPlusCircle className="text-indigo-600 dark:text-indigo-400" />
              1-Click Ready MabsolCrm Templates Library
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a pre-built enterprise template to instantly load structure, fields, and workflow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            <FaTimes />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 grow py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PHARMA_PRESETS.map((preset) => {
              const IconComp = preset.icon;
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelect(preset)}
                  className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {preset.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {preset.fields.length} Fields
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                      <IconComp className="text-indigo-500 shrink-0" />
                      {preset.title}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs">
                    Use This Template
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
