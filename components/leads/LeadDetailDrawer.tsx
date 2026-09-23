"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

const ACTIVITY_ICONS: Record<string, string> = {
  "Call": "📞", "Field Visit": "🚶", "WhatsApp": "💬", "Email": "✉️",
  "SMS": "📱", "Sample Delivered": "🎁", "Quotation Sent": "📄",
  "Meeting": "🤝", "Demo": "🎯", "Follow-up": "🔔", "Stage Changed": "🔄",
  "Note": "📝", "System": "⚙️", "Other": "📌",
};
const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  "New":              { color: "#6366f1", bg: "#eef2ff" },
  "Contacted":        { color: "#0ea5e9", bg: "#f0f9ff" },
  "Qualified":        { color: "#8b5cf6", bg: "#f5f3ff" },
  "Sample Delivered": { color: "#f59e0b", bg: "#fffbeb" },
  "Quotation Shared": { color: "#f97316", bg: "#fff7ed" },
  "Negotiation":      { color: "#ec4899", bg: "#fdf2f8" },
  "Won":              { color: "#22c55e", bg: "#f0fdf4" },
  "Lost":             { color: "#ef4444", bg: "#fef2f2" },
  "Dropped":          { color: "#6b7280", bg: "#f9fafb" },
};
const ACTIVITY_TYPES = ["Call","Field Visit","WhatsApp","Email","SMS","Sample Delivered","Quotation Sent","Meeting","Demo","Follow-up","Note","Other"];
const STAGES = ["New","Contacted","Qualified","Sample Delivered","Quotation Shared","Negotiation","Won","Lost","Dropped"];

interface Props {
  lead: any;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: (lead: any) => void;
}

export default function LeadDetailDrawer({ lead: initialLead, onClose, onEdit, onDeleted, onUpdated }: Props) {
  const { user: currentUser } = useUser();
  const isAdmin = (() => {
    if (!currentUser) return false;
    const roleType = (currentUser.roleType || "").toUpperCase();
    const roleName = (currentUser.roleId?.roleName || currentUser.role || "").toLowerCase();
    return roleType === "ADMIN" || roleName.includes("admin") || roleName.includes("superadmin") || currentUser.isAdmin === true || currentUser.isSuperAdmin === true || !currentUser.roleType;
  })();
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingAct, setLoadingAct] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"activity">("overview");
  const [converting, setConverting] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [showActForm, setShowActForm] = useState(false);
  const [actForm, setActForm] = useState({ type: "Call", summary: "", outcome: "", nextActionDate: "", nextActionNote: "" });
  const [savingAct, setSavingAct] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => { fetchActivities(); }, [lead._id]);

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsersList(data);
        else if (data?.users) setUsersList(data.users);
      })
      .catch(() => {});
  }, []);

  const handleReassign = async (newUserId: string) => {
    if (!newUserId) return;
    const targetUser = usersList.find((u: any) => u._id === newUserId);
    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: newUserId,
          assignedToName: targetUser ? targetUser.name : "",
        }),
      });
      const data = await res.json();
      if (data.lead) {
        setLead(data.lead);
        onUpdated(data.lead);
        fetchActivities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    setLoadingAct(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}/activities`);
      const data = await res.json();
      setActivities(data.activities || []);
    } catch {} finally { setLoadingAct(false); }
  };

  const handleStageChange = async (newStage: string) => {
    setUpdatingStage(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      const data = await res.json();
      if (res.ok) { setLead(data.lead); onUpdated(data.lead); fetchActivities(); }
    } catch {} finally { setUpdatingStage(false); }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingAct(true);
    try {
      await fetch(`/api/leads/${lead._id}/activities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actForm),
      });
      setActForm({ type: "Call", summary: "", outcome: "", nextActionDate: "", nextActionNote: "" });
      setShowActForm(false); fetchActivities();
    } catch {} finally { setSavingAct(false); }
  };

  const handleConvert = async () => {
    if (!confirm(`Convert "${lead.partyName}" to Customer?`)) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}/convert`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) { setLead(data.lead); onUpdated(data.lead); fetchActivities(); alert("✅ Lead converted to Customer!"); }
    } catch {} finally { setConverting(false); }
  };

  const sc = STAGE_COLORS[lead.stage] || { color: "#6b7280", bg: "#f9fafb" };
  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date() && !["Won","Lost"].includes(lead.stage);

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "9px 12px", fontSize: 13, outline: "none", background: "#f8fafc",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const tabBtn = (t: string): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
    background: activeTab === t ? "#6366f1" : "transparent",
    color: activeTab === t ? "#fff" : "#64748b",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} />

      {/* Drawer */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 640, height: "100%",
        background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideIn 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", padding: "20px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.95)", color: sc.color }}>{lead.stage}</span>
                {lead.isConverted && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "#dcfce7", color: "#16a34a" }}>✅ Converted</span>}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.partyName}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{lead.leadNumber} • {lead.leadType}</p>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 12, flexShrink: 0 }}>
              <button onClick={onEdit} title="Edit" style={{
                width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)",
                border: "none", cursor: "pointer", color: "#fff", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✏️</button>
              <button onClick={onClose} style={{
                width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)",
                border: "none", cursor: "pointer", color: "#fff", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: 8, padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", flexShrink: 0, overflowX: "auto" }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 10, background: "#dbeafe", color: "#2563eb",
              textDecoration: "none", fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>📞 Call</a>
          )}
          {(lead.whatsapp || lead.phone) && (
            <a href={`https://wa.me/91${lead.whatsapp || lead.phone}`} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 10, background: "#dcfce7", color: "#16a34a",
              textDecoration: "none", fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>💬 WhatsApp</a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 10, background: "#ede9fe", color: "#7c3aed",
              textDecoration: "none", fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>✉️ Email</a>
          )}
          {/* Reassign Owner Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#eef2ff", borderRadius: 10, border: "1px solid #c7d2fe", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
              👤 {lead.assignedToName || lead.assignedTo?.name || "Unassigned"}
            </span>
            <select
              value={lead.assignedTo?._id || lead.assignedTo || ""}
              onChange={e => handleReassign(e.target.value)}
              style={{ fontSize: 11, border: "none", background: "transparent", cursor: "pointer", outline: "none", fontWeight: 700, color: "#3730a3" }}
            >
              <option value="">Reassign Owner...</option>
              {usersList.map((u: any) => (
                <option key={u._id} value={u._id}>{u.name} {u.roleType ? `(${u.roleType})` : ""}</option>
              ))}
            </select>
          </div>

          {!lead.isConverted && (
            <button onClick={handleConvert} disabled={converting} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
              borderRadius: 10, background: "#22c55e", color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto", flexShrink: 0,
            }}>{converting ? "Converting..." : "✅ Convert to Customer"}</button>
          )}
        </div>

        {/* Stage Selector */}
        <div style={{ padding: "12px 20px", background: "#fafafa", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Move to Stage</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STAGES.map(s => {
              const c = STAGE_COLORS[s] || { color: "#6b7280", bg: "#f9fafb" };
              const active = lead.stage === s;
              return (
                <button key={s} onClick={() => handleStageChange(s)}
                  disabled={updatingStage || active}
                  style={{
                    padding: "5px 12px", borderRadius: 8, cursor: active ? "default" : "pointer",
                    fontSize: 11, fontWeight: 700, border: `1px solid ${c.color}40`,
                    fontFamily: "inherit", transition: "all 0.15s",
                    background: active ? c.color : c.bg,
                    color: active ? "#fff" : c.color,
                    opacity: updatingStage && !active ? 0.6 : 1,
                  }}>{s}</button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
          <button style={tabBtn("overview")} onClick={() => setActiveTab("overview")}>📋 Overview</button>
          <button style={tabBtn("activity")} onClick={() => setActiveTab("activity")}>📅 Activity Log</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Follow-up Alert */}
              {lead.nextFollowUpDate && (
                <div style={{
                  display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14,
                  background: isOverdue ? "#fef2f2" : "#fffbeb",
                  border: `1px solid ${isOverdue ? "#fca5a5" : "#fcd34d"}`,
                }}>
                  <span style={{ fontSize: 22 }}>{isOverdue ? "⚠️" : "📅"}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: isOverdue ? "#dc2626" : "#d97706" }}>
                      {isOverdue ? "Overdue Follow-up!" : "Upcoming Follow-up"}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: isOverdue ? "#ef4444" : "#f59e0b" }}>
                      {new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      {lead.nextFollowUpNote ? ` — ${lead.nextFollowUpNote}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Lead Type",  value: lead.leadType,    icon: "🏷️" },
                  { label: "Speciality", value: lead.speciality || "—", icon: "🔬" },
                  { label: "Source",     value: lead.source,      icon: "📡" },
                  { label: "Priority",   value: lead.priority,    icon: "⚡" },
                  lead.estimatedMonthlyValue > 0 && { label: "Monthly Value", value: `₹${Number(lead.estimatedMonthlyValue).toLocaleString("en-IN")}`, icon: "💰" },
                  lead.estimatedDealValue > 0 && { label: "Deal Value", value: `₹${Number(lead.estimatedDealValue).toLocaleString("en-IN")}`, icon: "🤝" },
                  lead.city && { label: "Location", value: `${lead.city}${lead.state ? ", " + lead.state : ""}`, icon: "📍" },
                  lead.phone && { label: "Phone", value: lead.phone, icon: "📞" },
                  lead.gstin && { label: "GSTIN", value: lead.gstin, icon: "🏢" },
                  lead.dlNumber && { label: "Drug License", value: lead.dlNumber, icon: "💊" },
                  lead.creditTermsRequested && { label: "Credit Terms", value: lead.creditTermsRequested, icon: "🏦" },
                  lead.assignedTo?.name && { label: "Assigned To", value: lead.assignedTo.name, icon: "👤" },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.icon} {item.label}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Interested Products */}
              {lead.interestedProducts?.length > 0 && (
                <div style={{ background: "#eff6ff", borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#2563eb" }}>💊 Interested Products</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {lead.interestedProducts.map((p: string, i: number) => (
                      <span key={i} style={{ fontSize: 12, background: "#dbeafe", color: "#2563eb", padding: "4px 12px", borderRadius: 8, fontWeight: 600 }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {lead.tags?.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Tags</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {lead.tags.map((t: string) => (
                      <span key={t} style={{ fontSize: 13, background: "#eef2ff", color: "#6366f1", padding: "4px 14px", borderRadius: 20, fontWeight: 600 }}>#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {lead.internalNotes && (
                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#d97706" }}>📝 Internal Notes</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>{lead.internalNotes}</p>
                </div>
              )}

              {/* Conversion */}
              {lead.isConverted && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#16a34a" }}>✅ Converted to Customer</p>
                  {lead.convertedAt && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#22c55e" }}>On {new Date(lead.convertedAt).toLocaleDateString("en-IN")}</p>}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Add Activity Button */}
              <button onClick={() => setShowActForm(!showActForm)} style={{
                width: "100%", padding: "12px", borderRadius: 14,
                border: "2px dashed #c7d2fe", background: "#f8faff",
                color: "#6366f1", fontWeight: 600, fontSize: 14, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                {showActForm ? "▲ Cancel" : "+ Log New Activity"}
              </button>

              {/* Activity Form */}
              {showActForm && (
                <form onSubmit={handleAddActivity} style={{ background: "#eef2ff", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Activity Type</p>
                      <select style={inp} value={actForm.type} onChange={e => setActForm(p => ({ ...p, type: e.target.value }))}>
                        {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Outcome</p>
                      <input style={inp} placeholder="e.g. Interested, Callback" value={actForm.outcome} onChange={e => setActForm(p => ({ ...p, outcome: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Summary *</p>
                    <textarea style={{ ...inp, height: 80, resize: "vertical" as const }}
                      placeholder="What happened? What was discussed?"
                      value={actForm.summary} onChange={e => setActForm(p => ({ ...p, summary: e.target.value }))} required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Next Follow-up</p>
                      <input style={inp} type="date" value={actForm.nextActionDate} onChange={e => setActForm(p => ({ ...p, nextActionDate: e.target.value }))} />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Follow-up Note</p>
                      <input style={inp} placeholder="What to do next" value={actForm.nextActionNote} onChange={e => setActForm(p => ({ ...p, nextActionNote: e.target.value }))} />
                    </div>
                  </div>
                  <button type="submit" disabled={savingAct} style={{
                    padding: "11px", borderRadius: 12, background: "#6366f1", color: "#fff",
                    border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  }}>{savingAct ? "Saving..." : "✅ Save Activity"}</button>
                </form>
              )}

              {/* Timeline */}
              {loadingAct ? (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0" }}>Loading activities...</p>
              ) : activities.length === 0 ? (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0" }}>No activities yet. Log the first one!</p>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 20, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {activities.map((act) => (
                      <div key={act._id} style={{ display: "flex", gap: 14, position: "relative" }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 14, background: "#fff",
                          border: "2px solid #e2e8f0", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 18, flexShrink: 0, zIndex: 1,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}>{ACTIVITY_ICONS[act.type] || "📌"}</div>
                        <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{act.type}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                              {new Date(act.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {act.summary && <p style={{ margin: "0 0 4px", fontSize: 13, color: "#475569" }}>{act.summary}</p>}
                          {act.outcome && <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Outcome: {act.outcome}</p>}
                          {act.fromStage && act.toStage && (
                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{act.fromStage} → {act.toStage}</p>
                          )}
                          {act.nextActionDate && (
                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                              📅 {new Date(act.nextActionDate).toLocaleDateString("en-IN")}{act.nextActionNote ? ` — ${act.nextActionNote}` : ""}
                            </p>
                          )}
                          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>by {act.userName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Created: {new Date(lead.createdAt).toLocaleDateString("en-IN")}</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Updated: {new Date(lead.updatedAt).toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
