import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_FIELD_TYPES = new Set([
  "text",
  "number",
  "date",
  "select",
  "textarea",
  "checkbox",
  "radio",
  "mappedTable",
  "signature",
  "gps",
  "fileUpload",
  "formula",
  "repeaterTable",
  "rating",
]);

const VALID_CONDITION_OPERATORS = new Set([
  "equals",
  "notEquals",
  "contains",
  "greaterThan",
  "lessThan",
  "isFilled",
]);

const VALID_CONDITION_ACTIONS = new Set(["show", "hide", "require"]);

interface RawFieldConfig {
  id?: string;
  key?: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  mappedTable?: string;
  mappedField?: string;
  formulaExpression?: string;
  subFields?: any[];
  defaultValue?: any;
  order?: number;
  section?: string;
  helpText?: string;
}

function sanitizeFields(rawFields: any[]): any[] {
  if (!Array.isArray(rawFields)) return [];

  const seenKeys = new Set<string>();

  return rawFields.map((f: RawFieldConfig, index: number) => {
    const rawType = String(f.type || "text").trim();
    const type = VALID_FIELD_TYPES.has(rawType) ? rawType : "text";

    let cleanKey = String(f.key || f.label || `field_${index + 1}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!cleanKey) cleanKey = `field_${index + 1}`;
    if (seenKeys.has(cleanKey)) {
      cleanKey = `${cleanKey}_${index + 1}`;
    }
    seenKeys.add(cleanKey);

    const sanitizedField: any = {
      id: f.id || `field_${Date.now()}_${index + 1}`,
      key: cleanKey,
      label: f.label || `Field ${index + 1}`,
      type,
      required: Boolean(f.required),
      order: typeof f.order === "number" ? f.order : index + 1,
      section: f.section || "General Information",
    };

    if (f.placeholder) sanitizedField.placeholder = f.placeholder;
    if (f.helpText) sanitizedField.helpText = f.helpText;
    if (f.defaultValue !== undefined) sanitizedField.defaultValue = f.defaultValue;

    // Handle options for dropdown / radio / checkbox
    if (type === "select" || type === "radio" || type === "checkbox") {
      if (Array.isArray(f.options) && f.options.length > 0) {
        sanitizedField.options = f.options.map(String);
      } else {
        sanitizedField.options = ["Option 1", "Option 2", "Option 3"];
      }
    }

    // Handle repeater table nested subFields
    if (type === "repeaterTable") {
      if (Array.isArray(f.subFields) && f.subFields.length > 0) {
        sanitizedField.subFields = f.subFields.map((sub: any, subIdx: number) => {
          const subType = VALID_FIELD_TYPES.has(sub.type) ? sub.type : "text";
          const subKey = String(sub.key || sub.label || `sub_${subIdx + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_");
          return {
            id: sub.id || `sub_${Date.now()}_${subIdx + 1}`,
            key: subKey || `sub_${subIdx + 1}`,
            label: sub.label || `Sub Field ${subIdx + 1}`,
            type: subType,
            required: Boolean(sub.required),
            order: typeof sub.order === "number" ? sub.order : subIdx + 1,
            placeholder: sub.placeholder,
            options: Array.isArray(sub.options) ? sub.options : undefined,
          };
        });
      } else {
        sanitizedField.subFields = [
          { id: `sub_1`, key: "item_name", label: "Item Name", type: "text", required: true, order: 1 },
          { id: `sub_2`, key: "quantity", label: "Quantity", type: "number", required: true, order: 2 },
        ];
      }
    }

    return sanitizedField;
  });
}

function sanitizeConditions(rawConditions: any[]): any[] {
  if (!Array.isArray(rawConditions)) return [];
  return rawConditions
    .filter((c: any) => c && c.sourceFieldKey && c.targetFieldKey)
    .map((c: any, idx: number) => {
      const op = String(c.operator || "equals");
      const act = String(c.action || "show");
      return {
        id: c.id || `cond_${Date.now()}_${idx + 1}`,
        sourceFieldKey: String(c.sourceFieldKey).trim(),
        operator: VALID_CONDITION_OPERATORS.has(op) ? op : "equals",
        compareValue: String(c.compareValue || ""),
        targetFieldKey: String(c.targetFieldKey).trim(),
        action: VALID_CONDITION_ACTIONS.has(act) ? act : "show",
      };
    });
}

function parseGeminiError(status: number, rawText: string, modelName: string) {
  let parsedMessage = "";
  try {
    const json = JSON.parse(rawText);
    if (json.error?.message) {
      parsedMessage = json.error.message;
    }
  } catch (e) {
    parsedMessage = rawText;
  }

  if (
    status === 429 ||
    parsedMessage.toLowerCase().includes("resource_exhausted") ||
    parsedMessage.toLowerCase().includes("quota")
  ) {
    return {
      title: "Gemini Free-Tier Rate Limit Reached (HTTP 429)",
      message: `Google AI Studio free quota for "${modelName}" is temporarily exhausted or rate-limited.`,
      hint: "Google free-tier allows approx. 15 requests/min. Please wait 30-60 seconds, or use the offline schema fallback.",
      status: 429,
      isQuota: true,
    };
  }

  if (
    status === 403 ||
    status === 401 ||
    parsedMessage.toLowerCase().includes("api_key_invalid") ||
    parsedMessage.toLowerCase().includes("api key not valid")
  ) {
    return {
      title: "Gemini API Key Authentication Failed (HTTP 403/401)",
      message: "The GEMINI_API_KEY in your .env file is either invalid or expired.",
      hint: "Please generate a new free key at aistudio.google.com and update GEMINI_API_KEY in .env.",
      status: status || 403,
      isQuota: false,
    };
  }

  if (status === 404 || parsedMessage.toLowerCase().includes("not_found")) {
    return {
      title: `Gemini Model "${modelName}" Not Available (HTTP 404)`,
      message: `The model "${modelName}" was not found on your current Google AI Studio account.`,
      hint: "Select 'gemini-2.5-flash' from the Model Selector dropdown.",
      status: 404,
      isQuota: false,
    };
  }

  if (
    status === 503 ||
    status === 500 ||
    parsedMessage.toLowerCase().includes("overloaded") ||
    parsedMessage.toLowerCase().includes("unavailable")
  ) {
    return {
      title: "Google AI Studio Servers Overloaded (HTTP 503)",
      message: "Google Gemini servers are temporarily busy.",
      hint: "Please try again in a few moments.",
      status: status || 503,
      isQuota: false,
    };
  }

  return {
    title: `Gemini API Error (HTTP ${status})`,
    message: parsedMessage || `Request failed with HTTP status ${status}.`,
    hint: "Please check your network connection or try again shortly.",
    status,
    isQuota: false,
  };
}

function getRuleBasedFallback(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  let title = "Custom Pharma Form";
  let category = "General";
  let description = `Form schema generated based on: "${prompt}"`;
  let fields: any[] = [];
  const conditions: any[] = [];

  if (lowerPrompt.includes("dcr") || lowerPrompt.includes("doctor call") || lowerPrompt.includes("visit")) {
    title = "MR Daily Call Report (DCR) & Sampling";
    category = "Field Force Operations";
    description = "Comprehensive MR call report with doctor selection, discussion notes, sample quantity repeater, and live GPS stamp.";
    fields = [
      {
        id: "field_1",
        key: "doctor_name",
        label: "Doctor Name",
        type: "text",
        required: true,
        placeholder: "e.g. Dr. Rajesh Sharma, MD",
        section: "Doctor Details",
        order: 1,
      },
      {
        id: "field_2",
        key: "visit_date",
        label: "Visit Date & Time",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
        section: "Doctor Details",
        order: 2,
      },
      {
        id: "field_3",
        key: "gps_location",
        label: "Live GPS Location Stamp",
        type: "gps",
        required: true,
        section: "Verification Proof",
        order: 3,
      },
      {
        id: "field_4",
        key: "discussion_summary",
        label: "Discussion Summary & Brand Focus",
        type: "textarea",
        required: true,
        placeholder: "Key topics discussed with the doctor...",
        section: "Call Details",
        order: 4,
      },
      {
        id: "field_5",
        key: "samples_given",
        label: "Samples / POB Items Distributed",
        type: "repeaterTable",
        required: false,
        section: "Samples & POB",
        subFields: [
          { id: "sub_1", key: "product_name", label: "Product Name", type: "text", required: true, order: 1 },
          { id: "sub_2", key: "sample_qty", label: "Sample Qty", type: "number", required: true, order: 2 },
          { id: "sub_3", key: "pob_qty", label: "POB Order Qty", type: "number", required: false, order: 3 },
        ],
        order: 5,
      },
      {
        id: "field_6",
        key: "doctor_signature",
        label: "Doctor E-Signature Stamp",
        type: "signature",
        required: true,
        section: "Verification Proof",
        order: 6,
      },
    ];
  } else if (lowerPrompt.includes("salary") || lowerPrompt.includes("payroll") || lowerPrompt.includes("wage")) {
    title = "Employee Monthly Salary & Payroll Disbursement";
    category = "Accounts & HR";
    description = "Monthly payroll settlement form with earnings, allowances, deductions, and net salary.";
    fields = [
      { id: "field_1", key: "employee_code", label: "Employee Code", type: "text", required: true, section: "Employee Info", order: 1 },
      { id: "field_2", key: "employee_name", label: "Employee Name", type: "text", required: true, section: "Employee Info", order: 2 },
      { id: "field_3", key: "designation", label: "Designation", type: "text", required: true, section: "Employee Info", order: 3 },
      { id: "field_4", key: "salary_month", label: "Salary Month & Year", type: "date", required: true, section: "Salary Period", order: 4 },
      { id: "field_5", key: "total_working_days", label: "Total Working Days", type: "number", required: true, section: "Attendance", order: 5 },
      { id: "field_6", key: "days_present", label: "Days Present", type: "number", required: true, section: "Attendance", order: 6 },
      { id: "field_7", key: "basic_salary", label: "Basic Salary (₹)", type: "number", required: true, section: "Earnings", order: 7 },
      { id: "field_8", key: "hra_allowance", label: "HRA Allowance (₹)", type: "number", required: false, section: "Earnings", order: 8 },
      { id: "field_9", key: "tada_allowance", label: "TA / DA Allowance (₹)", type: "number", required: false, section: "Earnings", order: 9 },
      { id: "field_10", key: "incentive_bonus", label: "Sales Incentive / Bonus (₹)", type: "number", required: false, section: "Earnings", order: 10 },
      { id: "field_11", key: "pf_deduction", label: "PF Deduction (₹)", type: "number", required: false, section: "Deductions", order: 11 },
      { id: "field_12", key: "esi_deduction", label: "ESI Deduction (₹)", type: "number", required: false, section: "Deductions", order: 12 },
      { id: "field_13", key: "tds_deduction", label: "TDS / Tax Deduction (₹)", type: "number", required: false, section: "Deductions", order: 13 },
      { id: "field_14", key: "net_salary", label: "Net Payable Salary (₹)", type: "number", required: true, section: "Net Pay", order: 14 },
      { id: "field_15", key: "bank_account", label: "Bank Account Number", type: "text", required: true, section: "Bank Details", order: 15 },
      { id: "field_16", key: "ifsc_code", label: "IFSC Code", type: "text", required: true, section: "Bank Details", order: 16 },
      { id: "field_17", key: "hr_approval_signature", label: "HR Manager Approval Signature", type: "signature", required: true, section: "Signoff & Audit", order: 17 },
    ];
  } else if (lowerPrompt.includes("feedback") || lowerPrompt.includes("survey") || lowerPrompt.includes("rating")) {
    title = "Doctor Brand Preference & Feedback Survey";
    category = "Marketing & Clinical Feedback";
    description = "Capture doctor ratings, product satisfaction, and brand feedback.";
    fields = [
      { id: "field_1", key: "doctor_name", label: "Doctor Name", type: "text", required: true, section: "Doctor Information", order: 1 },
      { id: "field_2", key: "specialty", label: "Specialty / Qualification", type: "select", options: ["Cardiologist", "Physician", "Pediatrician", "Gynecologist", "Dermatologist", "General Practitioner"], required: true, section: "Doctor Information", order: 2 },
      { id: "field_3", key: "efficacy_rating", label: "Product Efficacy Rating", type: "rating", required: true, section: "Brand Feedback", order: 3 },
      { id: "field_4", key: "prescribes_regularly", label: "Do you regularly prescribe our brand?", type: "radio", options: ["Yes", "No", "Occasionally"], required: true, section: "Brand Feedback", order: 4 },
      { id: "field_5", key: "feedback_comments", label: "Detailed Clinical Feedback / Suggestions", type: "textarea", required: false, placeholder: "Any observations or patient feedback...", section: "Brand Feedback", order: 5 },
    ];
  } else if (lowerPrompt.includes("expense") || lowerPrompt.includes("travel") || lowerPrompt.includes("claim")) {
    title = "MR Daily Travel & Expense Claim Form";
    category = "Accounts & HR";
    description = "Field expense claim for MR daily allowance, hotel bills, and travel receipts.";
    fields = [
      { id: "field_1", key: "mr_name", label: "MR Name", type: "text", required: true, section: "Claimant Info", order: 1 },
      { id: "field_2", key: "claim_date", label: "Claim Date", type: "date", required: true, section: "Claimant Info", order: 2 },
      { id: "field_3", key: "travel_type", label: "Travel Category", type: "select", options: ["Local HQ", "Ex-Station", "Outstation"], required: true, section: "Travel Details", order: 3 },
      { id: "field_4", key: "expense_items", label: "Expense Itemized List", type: "repeaterTable", required: true, section: "Expense Items", subFields: [
        { id: "sub_1", key: "particulars", label: "Expense Particulars", type: "text", required: true, order: 1 },
        { id: "sub_2", key: "amount", label: "Amount (₹)", type: "number", required: true, order: 2 },
      ], order: 4 },
      { id: "field_5", key: "receipt_upload", label: "Upload Travel / Hotel Receipts (PDF/Image)", type: "fileUpload", required: true, section: "Bills & Proofs", order: 5 },
    ];
  } else {
    title = prompt.split(" ").slice(0, 5).join(" ").toUpperCase() + " Form";
    category = "Custom";
    description = `Form schema generated based on: "${prompt}"`;
    fields = [
      { id: "field_1", key: "respondent_name", label: "Full Name", type: "text", required: true, section: "General Information", order: 1 },
      { id: "field_2", key: "contact_number", label: "Contact Mobile / Phone", type: "text", required: true, section: "General Information", order: 2 },
      { id: "field_3", key: "entry_date", label: "Entry Date", type: "date", required: true, defaultValue: new Date().toISOString().split("T")[0], section: "General Information", order: 3 },
      { id: "field_4", key: "details", label: "Specific Details / Notes", type: "textarea", required: false, placeholder: "Enter details as described in your prompt...", section: "Details", order: 4 },
      { id: "field_5", key: "verification_signature", label: "Verification Signature", type: "signature", required: false, section: "Signoff", order: 5 },
    ];
  }

  return {
    title,
    category,
    description,
    accessMode: "Internal",
    fields,
    conditions,
  };
}

export async function POST(req: Request) {
  try {
    const { prompt, model = "gemini-2.5-flash" } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If no Gemini API key configured in .env
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found in environment.");
      const fallbackSchema = getRuleBasedFallback(prompt);
      return NextResponse.json({
        success: true,
        source: "fallback",
        model: "rule-based",
        warning: {
          title: "GEMINI_API_KEY Missing in .env",
          message: "No Gemini API key was detected in your server configuration (.env).",
          hint: "The form was generated using the built-in Pharma Schema Engine. To enable live Gemini AI, add GEMINI_API_KEY in .env.",
          isQuota: false,
        },
        formSchema: fallbackSchema,
      });
    }

    // System prompt for Gemini
    const systemPrompt = `You are an elite Enterprise Pharmaceutical CRM Solution Architect.
Your task is to take any user prompt and generate a complete, production-ready, highly professional form schema JSON for a pharmaceutical CRM.

Allowed field types:
- "text": Single line text input (names, codes, designations, addresses)
- "number": Numeric value (quantities, amounts, discount percentage, patient counts)
- "date": Date picker (visit date, order date, expiry date, follow-up date)
- "select": Single selection dropdown (must provide "options": string[])
- "textarea": Multiline text area (call notes, discussion summary, clinical feedback)
- "checkbox": Multi-select checkboxes (must provide "options": string[])
- "radio": Radio buttons for mutually exclusive options (must provide "options": string[])
- "signature": Touch/mouse digital e-signature pad (ideal for doctor signoffs, chemist approvals, manager verification)
- "gps": Live geolocation capture with latitude/longitude (audit verification for clinic or chemist visits)
- "fileUpload": File or photo upload (receipts, clinic exterior photos, bills, prescription slips)
- "rating": 1 to 5 star rating (doctor brand preference, meeting satisfaction, product efficacy)
- "repeaterTable": Dynamic multi-row table (must provide "subFields": array of field configs with id, key, label, type, required, order)

Return a strictly valid JSON object matching this schema:
{
  "title": "string (Clean, professional, and descriptive form title)",
  "category": "string (e.g. Field Force Operations, Sales & POB, Clinical Feedback, Accounts & HR, Compliance, Chemist Audit)",
  "description": "string (Detailed overview explaining what this form captures)",
  "accessMode": "Internal" | "Public" | "PasswordProtected",
  "fields": [
    {
      "id": "string (unique identifier like field_1, field_2)",
      "key": "string (snake_case identifier)",
      "label": "string (clear human-friendly label)",
      "type": "text | number | date | select | textarea | checkbox | radio | signature | gps | fileUpload | rating | repeaterTable",
      "required": boolean,
      "placeholder": "string (optional helpful hint)",
      "options": ["string"] (required for select, radio, checkbox),
      "section": "string (logical grouping e.g. Doctor Information, Detailing & Samples, Audit Proof)",
      "order": number,
      "helpText": "string (optional guidance for field rep)",
      "subFields": [] (only required for repeaterTable)
    }
  ],
  "conditions": []
}`;

    const modelsToTry = [model, "gemini-2.5-flash", "gemini-flash-latest"];
    let parsedSchema: any = null;
    let modelSuccessfullyUsed = "";
    let lastErrorMeta: any = null;

    for (const currentModel of modelsToTry) {
      if (!currentModel) continue;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nUser Request: ${prompt}\n\nEnsure fields are comprehensive and include relevant pharma fields (e.g., Doctor/Chemist identification, live GPS verification, e-signature where appropriate). Return ONLY the JSON object.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`Gemini model ${currentModel} returned ${res.status}: ${errBody}`);
          lastErrorMeta = parseGeminiError(res.status, errBody, currentModel);

          // If rate limited or quota exhausted, no point hammering all other models repeatedly
          if (res.status === 429) {
            break;
          }
          continue; // Try next model in fallback list
        }

        const data = await res.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawJsonText) {
          lastErrorMeta = {
            title: "Empty Response",
            message: `Gemini model ${currentModel} returned empty text parts.`,
            hint: "Please retry with a more specific prompt.",
            status: 200,
          };
          continue;
        }

        parsedSchema = JSON.parse(rawJsonText);
        modelSuccessfullyUsed = currentModel;
        break; // Successfully got and parsed response!
      } catch (err: any) {
        console.warn(`Error trying model ${currentModel}:`, err.message);
        lastErrorMeta = {
          title: "Network / Connection Error",
          message: err.message || "Failed to establish connection with Google AI Studio.",
          hint: "Please check your internet connection.",
          status: 0,
        };
      }
    }

    if (!parsedSchema || !Array.isArray(parsedSchema.fields)) {
      console.warn("Gemini response was invalid or quota exceeded. Returning fallback schema. Last error:", lastErrorMeta);
      const fallbackSchema = getRuleBasedFallback(prompt);
      return NextResponse.json({
        success: true,
        source: "fallback",
        model: "rule-based",
        warning: lastErrorMeta || {
          title: "Gemini API Issue",
          message: "Google Gemini API was temporarily unreachable.",
          hint: "Loaded standard template via offline schema engine.",
          isQuota: false,
        },
        formSchema: fallbackSchema,
      });
    }

    // Sanitize and structure the schema fields
    const sanitizedFields = sanitizeFields(parsedSchema.fields);
    const sanitizedConditions = sanitizeConditions(parsedSchema.conditions);

    // Normalize accessMode to match Mongoose enum: ["Internal", "Public", "PasswordProtected"]
    let validAccessMode: "Internal" | "Public" | "PasswordProtected" = "Internal";
    const rawAccess = String(parsedSchema.accessMode || "").trim().toLowerCase();
    if (rawAccess.includes("public")) {
      validAccessMode = "Public";
    } else if (rawAccess.includes("password") || rawAccess.includes("pin") || rawAccess.includes("protected")) {
      validAccessMode = "PasswordProtected";
    } else {
      validAccessMode = "Internal";
    }

    const finalFormSchema = {
      title: parsedSchema.title || "Custom Pharma Form",
      category: parsedSchema.category || "Field Force Operations",
      description: parsedSchema.description || `Generated dynamic form based on: "${prompt}"`,
      accessMode: validAccessMode,
      fields: sanitizedFields,
      conditions: sanitizedConditions,
    };

    return NextResponse.json({
      success: true,
      source: "gemini",
      model: modelSuccessfullyUsed,
      formSchema: finalFormSchema,
    });
  } catch (err: any) {
    console.error("AI Form Generation Route Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to generate form schema with AI.",
        errorDetails: {
          title: "Server Route Exception",
          message: err.message,
          hint: "Check server console logs for details.",
        },
      },
      { status: 500 }
    );
  }
}
