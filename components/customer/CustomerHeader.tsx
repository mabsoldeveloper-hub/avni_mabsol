"use client";

import { useState } from "react";
import {
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaBuilding,
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaShieldAlt,
  FaIdCard,
} from "react-icons/fa";

interface Props {
  customer: any;
}

export default function CustomerHeader({ customer }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isActive = customer.STATUS === "Y" || customer.STATUS === "Active";

  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(52,56,114,0.12)] p-5 print:bg-white print:backdrop-blur-none print:shadow-none print:border print:border-slate-300">
      {/* Liquid glass Sheen & Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/20 to-transparent print:hidden" />
      <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl print:hidden" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-tr from-blue-400/15 via-sky-400/10 to-transparent blur-2xl print:hidden" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Main Identity Info */}
          <div className="flex items-center gap-4">
            {/* Avatar Pill with Liquid Ring */}
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#343872] via-indigo-700 to-indigo-900 text-white font-bold text-xl shadow-lg ring-4 ring-white/80">
                {getInitials(customer.PARNAM)}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                title={isActive ? "Active Account" : "Inactive Account"}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight truncate">
                  {customer.PARNAM || "Unnamed Customer"}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${isActive
                    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30"
                    : "bg-rose-500/15 text-rose-700 ring-rose-500/30"
                    }`}
                >
                  <FaShieldAlt size={10} />
                  {isActive ? "Active Customer" : "Inactive Customer"}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                {/* <span className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/80">
                  <FaIdCard size={11} className="text-indigo-500" />
                  Code: <strong className="font-semibold text-slate-800">{customer.CODEP || customer.ORDNO || "-"}</strong>
                </span> */}

                {customer.GROUPNAME && (
                  <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/80">
                    <FaBuilding size={11} className="text-slate-400" />
                    {customer.GROUPNAME}
                  </span>
                )}

                {customer.CITY && (
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <FaMapMarkerAlt size={11} className="text-rose-400" />
                    {customer.CITY}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto print:hidden">
            {customer.PHONE1 && (
              <a
                href={`tel:${customer.PHONE1}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-sm"
              >
                <FaPhoneAlt size={11} />
                <span>Call</span>
              </a>
            )}

            {customer.MAILNAM && (
              <a
                href={`mailto:${customer.MAILNAM}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-700 border border-sky-500/30 hover:bg-sky-500 hover:text-white transition-all duration-200 shadow-sm"
              >
                <FaEnvelope size={11} />
                <span>Email</span>
              </a>
            )}
          </div>
        </div>

        {/* Highlight Quick Info Ribbon */}
        <div className="mt-4 pt-3 border-t border-white/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/40 backdrop-blur-md rounded-xl p-2.5 border border-white/50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Contact Person</p>
            <p className="font-bold text-slate-700 truncate mt-0.5">{customer.REF || "-"}</p>
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-xl p-2.5 border border-white/50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mobile Number</p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-bold text-slate-700 truncate">{customer.PHONE1 || "-"}</span>
              {customer.PHONE1 && (
                <button
                  onClick={() => copyToClipboard(customer.PHONE1, "phone")}
                  className="text-slate-400 hover:text-indigo-600 transition"
                  title="Copy Phone"
                >
                  {copiedField === "phone" ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={11} />}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-xl p-2.5 border border-white/50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">GST Number</p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-bold text-indigo-900 truncate">{customer.GSTNO || "-"}</span>
              {customer.GSTNO && (
                <button
                  onClick={() => copyToClipboard(customer.GSTNO, "gst")}
                  className="text-slate-400 hover:text-indigo-600 transition"
                  title="Copy GST"
                >
                  {copiedField === "gst" ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={11} />}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-xl p-2.5 border border-white/50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Drug License</p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-bold text-slate-700 truncate">{customer.DLNO || "-"}</span>
              {customer.DLNO && (
                <button
                  onClick={() => copyToClipboard(customer.DLNO, "dl")}
                  className="text-slate-400 hover:text-indigo-600 transition"
                  title="Copy License"
                >
                  {copiedField === "dl" ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={11} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}