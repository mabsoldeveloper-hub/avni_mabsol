"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaTruck,
  FaBoxes,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaFilter,
  FaPaperPlane,
  FaMapMarkerAlt,
  FaBuilding,
  FaUserAlt,
  FaPhoneAlt,
  FaExternalLinkAlt,
  FaPlus,
} from "react-icons/fa";

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Status update modal state
  const [newStatus, setNewStatus] = useState("Dispatched");
  const [courierPartner, setCourierPartner] = useState("BlueDart Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [triggerNotification, setTriggerNotification] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "ALL" ? "/api/orders/tracking" : `/api/orders/tracking?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (!selectedOrder && data.orders.length > 0) {
          setSelectedOrder(data.orders[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load tracked orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/tracking/${selectedOrder._id || selectedOrder.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          courierPartner,
          trackingNumber,
          dispatchNotes,
          triggerNotification,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Order ${selectedOrder.orderNumber} updated to ${newStatus}! Buyer notified.`);
        fetchOrders();
        setSelectedOrder(data.order);
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const STAGES = ["Ordered", "Confirmed", "Packed", "Dispatched", "Out for Delivery", "Delivered"];

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
      (o.customerName && o.customerName.toLowerCase().includes(term)) ||
      (o.areaName && o.areaName.toLowerCase().includes(term)) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 p-6 text-white border border-sky-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300">
            Stock & Order Lifecycle
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2.5">
            <FaTruck className="text-sky-400" /> Live Order & Stock Balance Tracker
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Track order status progression, audit remaining stock ("Stock Left") per batch, and dispatch automated WhatsApp & SMS delivery milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/broadcast"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all hover:scale-105"
          >
            📢 Broadcast Notice
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none"
            placeholder="Search Order #, Customer, Area, AWB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "Ordered", "Confirmed", "Dispatched", "Delivered"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Split: Orders List & Detailed Lifecycle Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Tracked Stock Orders ({filteredOrders.length})
          </h3>

          <div className="flex flex-col gap-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredOrders.map((ord) => {
              const isSelected = selectedOrder?._id === ord._id || selectedOrder?.orderId === ord.orderId;
              return (
                <div
                  key={ord._id || ord.orderId}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? "bg-sky-50/80 dark:bg-sky-950/30 border-sky-500 shadow-md ring-1 ring-sky-500/30"
                      : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-sky-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {ord.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        ord.currentStatus === "Delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ord.currentStatus === "Dispatched"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ord.currentStatus}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{ord.customerName}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <FaMapMarkerAlt size={10} className="text-purple-500" /> {ord.areaName || "Main Territory"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <span>Value: <strong>₹{Number(ord.totalAmount || 0).toLocaleString("en-IN")}</strong></span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ord.orderDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Stepper & Stock Audit (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {selectedOrder ? (
            <>
              {/* Card 1: Lifecycle Progress Stepper */}
              <div className="rounded-3xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      Tracking Overview
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedOrder.orderNumber} — {selectedOrder.customerName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Order Value</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      ₹{Number(selectedOrder.totalAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Visual Stepper */}
                <div className="relative py-2">
                  <div className="grid grid-cols-6 gap-2 text-center">
                    {STAGES.map((st, i) => {
                      const currIdx = STAGES.indexOf(selectedOrder.currentStatus);
                      const isDone = currIdx >= i;
                      const isCurrent = currIdx === i;

                      return (
                        <div key={st} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? "bg-sky-600 text-white ring-4 ring-sky-500/20 shadow-md scale-110"
                                : isDone
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isDone && !isCurrent ? <FaCheckCircle size={12} /> : i + 1}
                          </div>
                          <span
                            className={`text-[9.5px] sm:text-[10.5px] font-bold ${
                              isCurrent
                                ? "text-sky-600 dark:text-sky-400"
                                : isDone
                                ? "text-slate-800 dark:text-slate-200"
                                : "text-slate-400"
                            }`}
                          >
                            {st}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Courier & Dispatch Banner */}
                {selectedOrder.trackingNumber && (
                  <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                        <FaTruck size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {selectedOrder.courierPartner || "Courier Partner"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">AWB: {selectedOrder.trackingNumber}</p>
                      </div>
                    </div>
                    {selectedOrder.trackingUrl && (
                      <a
                        href={selectedOrder.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
                      >
                        Track Online <FaExternalLinkAlt size={10} />
                      </a>
                    )}
                  </div>
                )}

                {/* Milestone Update Form */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Update Tracking Milestone & Notify Buyer
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Milestone Stage</label>
                      <select
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Courier Partner</label>
                      <input
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        value={courierPartner}
                        onChange={(e) => setCourierPartner(e.target.value)}
                        placeholder="e.g. BlueDart"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">AWB / Tracking #</label>
                      <input
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="BD992817IN"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={triggerNotification}
                        onChange={(e) => setTriggerNotification(e.target.checked)}
                        className="w-3.5 h-3.5 text-sky-600 rounded"
                      />
                      Auto-notify Buyer via WhatsApp & SMS
                    </label>
                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {updating ? "Updating..." : "Update Status & Dispatch Alert"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Real-time Stock Balance & Stock Left Audit */}
              <div className="rounded-3xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Stock Decrement Audit & Balance Left
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Real-time inventory deduction
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                        <th className="py-2 font-semibold">Product Name</th>
                        <th className="py-2 font-semibold">Batch #</th>
                        <th className="py-2 font-semibold text-center">Purchased Qty</th>
                        <th className="py-2 font-semibold text-center">Stock Before</th>
                        <th className="py-2 font-semibold text-center">Stock Left (After)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedOrder.items?.map((it: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-100">{it.itemName}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500">{it.batchNo || "BCH-STD"}</td>
                          <td className="py-3 text-center font-bold text-slate-900 dark:text-white">
                            {it.quantityOrdered} {it.unit || "PCS"}
                          </td>
                          <td className="py-3 text-center text-slate-500">{it.stockBefore}</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">
                              {it.stockAfter} Left
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 rounded-3xl bg-white/50 border border-dashed border-slate-200">
              Select an order on the left to inspect live tracking and stock audit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
