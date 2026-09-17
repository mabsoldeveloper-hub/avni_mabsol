"use client";

import React from "react";
import FormBuilder from "@/components/custom-forms/FormBuilder";

export default function CreateCustomFormPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6">
      <FormBuilder isEditMode={false} />
    </div>
  );
}
