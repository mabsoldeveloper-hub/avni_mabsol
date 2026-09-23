"use client";

import React, { Suspense } from "react";
import { FaCreditCard, FaCheck, FaShieldAlt, FaSync } from "react-icons/fa";
import { useSuperAdminData } from "@/components/super-admin/useSuperAdminData";

const PLANS = [
  {
    id: "free_trial",
    name: "Free Trial (Evaluation)",
    price: "₹0",
    period: "/ 30-90 Days",
    tag: "Standard Onboarding",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    popular: false,
    features: [
      "Full CRM & Billing Modules",
      "Up to 2 Branch Allocations",
      "Standard WhatsApp OTP Integration",
      "Super Admin Managed Session Timeout",
      "Email & In-app Technical Support",
    ],
  },
  {
    id: "business_standard",
    name: "Business Standard",
    price: "₹1,999",
    period: "/ month",
    tag: "Recommended",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    popular: true,
    features: [
      "All Free Trial Features Included",
      "Up to 5 Branch Allocations",
      "Priority WhatsApp & SMS Gateways",
      "Automated Financial Year Transitions",
      "Custom Roles & Granular Permissions",
      "Priority 24/7 Phone Support",
    ],
  },
  {
    id: "enterprise_unlimited",
    name: "Enterprise Unlimited",
    price: "Custom",
    period: "/ Lifetime or Annual",
    tag: "Full Scale",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    popular: false,
    features: [
      "Unlimited Access (Never Expires)",
      "Unlimited Branches & Outlets",
      "Dedicated Database Node Option",
      "Custom Domain & White-label Branding",
      "Dedicated Account Manager",
      "Direct API & Webhook Access",
    ],
  },
];

function SubscriptionPlansContent() {
  const { users, loading, refetch } = useSuperAdminData();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Subscription Plans & Tiers
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Billing Governance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure tenant tier allocations, pricing schemas, and access limits
          </p>
        </div>

        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto flex items-center justify-center"
          title="Refresh plans"
        >
          <FaSync className={`text-xs ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl bg-white p-6 border shadow-2xs flex flex-col justify-between relative transition-all ${
              plan.popular
                ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                : "border-slate-200/80 hover:border-slate-300"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Popular Tier
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${plan.badgeColor}`}>
                  {plan.tag}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                <span className="text-xs text-slate-400 font-medium">{plan.period}</span>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Included Features
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <FaCheck className="text-blue-600 mt-0.5 shrink-0 text-xs" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                className={`w-full py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-600/25"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                }`}
              >
                Configure Plan Policies
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tenant Plan Distribution Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Active Plan Distribution</h3>
        <p className="text-xs text-slate-400 mb-4">
          Overview of current tenant distribution across available pricing plans
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Free Trial Tenants</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {users.filter((u) => !u.isUnlimitedAccess).length}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Enterprise Unlimited Tenants</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {users.filter((u) => u.isUnlimitedAccess).length}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Total Tenant Revenue</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              ₹{(users.length * 1999).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPlansPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-blue-600" />
            Loading subscription plans...
          </div>
        </div>
      }
    >
      <SubscriptionPlansContent />
    </Suspense>
  );
}
