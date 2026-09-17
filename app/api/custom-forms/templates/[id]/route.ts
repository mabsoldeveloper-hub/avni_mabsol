import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FormTemplate from "@/models/FormTemplate";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const template = await FormTemplate.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { formId: id }],
    }).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Form Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error fetching single form template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Props
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const template = await FormTemplate.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { formId: id }],
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Form Template not found" },
        { status: 404 }
      );
    }

    if (body.title) template.title = body.title.trim();
    if (body.description !== undefined) template.description = body.description.trim();
    if (body.category) template.category = body.category.trim();
    if (body.status) template.status = body.status;
    if (body.icon) template.icon = body.icon;

    if (body.isMultiStep !== undefined) template.isMultiStep = !!body.isMultiStep;
    if (Array.isArray(body.steps)) template.steps = body.steps;
    if (body.accessMode) {
      template.accessMode = ["Internal", "Public", "PasswordProtected"].includes(body.accessMode)
        ? body.accessMode
        : (String(body.accessMode).toLowerCase().includes("public") ? "Public" : (String(body.accessMode).toLowerCase().includes("password") ? "PasswordProtected" : "Internal"));
    }
    if (body.approvalWorkflow) template.approvalWorkflow = body.approvalWorkflow;
    if (body.autoMasterSync) template.autoMasterSync = body.autoMasterSync;
    if (body.theme) template.theme = body.theme;
    if (body.expirationConfig !== undefined) template.expirationConfig = body.expirationConfig;
    if (body.thankYouConfig !== undefined) template.thankYouConfig = body.thankYouConfig;

    if (body.fields && Array.isArray(body.fields)) {
      template.fields = body.fields.map((f: any, idx: number) => ({
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
    }

    await template.save();

    return NextResponse.json({
      success: true,
      message: "Form Template updated successfully",
      template,
    });
  } catch (error: any) {
    console.error("Error updating form template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Props
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deleted = await FormTemplate.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { formId: id }],
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Form Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Form Template deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting form template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
