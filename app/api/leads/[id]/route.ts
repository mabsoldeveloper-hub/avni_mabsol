import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import "@/models/User";
import "@/models/AreaMaster";
import "@/models/Company";

export const dynamic = "force-dynamic";

// ─── GET: Single lead details + activity history ──────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const lead = await Lead.findById(id)
      .populate("assignedTo", "name email mobile roleType designation")
      .populate("areaId", "areaName")
      .lean();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const activities = await LeadActivity.find({ leadId: id })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ lead, activities });
  } catch (error: any) {
    console.error("[LEAD GET ID]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function checkIsAdmin(user: any) {
  if (!user) return false;
  const roleType = (user.roleType || "").toUpperCase();
  const roleName = (user.roleId?.roleName || user.role || "").toLowerCase();

  if (roleType === "MR" || roleType === "RSM" || roleType === "ZSM" || roleName === "employee") {
    return false;
  }

  return (
    roleType === "ADMIN" ||
    roleType === "Admin" ||
    roleName.includes("admin") ||
    roleName.includes("superadmin") ||
    user.isAdmin === true ||
    user.isSuperAdmin === true ||
    !user.roleType
  );
}

// ─── PATCH: Update lead (stage, priority, assignment, etc.) ──────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const prevLead = await Lead.findById(id);
    if (!prevLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    // Handle assignment change before update
    if (body.assignedTo && String(body.assignedTo) !== String(prevLead.assignedTo)) {
      const User = (await import("@/models/User")).default;
      const targetUser = await User.findById(body.assignedTo).lean();
      if (targetUser) {
        body.assignedToName = targetUser.name;
        body.assignedAt = new Date();
      }
      await LeadActivity.create({
        leadId: id,
        userId: user._id,
        userName: user.name,
        type: "System",
        summary: `🔄 Lead reassigned to ${targetUser?.name || body.assignedToName || "new rep"} by ${user.name}`,
      });
    }

    // Update the lead
    const updated = await Lead.findByIdAndUpdate(id, { $set: body }, { new: true })
      .populate("assignedTo", "name email mobile roleType")
      .lean();

    // Log stage change
    if (body.stage && body.stage !== prevLead.stage) {
      await LeadActivity.create({
        leadId: id,
        userId: user._id,
        userName: user.name,
        type: "Stage Changed",
        fromStage: prevLead.stage,
        toStage: body.stage,
        summary: `Stage changed from "${prevLead.stage}" to "${body.stage}"`,
      });
    }

    return NextResponse.json({ lead: updated });
  } catch (error: any) {
    console.error("[LEAD PATCH ID]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Archive / delete lead ───────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await Lead.findByIdAndDelete(id);
    await LeadActivity.deleteMany({ leadId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LEAD DELETE ID]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
