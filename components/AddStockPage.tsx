"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { FaSave, FaBoxOpen } from "react-icons/fa";

type ProductOption = {
  _id?: string;
  CODE?: any;
  PRODUCT?: string;
  NAME?: string;
  MRP?: number;
  PRATE?: number;
  LPRATE?: number;
  currentStock?: number;
  CLBAL?: number;
  STOCK?: number;
  batches?: { batchNo: string; stock?: number; expiry?: string; mrp?: number; ratef?: number }[];
};

export default function AddStockPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productCode, setProductCode] = useState("");
  const [batchNo, setBatchNo] = useState("DEFAULT");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState(0);
  const [rate, setRate] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [selectedCompany?._id, selectedFY?._id]);

  async function loadProducts() {
    try {
      const p = new URLSearchParams();
      if (selectedCompany?._id) p.set("companyId", selectedCompany._id);
      if (selectedFY?._id) p.set("fyId", selectedFY._id);

      const r = await fetch(`/api/master/product?${p.toString()}`, { cache: "no-store" });
      const d = await r.json();
      setProducts(Array.isArray(d) ? d : d.products || []);
    } catch {
      setProducts([]);
    }
  }

  const selected = useMemo(
    () => products.find((p) =>
      String(p.CODE ?? "").trim() === productCode ||
      String(p.PRODUCT ?? "").trim().toUpperCase() === productCode.toUpperCase()
    ),
    [products, productCode]
  );

  const currentStock = Number(
    selected?.currentStock ?? selected?.CLBAL ?? selected?.STOCK ?? 0
  );

  function selectProduct(value: string) {
    setProductCode(value);
    const p = products.find((x) =>
      String(x.CODE ?? "").trim() === value ||
      String(x.PRODUCT ?? "").trim().toUpperCase() === value.toUpperCase()
    );

    setMrp(Number(p?.MRP || 0));
    setRate(Number(p?.LPRATE || p?.PRATE || 0));

    const first = p?.batches?.[0];
    if (first) {
      setBatchNo(first.batchNo || "DEFAULT");
      setExpiry(first.expiry || "");
      if (first.mrp) setMrp(Number(first.mrp));
      if (first.ratef) setRate(Number(first.ratef));
    } else {
      setBatchNo("DEFAULT");
      setExpiry("");
    }
  }

  async function save() {
    setMsg("");
    setErr("");

    if (!selectedCompany?._id || !selectedFY?._id) {
      setErr("Select Company and Financial Year.");
      return;
    }
    if (!selected || !productCode || qty <= 0) {
      setErr("Select product and enter quantity.");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch("/api/stock/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          companyCode: selectedCompany.companyCode,
          fyId: selectedFY._id,
          fyCode: selectedFY.fyCode,
          items: [{
            productId: String(selected._id || ""),
            productCode: String(selected.PRODUCT || selected.CODE || productCode),
            productName: String(selected.PRODUCT || selected.NAME || ""),
            batchNo,
            expiry,
            quantity: qty,
            rate,
            mrp,
          }],
          remarks,
        }),
      });

      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || "Failed");

      setMsg(`Stock added successfully. ${currentStock} + ${qty} = ${currentStock + qty}`);
      setQty(0);
      setRemarks("");
      await loadProducts();
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white border rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><FaBoxOpen /> Add Stock</h1>
            <p className="text-xs text-slate-500">Manual inward stock entry for the active Company & Financial Year.</p>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold">{selectedCompany?.companyName || "No Company"}</div>
            <div className="text-slate-500">{selectedFY?.fyCode || "No FY"}</div>
          </div>
        </div>

        {err && <div className="p-3 mb-3 rounded-xl bg-red-50 text-red-700 border border-red-200">{err}</div>}
        {msg && <div className="p-3 mb-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</div>}

        {selected && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-700 font-semibold">Selected Product</div>
              <div className="font-black text-emerald-950">{selected.PRODUCT || selected.NAME}</div>
              <div className="text-xs text-emerald-700">Code: {selected.CODE}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-700">Current Stock</div>
              <div className="text-2xl font-black text-emerald-900">{currentStock}</div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">
            Product
            <select value={productCode} onChange={(e) => selectProduct(e.target.value)} className="mt-1 w-full border rounded-xl p-3">
              <option value="">Select Product</option>
              {products.map((p, i) => (
                <option key={`${p.CODE}-${i}`} value={String(p.CODE ?? p.PRODUCT ?? "")}>
                  {p.PRODUCT || p.NAME} — Stock: {Number(p.currentStock ?? p.CLBAL ?? p.STOCK ?? 0)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold">
            Batch
            <select value={batchNo} onChange={(e) => {
              setBatchNo(e.target.value);
              const b = selected?.batches?.find(x => String(x.batchNo).toUpperCase() === e.target.value.toUpperCase());
              if (b?.expiry) setExpiry(b.expiry);
              if (b?.mrp) setMrp(Number(b.mrp));
              if (b?.ratef) setRate(Number(b.ratef));
            }} className="mt-1 w-full border rounded-xl p-3">
              <option value="DEFAULT">DEFAULT</option>
              {(selected?.batches || []).filter(b => b.batchNo && b.batchNo.toUpperCase() !== "DEFAULT").map((b, i) => (
                <option key={`${b.batchNo}-${i}`} value={b.batchNo}>
                  {b.batchNo} — Stock: {Number(b.stock || 0)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold">Expiry
            <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY or YYYY-MM" className="mt-1 w-full border rounded-xl p-3"/>
          </label>

          <label className="text-sm font-semibold">Quantity
            <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="mt-1 w-full border rounded-xl p-3 font-bold"/>
          </label>

          <label className="text-sm font-semibold">Rate
            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="mt-1 w-full border rounded-xl p-3"/>
          </label>

          <label className="text-sm font-semibold">MRP
            <input type="number" value={mrp} onChange={e => setMrp(Number(e.target.value))} className="mt-1 w-full border rounded-xl p-3"/>
          </label>

          <label className="text-sm font-semibold md:col-span-2">Remarks
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-1 w-full border rounded-xl p-3"/>
          </label>
        </div>

        {selected && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border text-sm">
            <b>Stock after entry:</b> {currentStock} + {Math.max(0, qty)} = <b>{currentStock + Math.max(0, qty)}</b>
          </div>
        )}

        <button disabled={saving} onClick={save} className="mt-5 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold flex gap-2 items-center disabled:opacity-50">
          <FaSave /> {saving ? "Saving..." : "Add Stock"}
        </button>
      </div>
    </div>
  );
}
