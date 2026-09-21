"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { FaPlus, FaTrash, FaSave, FaSearch, FaColumns, FaCheck } from "react-icons/fa";

interface ProductOption {
  _id?: string;
  CODE?: any;
  PRODUCT?: string;
  NAME?: string;
  PACKING?: string;
  MRP?: number;
  PRATE?: number;
  LPRATE?: number;
  currentStock?: number;
  CLBAL?: number;
  STOCK?: number;
}

interface Row {
  productId: string;
  productCode: string;
  productName: string;
  batchNo: string;
  expiry: string;
  mfgDate: string;
  quantity: number;
  mrp: number;
  rate: number;
  currentStock: number;
}

const blank = (): Row => ({
  productId: "",
  productCode: "",
  productName: "",
  batchNo: "DEFAULT",
  expiry: "",
  mfgDate: "",
  quantity: 0,
  mrp: 0,
  rate: 0,
  currentStock: 0,
});

// ─── Column Config ───────────────────────────────────────────
type FieldKey =
  | "productCode"
  | "productName"
  | "currentStock"
  | "batchNo"
  | "expiry"
  | "mfgDate"
  | "quantity"
  | "mrp"
  | "rate";

interface FieldConfig {
  key: FieldKey;
  label: string;
  alwaysVisible?: boolean;
}

const ALL_FIELDS: FieldConfig[] = [
  { key: "productCode", label: "Product Code", alwaysVisible: true },
  { key: "productName", label: "Product", alwaysVisible: true },
  { key: "currentStock", label: "Current Stock" },
  { key: "batchNo", label: "Batch" },
  { key: "expiry", label: "Expiry" },
  { key: "mfgDate", label: "Mfg Date" },
  { key: "quantity", label: "Opening Qty" },
  { key: "mrp", label: "MRP" },
  { key: "rate", label: "Rate" },
];

const STORAGE_KEY = "opening_stock_visible_fields";

const DEFAULT_VISIBLE: Record<FieldKey, boolean> = {
  productCode: true,
  productName: true,
  currentStock: true,
  batchNo: true,
  expiry: true,
  mfgDate: true,
  quantity: true,
  mrp: true,
  rate: true,
};

export default function OpeningStockPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [rows, setRows] = useState<Row[]>([blank()]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ─── Column Visibility ─────────────────────────────────────
  const [visible, setVisible] = useState<Record<FieldKey, boolean>>(DEFAULT_VISIBLE);
  const [hydrated, setHydrated] = useState(false);
  const [showColumnPanel, setShowColumnPanel] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setVisible({ ...DEFAULT_VISIBLE, ...parsed });
      }
    } catch (err) {
      console.error("Failed to load column preferences", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save only after hydration
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
  }, [visible, hydrated]);

  function toggleField(key: FieldKey) {
    const field = ALL_FIELDS.find((f) => f.key === key);
    if (field?.alwaysVisible) return;
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── Products ──────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
  }, [selectedCompany?._id, selectedFY?._id]);

  async function loadProducts() {
    try {
      const p = new URLSearchParams();
      if (selectedCompany?._id) p.set("companyId", selectedCompany._id);
      const res = await fetch(`/api/master/product?${p.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch {
      setProducts([]);
    }
  }

  const filteredProducts = products
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        `${p.CODE || ""} ${p.PRODUCT || p.NAME || ""} ${p.PACKING || ""}`
          .toLowerCase()
          .includes(q)
      );
    })
    .slice(0, 30);

  function chooseProduct(index: number, p: ProductOption) {
    setRows((old) =>
      old.map((r, i) =>
        i === index
          ? {
              ...r,
              productId: String(p._id || ""),
              productCode: String(p.CODE ?? ""),
              productName: String(p.PRODUCT || p.NAME || ""),
              mrp: Number(p.MRP || 0),
              rate: Number(p.LPRATE || p.PRATE || 0),
              currentStock: Number(p.currentStock ?? p.CLBAL ?? p.STOCK ?? 0),
            }
          : r
      )
    );
    setSearch("");
  }

  function update(index: number, key: keyof Row, value: any) {
    setRows((old) => old.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function save() {
    setMessage("");
    setError("");
    if (!selectedCompany?._id || !selectedFY?._id) {
      return setError("Please select Company and Financial Year first.");
    }

    const valid = rows.filter((r) => r.productCode && Number(r.quantity) >= 0);
    if (!valid.length) return setError("Please add at least one product.");

    setSaving(true);
    try {
      const res = await fetch("/api/stock/opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          companyCode: selectedCompany.companyCode,
          fyId: selectedFY._id,
          fyCode: selectedFY.fyCode,
          items: valid,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save opening stock");
      setMessage(`Opening stock saved for ${data.count} item(s).`);
      setRows([blank()]);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const visibleFields = ALL_FIELDS.filter((f) => visible[f.key]);

  return (
    <div className="container-fluid p-4 md:p-6 space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Opening Stock</h1>
          <p className="text-xs text-slate-500">
            Set opening quantity for the selected Company & Financial Year.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Columns Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnPanel((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold transition"
            >
              <FaColumns /> Columns
            </button>

            {showColumnPanel && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border rounded-xl shadow-xl p-3 space-y-1">
                <div className="text-xs font-bold text-slate-500 mb-2 px-1">
                  Show / Hide Columns
                </div>

                {ALL_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    disabled={field.alwaysVisible}
                    onClick={() => toggleField(field.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                      ${field.alwaysVisible ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}
                      ${visible[field.key] ? "bg-emerald-50 text-emerald-800" : "text-slate-600"}`}
                  >
                    <span>{field.label}</span>
                    {visible[field.key] && <FaCheck className="text-emerald-600" />}
                  </button>
                ))}

                <div className="pt-2 border-t mt-2">
                  <button
                    type="button"
                    onClick={() => setVisible(DEFAULT_VISIBLE)}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 py-1"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-right text-xs">
            <div className="font-bold">
              {selectedCompany?.companyName || "No Company"}
            </div>
            <div className="text-slate-500">{selectedFY?.fyCode || "No FY"}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 p-3 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 text-sm">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm overflow-visible">
        {/* Search */}
        <div className="p-3 border-b flex items-center gap-2">
          <FaSearch className="text-slate-400" />
          <input
            value={search}
            onFocus={() => setActiveRow(Math.max(0, rows.length - 1))}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product to add..."
            className="flex-1 outline-none text-sm"
          />
        </div>

        {search && (
          <div className="border-b max-h-64 overflow-auto">
            {filteredProducts.map((p, i) => (
              <button
                key={`${p.CODE}-${i}`}
                type="button"
                onClick={() => chooseProduct(activeRow, p)}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b last:border-0 flex items-center justify-between"
              >
                <div>
                  <b>{p.PRODUCT || p.NAME}</b>
                  <span className="ml-2 text-xs text-slate-500">
                    Code: {p.CODE} • MRP ₹{p.MRP || 0}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-700">
                  Current Stock: {Number(p.currentStock ?? p.CLBAL ?? p.STOCK ?? 0)}
                </span>
              </button>
            ))}
            {!filteredProducts.length && (
              <div className="p-4 text-sm text-slate-500">No product found.</div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {visibleFields.map((f) => (
                  <th key={f.key} className="p-3 text-left whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                <th className="p-3 text-left w-12"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {visible.productCode && (
                    <td className="p-2">
                      <input
                        value={r.productCode}
                        onChange={(e) => update(i, "productCode", e.target.value)}
                        className="w-28 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.productName && (
                    <td className="p-2">
                      <input
                        value={r.productName}
                        onChange={(e) => update(i, "productName", e.target.value)}
                        className="min-w-48 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.currentStock && (
                    <td className="p-2">
                      <div className="font-black text-emerald-700">
                        {Number(r.currentStock || 0)}
                      </div>
                    </td>
                  )}

                  {visible.batchNo && (
                    <td className="p-2">
                      <input
                        value={r.batchNo}
                        onChange={(e) => update(i, "batchNo", e.target.value)}
                        placeholder="Batch"
                        className="w-28 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.expiry && (
                    <td className="p-2">
                      <input
                        value={r.expiry}
                        onChange={(e) => update(i, "expiry", e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="w-32 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.mfgDate && (
                    <td className="p-2">
                      <input
                        value={r.mfgDate}
                        onChange={(e) => update(i, "mfgDate", e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="w-32 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.quantity && (
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={r.quantity}
                        onChange={(e) => update(i, "quantity", Number(e.target.value))}
                        className="w-24 border rounded-lg p-2 font-bold"
                      />
                    </td>
                  )}

                  {visible.mrp && (
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.mrp}
                        onChange={(e) => update(i, "mrp", Number(e.target.value))}
                        className="w-24 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  {visible.rate && (
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.rate}
                        onChange={(e) => update(i, "rate", Number(e.target.value))}
                        className="w-24 border rounded-lg p-2"
                      />
                    </td>
                  )}

                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRows((old) =>
                          old.length === 1 ? [blank()] : old.filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-600 p-2"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 flex justify-between">
          <button
            type="button"
            onClick={() => {
              setRows((old) => [...old, blank()]);
              setActiveRow(rows.length);
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 font-bold flex items-center gap-2"
          >
            <FaPlus /> Add Row
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <FaSave /> {saving ? "Saving..." : "Save Opening Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}