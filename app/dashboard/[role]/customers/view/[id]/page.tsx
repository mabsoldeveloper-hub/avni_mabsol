"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaChevronRight, FaUsers, FaArrowLeft } from "react-icons/fa";

import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerSummaryCards from "@/components/customer/CustomerSummaryCards";
import CustomerQuickActions from "@/components/customer/CustomerQuickActions";
import CustomerOverview from "@/components/customer/CustomerOverview";

export default function CustomerViewPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadCustomer();
  }, [id]);

  

  const loadCustomer = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${id}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch customer`);
      }

      const data = await res.json();

      if (!data || Object.keys(data).length === 0) {
        setError("Customer record not found");
      } else {
        setCustomer(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load customer details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-6">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-xl">
          <div className="w-10 h-10 rounded-full border-[3.5px] border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading Customer Profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-6">
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-2xl p-6 text-center max-w-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
          <div className="relative">
            <p className="text-rose-600 text-sm font-bold mb-1">Error Loading Details</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard/customers"
                className="rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 hover:bg-slate-300 transition"
              >
                Back to Customers
              </Link>
              <button
                onClick={loadCustomer}
                className="rounded-xl bg-indigo-600 text-white text-xs font-semibold px-4 py-2 shadow-md hover:bg-indigo-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-3 sm:p-5 print:bg-white print:p-0">
      {/* Background Ambient Orbs */}
      <div className="pointer-events-none fixed top-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl print:hidden" />
      <div className="pointer-events-none fixed bottom-10 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl print:hidden" />

      {/* Top Breadcrumb Navigation */}
      <div className="mb-3 flex items-center justify-between text-xs print:hidden">
        <div className="flex items-center gap-2 text-slate-500">
          <Link href="/dashboard/customers" className="flex items-center gap-1 hover:text-indigo-600 transition font-medium">
            <FaUsers size={12} />
            <span>Customers</span>
          </Link>
          <FaChevronRight size={10} className="text-slate-400" />
          <span className="font-bold text-slate-800 truncate max-w-[200px]">
            {customer.PARNAM || "Customer Detail"}
          </span>
        </div>

        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 text-slate-600 font-semibold hover:bg-white transition shadow-sm"
        >
          <FaArrowLeft size={11} />
          <span>Back to List</span>
        </Link>
      </div>

      <div id="printable-area" className="relative z-10 space-y-4">
        {/* Header + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:block">
          <div className="lg:col-span-9 print:col-span-12">
            <CustomerHeader customer={customer} />
          </div>
          <div className="lg:col-span-3 print:hidden">
            <CustomerQuickActions customer={customer} />
          </div>
        </div>

        {/* Financial Summary Cards */}
        <CustomerSummaryCards customer={customer} />

        {/* Complete Customer Overview */}
        <CustomerOverview customer={customer} />
      </div>
    </div>
  );
}