"use client";

import { useState, ReactNode } from "react";
import {
  FaInfoCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaUserTie,
  FaBoxes,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaCheck,
  FaBuilding,
  FaShieldAlt,
} from "react-icons/fa";

interface Props {
  customer: any;
}

const show = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

type Tone = "indigo" | "emerald" | "amber" | "cyan" | "rose" | "purple";

const toneStyles: Record<Tone, { gradient: string; iconBg: string; text: string }> = {
  indigo: { gradient: "from-indigo-600/90 to-blue-600/90", iconBg: "bg-white/20 text-white", text: "text-indigo-600" },
  emerald: { gradient: "from-emerald-600/90 to-teal-600/90", iconBg: "bg-white/20 text-white", text: "text-emerald-600" },
  amber: { gradient: "from-amber-500/90 to-orange-500/90", iconBg: "bg-white/20 text-white", text: "text-amber-600" },
  cyan: { gradient: "from-cyan-600/90 to-sky-600/90", iconBg: "bg-white/20 text-white", text: "text-cyan-600" },
  rose: { gradient: "from-rose-600/90 to-red-600/90", iconBg: "bg-white/20 text-white", text: "text-rose-600" },
  purple: { gradient: "from-purple-600/90 to-indigo-600/90", iconBg: "bg-white/20 text-white", text: "text-purple-600" },
};

function Section({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
}) {
  const styles = toneStyles[tone];
  return (
    <div
      className="
        relative rounded-2xl overflow-hidden mt-4
        bg-white/60 backdrop-blur-xl backdrop-saturate-150
        border border-white/50
        shadow-[0_4px_20px_rgba(52,56,114,0.06)]
        transition-all duration-300 hover:shadow-[0_8px_30px_rgba(52,56,114,0.10)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" />

      {/* header */}
      <div
        className={`relative flex items-center justify-between px-4 py-3 bg-gradient-to-r ${styles.gradient} backdrop-blur-md`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${styles.iconBg}`}>
            {icon}
          </div>
          <h5 className="text-sm font-bold text-white tracking-wide m-0">
            {title}
          </h5>
        </div>
      </div>

      {/* body */}
      <div className="relative p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, copyable = false }: { label: string; value: ReactNode; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "-") return;
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
        {label}
      </p>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <p className="text-xs font-bold text-slate-700 truncate">
          {value}
        </p>
        {copyable && value && value !== "-" && (
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-indigo-600 transition shrink-0"
            title={`Copy ${label}`}
          >
            {copied ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={10} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CustomerOverview({ customer }: Props) {
  const [showRawInspector, setShowRawInspector] = useState(false);

  // Filter keys for raw inspector to show unrecognized dynamic fields
  const standardKeys = new Set([
    "_id", "PARNAM", "CODEP", "REF", "STATUS", "SCODE", "GROUPNAME", "MAINGROUP",
    "PARENTGROUP", "PRICE", "DUEDAYS", "DAYS", "PHONE1", "PHONE2", "MAILNAM",
    "PARADD", "PARADD2", "PARADD3", "AREA", "ROUT", "ROUTE", "CITY", "STATE",
    "COUNTRY", "PINCODE", "PIN", "GSTNO", "DLNO", "DLNO2", "FSSAINO", "PANNO",
    "TINNO", "STAXNO", "CSTNO", "DSM", "SALESMAN", "ASM", "RSM", "GCODE",
    "COMPANY", "BALANCE", "CREDIT", "DEBIT", "OPNING", "OPENING", "CLBAL",
    "DISCOUNT", "FINAL", "ORDNO", "__v"
  ]);

  const rawEntries = Object.entries(customer || {}).filter(
    ([key, value]) => !standardKeys.has(key) && value !== null && value !== undefined && value !== ""
  );

  return (
    <>
      {/* ==================== 1. BASIC & ACCOUNT GROUP INFO ==================== */}
      <Section title="Basic & Account Group Info" tone="indigo" icon={<FaInfoCircle size={14} />}>
        <Field label="Party Name" value={show(customer.PARNAM)} />
        {/* <Field label="Party Code" value={show(customer.CODEP || customer.ORDNO)} copyable />
        <Field label="Group Name" value={show(customer.GROUPNAME)} />
        <Field label="Group Code" value={show(customer.SCODE || customer.GROUPCODE)} />
        <Field label="Main Group" value={show(customer.MAINGROUP)} />
        <Field label="Parent Group" value={show(customer.PARENTGROUP)} />
        <Field label="Order Number" value={show(customer.ORDNO)} /> */}
        <Field
          label="Applicable Rate / Price List"
          value={
            customer.PRICE ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {String(customer.PRICE).trim().toUpperCase() === "RATEA"
                  ? "Rate A"
                  : String(customer.PRICE).trim().toUpperCase() === "RATEB"
                    ? "Rate B"
                    : String(customer.PRICE).trim().toUpperCase() === "RATEC"
                      ? "Rate C"
                      : String(customer.PRICE).trim().toUpperCase() === "RATED"
                        ? "Rate D"
                        : String(customer.PRICE).trim().toUpperCase() === "RATEE"
                          ? "Rate E"
                          : String(customer.PRICE).trim().toUpperCase() === "RATEF"
                            ? "Rate F (Sale Rate)"
                            : String(customer.PRICE).trim().toUpperCase() === "RATEG"
                              ? "Rate G"
                              : String(customer.PRICE)}
              </span>
            ) : (
              "-"
            )
          }
        />
        <Field label="Credit Days" value={customer.DUEDAYS || customer.DAYS ? `${customer.DUEDAYS || customer.DAYS} Days` : "-"} />
        <Field
          label="Account Status"
          value={
            customer.STATUS === "Y" || customer.STATUS === "Active" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                <FaShieldAlt size={9} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30">
                <FaShieldAlt size={9} /> Inactive
              </span>
            )
          }
        />
      </Section>

      {/* ==================== 2. CONTACT INFORMATION ==================== */}
      <Section title="Contact Details" tone="emerald" icon={<FaPhoneAlt size={13} />}>
        <Field label="Contact Person" value={show(customer.REF)} />
        <Field label="Primary Mobile" value={show(customer.PHONE1)} copyable />
        <Field label="Secondary Mobile" value={show(customer.PHONE2)} copyable />
        <Field label="Email Address" value={show(customer.MAILNAM)} copyable />
      </Section>

      {/* ==================== 3. ADDRESS & LOCATION ==================== */}
      <Section title="Address & Delivery Route" tone="cyan" icon={<FaMapMarkerAlt size={14} />}>
        <div className="col-span-2">
          <Field label="Street Address" value={show(customer.PARADD || customer.ADDRESS)} />
        </div>
        {customer.PARADD2 && <Field label="Address Line 2" value={show(customer.PARADD2)} />}
        {customer.PARADD3 && <Field label="Address Line 3" value={show(customer.PARADD3)} />}
        <Field label="City / Town" value={show(customer.CITY)} />
        <Field label="State" value={show(customer.STATE)} />
        <Field label="Country" value={show(customer.COUNTRY || "India")} />
        <Field label="Pincode" value={show(customer.PINCODE || customer.PIN)} />
        <Field label="Locality / Area" value={show(customer.AREA)} />
        <Field label="Delivery Route" value={show(customer.ROUT || customer.ROUTE)} />
      </Section>

      {/* ==================== 4. TAXATION & LICENSES ==================== */}
      <Section title="Taxation & Regulatory Licenses" tone="amber" icon={<FaFileInvoiceDollar size={14} />}>
        <Field label="GSTIN / GST Number" value={show(customer.GSTNO)} copyable />
        <Field label="Drug License 1" value={show(customer.DLNO)} copyable />
        <Field label="Drug License 2" value={show(customer.DLNO2)} copyable />
        <Field label="FSSAI License" value={show(customer.FSSAINO)} copyable />
        <Field label="PAN Number" value={show(customer.PANNO)} copyable />
        <Field label="TIN Number" value={show(customer.TINNO)} />
        <Field label="Sales Tax No" value={show(customer.STAXNO)} />
        <Field label="CST Number" value={show(customer.CSTNO)} />
      </Section>

      {/* ==================== 5. SALES & TERRITORY HIERARCHY ==================== */}
      <Section title="Sales Representatives & Territory" tone="purple" icon={<FaUserTie size={14} />}>
        <Field label="Salesman / DSM" value={show(customer.DSM || customer.SALESMAN)} />
        <Field label="Area Sales Manager (ASM)" value={show(customer.ASM)} />
        <Field label="Regional Sales Manager (RSM)" value={show(customer.RSM)} />
        <Field label="Company / Division" value={show(customer.COMPANY)} />
        {/* <Field label="Territory Code" value={show(customer.GCODE)} /> */}
      </Section>

      {/* ==================== 6. RAW / ADDITIONAL DATA INSPECTOR ==================== */}
      {/* <div className="mt-4 mb-6">
        <button
          onClick={() => setShowRawInspector(!showRawInspector)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_4px_20px_rgba(52,56,114,0.06)] hover:bg-white/80 transition-all text-xs font-bold text-slate-700 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FaBoxes className="text-indigo-600" size={14} />
            <span>View All Document Attributes ({Object.keys(customer || {}).length} Total Fields)</span>
          </div>
          {showRawInspector ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>

        {showRawInspector && (
          <div className="mt-2 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-2xl text-slate-100 border border-slate-700 shadow-2xl animate-in fade-in duration-200">
            <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-2">
              Full MongoDB Document Keys & Values
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
              {Object.entries(customer || {}).map(([key, val]) => (
                <div key={key} className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 overflow-hidden">
                  <span className="text-indigo-400 font-semibold">{key}: </span>
                  <span className="text-slate-200 break-all">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div> */}
    </>
  );
}