import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FormTemplate from "@/models/FormTemplate";
import { getCurrentUser } from "@/lib/auth";
import { escapeRegex } from "@/app/api/_utils/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: any = {};
    if (category && category !== "All") query.category = category;
    if (status) query.status = status;
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { formId: { $regex: escaped, $options: "i" } },
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

const BLOCKED_TARGET_MODELS = new Set(["user", "users", "role", "roles", "session", "sessions", "otp", "otps", "vfptablemap", "vfpsyncstate"]);

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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

    if (autoMasterSync?.enabled && autoMasterSync?.targetModel) {
      if (BLOCKED_TARGET_MODELS.has(String(autoMasterSync.targetModel).toLowerCase().trim())) {
        return NextResponse.json({ success: false, error: "Target model is restricted" }, { status: 400 });
      }
    }

    // Generate unique formId slug
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const formId = `${cleanTitle}-${Date.now().toString(36)}`;

    const template = await FormTemplate.create({
      formId,
      title: title.trim(),
      description: description || "",
      category: category || "General",
      fields: fields.map((f: any, idx: number) => ({
        ...f,
        order: f.order ?? idx,
      })),
      status: status || "Active",
      icon: icon || "FileText",
      isMultiStep: !!isMultiStep,
      steps: steps || [],
      conditions: conditions || [],
      accessMode: accessMode || "Public",
      accessPin: accessPin || "",
      approvalWorkflow: approvalWorkflow || { enabled: false },
      autoMasterSync: autoMasterSync || { enabled: false },
      theme: theme || { primaryColor: "#6366f1" },
      expirationConfig: expirationConfig || {},
      thankYouConfig: thankYouConfig || {},
      createdBy: user.name || "Administrator",
    });

    return NextResponse.json({
      success: true,
      message: "Form Template created successfully",
      template,
    });
  } catch (error: any) {
    console.error("Error creating form template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
