"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { FaArrowLeft, FaPaperPlane, FaTable } from "react-icons/fa";
import DynamicFormRenderer from "@/components/custom-forms/DynamicFormRenderer";

export default function FormEntryPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchTemplate();
  }, [formId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-forms/templates/${formId}`);
      const data = await res.json();
      if (data.success) {
        setTemplate(data.template);
      } else {
        setErrorMsg(data.error || "Form template not found.");
      }
    } catch (err: any) {
      console.error("Error loading template:", err);
      setErrorMsg("Failed to load form template.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
        Loading form...
      </div>
    );
  }

  if (errorMsg || !template) {
    return (
      <div className="p-12 text-center text-rose-600 font-semibold">
        {errorMsg || "Form not found"}
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/custom-forms"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1.5"
        >
          <FaArrowLeft /> Back to Saved Forms Hub
        </Link>

        <Link
          href={`/dashboard/custom-forms/views/${template.formId}`}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
        >
          <FaTable className="text-indigo-500" /> View All Submissions
        </Link>
      </div>

      {/* Main Form Box */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <FaPaperPlane /> Data Entry Form
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {template.title}
          </h1>
          {template.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {template.description}
            </p>
          )}
        </div>

        <DynamicFormRenderer template={template} readOnly={false} />
      </div>
    </div>
  );
}
