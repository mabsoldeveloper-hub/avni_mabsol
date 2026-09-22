"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaSlidersH,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHashtag,
  FaReceipt,
  FaFileInvoiceDollar,
  FaArrowLeft,
  FaRegEye,
} from "react-icons/fa";

interface VoucherSeriesItem {
  _id: string;
  seriesName: string;
  voucherType: "SALES" | "PROFORMA" | "PURCHASE" | "PURCHASE_ORDER" | "RETURN" | "RECEIPT" | "DEBIT_NOTE" | "PURCHASE_RETURN" | "PAYMENT";
  prefix: string;
  suffix: string;
  nextNumber: number;
  padding: number;
  isDefault: boolean;
  status: "Active" | "Inactive";
  previewVcn?: string;
}

export default function VoucherSeriesMasterPage() {
  const [seriesList, setSeriesList] = useState<VoucherSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [seriesName, setSeriesName] = useState("");
  const [voucherType, setVoucherType] = useState<"SALES" | "PROFORMA" | "PURCHASE" | "PURCHASE_ORDER" | "RETURN" | "RECEIPT" | "DEBIT_NOTE" | "PURCHASE_RETURN" | "PAYMENT">("SALES");
  const [prefix, setPrefix] = useState("INV-");
  const [suffix, setSuffix] = useState("");
  const [nextNumber, setNextNumber] = useState<number | "">(1001);
  const [padding, setPadding] = useState<number | "">(5);
  const [isDefault, setIsDefault] = useState(true);
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const loadSeries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);

      const res = await fetch(`/api/master/voucher-series?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSeriesList(json.data);
      } else {
        setSeriesList([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load voucher series list");
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const handleVoucherTypeChange = (type: "SALES" | "PROFORMA" | "PURCHASE" | "PURCHASE_ORDER" | "RETURN" | "RECEIPT" | "DEBIT_NOTE" | "PURCHASE_RETURN" | "PAYMENT") => {
    setVoucherType(type);
    if (!editingId) {
      if (type === "SALES") {
        setSeriesName("Standard Sales Series");
        setPrefix("INV-");
      } else if (type === "PROFORMA") {
        setSeriesName("Proforma Kaccha Series");
        setPrefix("PRF-");
      } else if (type === "PURCHASE") {
        setSeriesName("Purchase Invoice Series");
        setPrefix("PUR-");
      } else if (type === "PURCHASE_ORDER") {
        setSeriesName("Purchase Order Series");
        setPrefix("PO-");
      } else if (type === "RETURN") {
        setSeriesName("Sales Return Series");
        setPrefix("RET-");
      } else if (type === "DEBIT_NOTE") {
        setSeriesName("Debit Note Series");
        setPrefix("DN-");
      } else if (type === "PURCHASE_RETURN") {
        setSeriesName("Purchase Return Series");
        setPrefix("PR-");
      } else if (type === "RECEIPT") {
        setSeriesName("Receipt Entry Series");
        setPrefix("RCT-");
      } else if (type === "PAYMENT") {
        setSeriesName("Supplier Payment Series");
        setPrefix("PMT-");
      }
    }
  };

  const handleEdit = (item: VoucherSeriesItem) => {
    setEditingId(item._id);
    setSeriesName(item.seriesName);
    setVoucherType(item.voucherType);
    setPrefix(item.prefix);
    setSuffix(item.suffix);
    setNextNumber(item.nextNumber);
    setPadding(item.padding);
    setIsDefault(item.isDefault);
    setStatus(item.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    setEditingId(null);
    setSeriesName("");
    setVoucherType("SALES");
    setPrefix("INV-");
    setSuffix("");
    setNextNumber(1001);
    setPadding(5);
    setIsDefault(true);
    setStatus("Active");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesName.trim()) {
      setErrorMsg("Series Name is required");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");

      const payload = {
        seriesName: seriesName.trim(),
        voucherType,
        prefix: prefix.trim(),
        suffix: suffix.trim(),
        nextNumber: Number(nextNumber || 1),
        padding: Number(padding || 5),
        isDefault,
        status,
        companyId: selectedCompany?._id || "",
        companyCode: selectedCompany?.companyCode || "",
        fyId: selectedFY?._id || "",
        fyCode: selectedFY?.fyCode || "",
      };

      const url = editingId ? `/api/master/voucher-series/${editingId}` : "/api/master/voucher-series";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save Voucher Series");
      }

      setSuccessMsg(editingId ? "Voucher Series updated successfully!" : "New Voucher Series created successfully!");
      handleResetForm();
      loadSeries();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong saving the series.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Voucher Series?")) return;
    try {
      const res = await fetch(`/api/master/voucher-series/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Voucher Series deleted successfully");
        loadSeries();
      } else {
        setErrorMsg(json.message || "Failed to delete Voucher Series");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete");
    }
  };

  // Preview next number string
  const previewVcn = `${prefix}${String(nextNumber || 1).padStart(Number(padding || 5), "0")}${suffix}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master"
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/70 backdrop-blur-md border border-white/70 shadow-sm text-slate-600 hover:text-slate-900 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FaSlidersH className="text-indigo-600" /> Bill & Voucher Series Master
            </h2>
            <p className="text-xs text-slate-500">
              Customize invoice numbering, prefixes, padding, and series rules for Sales & Proforma bills
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {selectedCompany && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-xs">
              Company: {selectedCompany.companyName} ({selectedCompany.companyCode})
            </span>
          )}
          {selectedFY && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
              FY: {selectedFY.fyCode || selectedFY.fyName}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-xs">
            {seriesList.length} Series Configured
          </span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-emerald-600" size={15} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-950">
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-600" size={15} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-700 hover:text-rose-950">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create/Edit Form */}
        <div className="lg:col-span-1 space-y-4">
          <form
            onSubmit={handleSubmit}
            className="relative isolate overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FaHashtag className="text-indigo-600" />
                {editingId ? "Edit Voucher Series" : "Create New Series"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Voucher Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("SALES")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "SALES"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Sales Invoice
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("RETURN")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "RETURN"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Sales Return
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("RECEIPT")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "RECEIPT"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaFileInvoiceDollar size={12} /> Receipt Entry
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("PROFORMA")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "PROFORMA"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaFileInvoiceDollar size={12} /> Proforma (Kaccha)
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("PURCHASE")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "PURCHASE"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Purchase Bill
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("PURCHASE_ORDER")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "PURCHASE_ORDER"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("DEBIT_NOTE")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "DEBIT_NOTE"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Debit Note
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("PURCHASE_RETURN")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "PURCHASE_RETURN"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaReceipt size={12} /> Purchase Return
                </button>
                <button
                  type="button"
                  onClick={() => handleVoucherTypeChange("PAYMENT")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    voucherType === "PAYMENT"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FaFileInvoiceDollar size={12} /> Supplier Payment
                </button>
              </div>
            </div>

            {/* Series Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Series Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="e.g. Standard Sales Series, Retail GST Series..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-medium text-slate-800"
                required
              />
            </div>

            {/* Prefix & Suffix */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. INV-, PRF-, GST/"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Suffix</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. /26-27"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Next Number & Padding */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Number</label>
                <input
                  type="number"
                  value={nextNumber}
                  onChange={(e) => setNextNumber(e.target.value ? Number(e.target.value) : "")}
                  placeholder="1001"
                  min={1}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Padding Digits</label>
                <input
                  type="number"
                  value={padding}
                  onChange={(e) => setPadding(e.target.value ? Number(e.target.value) : "")}
                  placeholder="5"
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Live VCN Preview */}
            <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/80 space-y-1">
              <div className="text-[10px] uppercase font-bold text-indigo-600 flex items-center gap-1">
                <FaRegEye size={11} /> Next Generated Bill Number Preview:
              </div>
              <div className="text-sm font-extrabold text-indigo-950 tracking-wider">
                #{previewVcn}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Set as Default Series for {voucherType}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === "Active"}
                  onChange={(e) => setStatus(e.target.checked ? "Active" : "Inactive")}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Active Status</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" size={14} /> Saving...
                </>
              ) : editingId ? (
                "Update Voucher Series"
              ) : (
                <>
                  <FaPlus size={12} /> Create Voucher Series
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Series List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FaReceipt className="text-indigo-600" /> Configured Voucher Series
              </h3>
              <span className="text-xs text-slate-500">Auto-numbered sequentially during billing</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-indigo-600 font-medium flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin" size={18} /> Loading series configuration...
              </div>
            ) : seriesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No voucher series configured. Default series will be generated automatically.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Series Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Prefix / Suffix</th>
                      <th className="p-3">Next VCN Preview</th>
                      <th className="p-3 text-center">Default</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {seriesList.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-800">
                          {item.seriesName}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              item.voucherType === "SALES"
                                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                                : item.voucherType === "RETURN"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : item.voucherType === "RECEIPT"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : item.voucherType === "PROFORMA"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-cyan-100 text-cyan-800 border-cyan-300"
                            }`}
                          >
                            {item.voucherType === "SALES"
                              ? "Tax Invoice"
                              : item.voucherType === "RETURN"
                              ? "Sales Return"
                              : item.voucherType === "RECEIPT"
                              ? "Receipt Entry"
                              : item.voucherType === "PROFORMA"
                              ? "Proforma"
                              : item.voucherType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono">
                          {item.prefix || "(None)"} {item.suffix ? `• Suffix: ${item.suffix}` : ""}
                        </td>
                        <td className="p-3 font-extrabold text-indigo-900 font-mono">
                          #{item.previewVcn || `${item.prefix}${item.nextNumber}`}
                        </td>
                        <td className="p-3 text-center">
                          {item.isDefault ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                              ✓ Default
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                              title="Edit Series"
                            >
                              <FaEdit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              title="Delete Series"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
