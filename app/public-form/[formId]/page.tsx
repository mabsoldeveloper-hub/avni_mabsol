"use client";

import React, { useEffect, useState, use } from "react";
import DynamicFormRenderer from "@/components/custom-forms/DynamicFormRenderer";

export default function StandalonePublicFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchPublicForm();
  }, [formId]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public-form/${formId}`);
      const data = await res.json();
      if (data.success) {
        setTemplate(data.template);
      } else {
        setErrorMsg(data.error || "Form not found or access denied.");
      }
    } catch (err: any) {
      console.error("Error loading public form:", err);
      setErrorMsg("Failed to load form.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 text-slate-500 font-medium animate-pulse">
        Loading form...
      </div>
    );
  }

  if (errorMsg || !template) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 text-rose-600 font-semibold text-center">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-slate-500">{errorMsg || "Form not found"}</p>
        </div>
      </div>
    );
  }

  const accentColor = template.theme?.accentColor || "#4f46e5";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-8">
      <div className="w-full space-y-6">
        {/* Top Header Banner */}
        <div
          className="p-8 rounded-3xl shadow-lg text-white space-y-2 relative overflow-hidden"
          style={{ backgroundColor: accentColor }}
        >
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/20 rounded-full inline-block">
            {template.category || "Feedback Form"}
          </span>
          <h1 className="text-3xl font-extrabold">{template.title}</h1>
          {template.description && (
            <p className="text-sm text-white/90">{template.description}</p>
          )}
        </div>

        {/* Public Form Renderer */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
          <DynamicFormRenderer
            template={template}
            readOnly={false}
            isPublic={true}
          />
        </div>

        <div className="text-center text-xs text-slate-400">
          Powered by MabsolCrm • Secure Form Studio
        </div>
      </div>
    </div>
  );
}
