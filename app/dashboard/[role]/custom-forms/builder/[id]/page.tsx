"use client";

import React, { useEffect, useState, use } from "react";
import FormBuilder from "@/components/custom-forms/FormBuilder";

export default function EditCustomFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-forms/templates/${id}`);
      const data = await res.json();
      if (data.success) {
        setInitialData(data.template);
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
        Loading form designer...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-rose-600 font-semibold">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <FormBuilder initialData={initialData} isEditMode={true} />
    </div>
  );
}
