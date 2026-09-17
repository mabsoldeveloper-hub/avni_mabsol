import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FormTemplate from "@/models/FormTemplate";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: any = {};
    if (category && category !== "All") query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { formId: { $regex: search, $options: "i" } },
      ];
    }

    const templates = await FormTemplate.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      templates,
      total: templates.length,
    });
  } catch (error: any) {
    console.error("Error fetching form templates:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      title,
      description,
      category,
      fields,
      status,
      icon,
      isMultiStep,
      steps,
      conditions,
      accessMode,
      accessPin,
      approvalWorkflow,
      autoMasterSync,
      theme,
      expirationConfig,
      thankYouConfig,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Form Title is required" },
        { status: 400 }
      );
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one form field is required" },
        { status: 400 }
      );
    }

    // Generate unique formId slug
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const formId = `${cleanTitle}-${Date.now().toString(36)}`;

    // Process fields
    const processedFields = fields.map((f: any, idx: number) => ({
      id: f.id || `field_${idx}_${Date.now().toString(36)}`,
      key: f.key || (f.label ? f.label.toLowerCase().replace(/[^a-z0-9_]/g, "_") : `field_${idx}`),
      label: f.label || `Field ${idx + 1}`,
      type: f.type || "text",
      required: !!f.required,
      placeholder: f.placeholder || "",
      options: Array.isArray(f.options) ? f.options : [],
      mappedTable: f.mappedTable || "",
      mappedField: f.mappedField || "",
      defaultValue: f.defaultValue || "",
      order: typeof f.order === "number" ? f.order : idx,
      section: f.section || "General Details",
      stepId: f.stepId || "step_1",
      helpText: f.helpText || "",
    }));

    const newTemplate = await FormTemplate.create({
      formId,
      title: title.trim(),
      description: description ? description.trim() : "",
      category: category ? category.trim() : "General",
      status: status || "Active",
      icon: icon || "FaClipboardList",
      fields: processedFields,
      isMultiStep: !!isMultiStep,
      steps: Array.isArray(steps) ? steps : [],
      conditions: Array.isArray(conditions) ? conditions : [],
      accessMode: ["Internal", "Public", "PasswordProtected"].includes(accessMode)
        ? accessMode
        : (String(accessMode || "").toLowerCase().includes("public") ? "Public" : (String(accessMode || "").toLowerCase().includes("password") ? "PasswordProtected" : "Internal")),
      accessPin: accessPin || "",
      approvalWorkflow: approvalWorkflow || { enabled: false, approverRole: "Admin" },
      autoMasterSync: autoMasterSync || { enabled: false, targetModel: "" },
      theme: theme || { accentColor: "#4f46e5", logoUrl: "", headerBanner: "" },
      expirationConfig: expirationConfig || { expiresAt: null, maxSubmissions: 0 },
      thankYouConfig: thankYouConfig || { title: "Thank You!", message: "Your response has been successfully recorded." },
    });

    return NextResponse.json({
      success: true,
      message: "Form Template created successfully",
      template: newTemplate,
    });
  } catch (error: any) {
    console.error("Error creating form template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
