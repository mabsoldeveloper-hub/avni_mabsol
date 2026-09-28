"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { FaArrowLeft, FaTable, FaPaperPlane, FaPlus } from "react-icons/fa";
import DynamicFilterBar from "@/components/custom-forms/DynamicFilterBar";
import DynamicTableView from "@/components/custom-forms/DynamicTableView";

export default function CustomFormViewPage({
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

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    startDate: "",
    endDate: "",
  });

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        formId,
        ...filters,
      });

      const res = await fetch(`/api/custom-forms/submissions?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTemplate(data.template);
        setSubmissions(data.submissions || []);
        setTotal(data.pagination?.total || 0);
      } else {
        setErrorMsg(data.error || "Failed to load submissions.");
      }
    } catch (err: any) {
      console.error("Error fetching submissions:", err);
      setErrorMsg("Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [formId, filters]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
    });
  };

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-rose-600 font-semibold">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/custom-forms"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1.5 mb-2"
          >
            <FaArrowLeft /> Back to Saved Forms Hub
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FaTable className="text-indigo-600 dark:text-indigo-400" />
            {template ? `${template.title} - Auto-Generated Data View` : "Form Submissions"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic view table with auto-generated contextual filters based on this form&apos;s fields.
          </p>
        </div>

        {template && (
          <Link
            href={`/dashboard/custom-forms/entry/${template.formId}`}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FaPaperPlane /> Submit New Entry
          </Link>
        )}
      </div>

      {/* Dynamic Filter Bar */}
      {template && (
        <DynamicFilterBar
          fields={template.fields || []}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      )}

      {/* Dynamic Data Table */}
      {template && (
        <DynamicTableView
          template={template}
          submissions={submissions}
          total={total}
          loading={loading}
          onRefresh={fetchSubmissions}
        />
      )}
    </div>
  );
}
