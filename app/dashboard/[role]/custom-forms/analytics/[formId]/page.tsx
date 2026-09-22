"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { FaArrowLeft, FaChartBar, FaTable, FaPaperPlane } from "react-icons/fa";
import FormAnalyticsView from "@/components/custom-forms/FormAnalyticsView";

export default function FormAnalyticsPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [template, setTemplate] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchAnalyticsData();
  }, [formId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-forms/submissions?formId=${formId}&limit=500`);
      const data = await res.json();
      if (data.success) {
        setTemplate(data.template);
        setSubmissions(data.submissions || []);
        setTotal(data.pagination?.total || 0);
      } else {
        setErrorMsg(data.error || "Failed to load analytics.");
      }
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      setErrorMsg("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
        Loading form analytics...
      </div>
    );
  }

  if (errorMsg || !template) {
    return (
      <div className="p-12 text-center text-rose-600 font-semibold">
        {errorMsg || "Analytics data not found"}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/custom-forms"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1.5 mb-2"
          >
            <FaArrowLeft /> Back to Saved Forms Hub
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FaChartBar className="text-indigo-600 dark:text-indigo-400" />
            {template.title} - Visual Analytics & KPI Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time KPIs, approval metrics, daily submission trends, and respondent rankings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/custom-forms/views/${template.formId}`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FaTable className="text-indigo-500" /> Data Table
          </Link>
          <Link
            href={`/dashboard/custom-forms/entry/${template.formId}`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FaPaperPlane /> Fill Entry
          </Link>
        </div>
      </div>

      {/* Main Analytics View */}
      <FormAnalyticsView
        template={template}
        submissions={submissions}
        total={total}
      />
    </div>
  );
}
