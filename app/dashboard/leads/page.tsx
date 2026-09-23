"use client";
import { useState, useEffect, useCallback } from "react";
import LeadKanbanBoard from "@/components/leads/LeadKanbanBoard";
import LeadTable from "@/components/leads/LeadTable";
import LeadFormModal from "@/components/leads/LeadFormModal";
import LeadDetailDrawer from "@/components/leads/LeadDetailDrawer";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useUser } from "@/context/UserContext";

const STAGE_OPTIONS   = ["All","New","Contacted","Qualified","Sample Delivered","Quotation Shared","Negotiation","Won","Lost","Dropped"];
const LEAD_TYPE_OPT   = ["All","Doctor","Chemist/Retailer","Hospital/Nursing Home","Stockist/Distributor","Export/International","B2B Bulk Buyer","Direct/OTC Customer","Franchise Inquiry","Generic Store","Other"];
const PRIORITY_OPT    = ["All","Urgent","High","Medium","Low"];
const SOURCE_OPT      = ["All","Field Visit","IndiaMART","TradeIndia","JustDial","Facebook Ads","Google Ads","WhatsApp Inquiry","Email Inquiry","Reference/Referral","Website Form","Exhibition/Trade Show","Cold Call","Walk-in","Other"];

const KPI_CONFIG = [
  { key: "totalLeads",      label: "Total Leads",     emoji: "🎯", color: "#6366f1", bg: "#eef2ff" },
  { key: "pipelineValue",   label: "Pipeline Value",  emoji: "💰", color: "#22c55e", bg: "#f0fdf4", format: (v: number) => `₹${(v/1000).toFixed(0)}k` },
  { key: "wonLeads",        label: "Won Leads",       emoji: "🏆", color: "#10b981", bg: "#ecfdf5" },
  { key: "newThisMonth",    label: "This Month",      emoji: "🔥", color: "#f97316", bg: "#fff7ed" },
  { key: "overdueFollowUps",label: "Overdue",         emoji: "⏰", color: "#ef4444", bg: "#fef2f2" },
  { key: "convertedLeads",  label: "Converted",       emoji: "⭐", color: "#8b5cf6", bg: "#f5f3ff" },
];

export default function LeadsPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const { user: currentUser } = useUser();
  const isAdmin = (() => {
    if (!currentUser) return false;
    const roleType = (currentUser.roleType || "").toUpperCase();
    const roleName = (currentUser.roleId?.roleName || currentUser.role || "").toLowerCase();
    return roleType === "ADMIN" || roleName.includes("admin") || roleName.includes("superadmin") || currentUser.isAdmin === true || currentUser.isSuperAdmin === true || !currentUser.roleType;
  })();
  const [view, setView]           = useState<"kanban"|"table">("kanban");
  const [leads, setLeads]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [search, setSearch]       = useState("");
  const [stageFilter, setStageFilter]     = useState("All");
  const [typeFilter, setTypeFilter]       = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sourceFilter, setSourceFilter]   = useState("All");
  const [assignedToFilter, setAssignedToFilter] = useState("All");
  const [usersList, setUsersList]         = useState<any[]>([]);
  const [showFilters, setShowFilters]     = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingLead, setEditingLead]     = useState<any>(null);
  const [detailLead, setDetailLead]       = useState<any>(null);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsersList(data);
        else if (data?.users) setUsersList(data.users);
      })
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: "500" });
      if (selectedCompany?._id) p.set("companyId", selectedCompany._id);
      if (selectedFY?._id) p.set("fyId", selectedFY._id);
      if (stageFilter !== "All") p.set("stage", stageFilter);
      if (typeFilter !== "All") p.set("leadType", typeFilter);
      if (priorityFilter !== "All") p.set("priority", priorityFilter);
      if (sourceFilter !== "All") p.set("source", sourceFilter);
      if (assignedToFilter !== "All") p.set("assignedTo", assignedToFilter);
      if (search.trim()) p.set("search", search.trim());
      const res = await fetch(`/api/leads?${p}`, { cache: "no-store" });
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {} finally { setLoading(false); }
  }, [stageFilter, typeFilter, priorityFilter, sourceFilter, assignedToFilter, search, selectedCompany?._id, selectedFY?._id]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (selectedCompany?._id) p.set("companyId", selectedCompany._id);
      if (selectedFY?._id) p.set("fyId", selectedFY._id);
      if (assignedToFilter !== "All") p.set("assignedTo", assignedToFilter);
      const res = await fetch(`/api/leads/analytics?${p}`, { cache: "no-store" });
      setAnalytics(await res.json());
    } catch {}
  }, [selectedCompany?._id, selectedFY?._id, assignedToFilter]);

  useEffect(() => { fetchLeads(); fetchAnalytics(); }, [fetchLeads, fetchAnalytics]);

  const handleStageChange = async (leadId: string, newStage: string) => {
    await fetch(`/api/leads/${leadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
    setLeads(prev => prev.map(l => l._id === leadId ? { ...l, stage: newStage } : l));
    fetchAnalytics();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads(prev => prev.filter(l => l._id !== id));
    if (detailLead?._id === id) setDetailLead(null);
    fetchAnalytics();
  };
  const handleSaved = (lead: any) => {
    if (editingLead?._id) setLeads(prev => prev.map(l => l._id === lead._id ? lead : l));
    else setLeads(prev => [lead, ...prev]);
    setShowForm(false); setEditingLead(null); fetchAnalytics(); fetchLeads();
  };
  const handleUpdated = (lead: any) => {
    setLeads(prev => prev.map(l => l._id === lead._id ? lead : l));
    setDetailLead(lead); fetchAnalytics();
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(prev => prev.length === leads.length ? [] : leads.map(l => l._id));
  const handleBulkStage = async (newStage: string) => {
    await Promise.all(selectedIds.map(id => fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) })));
    setLeads(prev => prev.map(l => selectedIds.includes(l._id) ? { ...l, stage: newStage } : l));
    setSelectedIds([]); fetchAnalytics();
  };

  const sum = analytics?.summary;
  const hasFilters = stageFilter !== "All" || typeFilter !== "All" || priorityFilter !== "All" || sourceFilter !== "All";
  const totalValue = leads.reduce((s, l) => s + (l.estimatedMonthlyValue || 0), 0);

  const selStyle: React.CSSProperties = {
    padding: "9px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12,
    background: "#f8fafc", fontSize: 13, outline: "none", cursor: "pointer",
    fontFamily: "inherit", color: "#374151",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #ffffff 50%, #f0f4ff 100%)", padding: "24px 20px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
            🎯 Lead Management Hub
            {loading && <span style={{ width: 20, height: 20, border: "3px solid #c7d2fe", borderTopColor: "#6366f1", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
            Track, manage &amp; convert every lead — Doctors, Chemists, Stockists, Hospitals &amp; more
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => { fetchLeads(); fetchAnalytics(); }} style={{
            width: 40, height: 40, borderRadius: 12, border: "1.5px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Refresh">🔄</button>
          <button onClick={() => { setEditingLead(null); setShowForm(true); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 22px",
            borderRadius: 14, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff", fontWeight: 700, fontSize: 14,
            boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
          }}>+ Add Lead</button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {sum && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          {KPI_CONFIG.map(({ key, label, emoji, color, bg, format }) => {
            const val = sum[key] ?? 0;
            return (
              <div key={key} style={{
                background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0",
                padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: bg, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color }}>{format ? format(val) : val}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", padding: 16, marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
            <input
              style={{ ...selStyle, paddingLeft: 36, width: "100%", boxSizing: "border-box" }}
              placeholder="Search name, phone, GSTIN, city..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>✕</button>}
          </div>

          <select style={selStyle} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>)}
          </select>
          <select style={selStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {LEAD_TYPE_OPT.map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>

          {usersList.length > 0 && (
            <select style={selStyle} value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)}>
              <option value="All">All Owners (Users)</option>
              {usersList.map((u: any) => (
                <option key={u._id} value={u._id}>👤 {u.name} {u.roleType ? `(${u.roleType})` : ""}</option>
              ))}
            </select>
          )}

          <button onClick={() => setShowFilters(!showFilters)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            borderRadius: 12, border: `1.5px solid ${hasFilters ? "#6366f1" : "#e2e8f0"}`,
            background: hasFilters ? "#eef2ff" : "#fff", color: hasFilters ? "#6366f1" : "#64748b",
            cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit",
          }}>
            🔧 Filters {hasFilters && "●"}
          </button>

          {/* View Toggle */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, gap: 2 }}>
            {(["kanban","table"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s",
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "#6366f1" : "#64748b",
                boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>
                {v === "kanban" ? "⊞ Kanban" : "☰ Table"}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Priority</p>
              <select style={selStyle} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                {PRIORITY_OPT.map(p => <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>)}
              </select>
            </div>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Lead Source</p>
              <select style={selStyle} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                {SOURCE_OPT.map(s => <option key={s} value={s}>{s === "All" ? "All Sources" : s}</option>)}
              </select>
            </div>
            <button onClick={() => { setStageFilter("All"); setTypeFilter("All"); setPriorityFilter("All"); setSourceFilter("All"); setSearch(""); setShowFilters(false); }}
              style={{ padding: "9px 18px", borderRadius: 12, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
              ✕ Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk Actions ── */}
      {selectedIds.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 16,
          marginBottom: 16, color: "#fff", flexWrap: "wrap",
        }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedIds.length} leads selected</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Move to:</span>
          {["Contacted","Qualified","Sample Delivered","Won","Lost"].map(s => (
            <button key={s} onClick={() => handleBulkStage(s)} style={{
              padding: "5px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600,
              fontSize: 12, fontFamily: "inherit",
            }}>{s}</button>
          ))}
          <button onClick={() => setSelectedIds([])} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18,
          }}>✕</button>
        </div>
      )}

      {/* ── Summary Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, fontSize: 13, color: "#64748b" }}>
        <span>Showing <strong style={{ color: "#0f172a" }}>{leads.length}</strong> leads{hasFilters ? " (filtered)" : ""}</span>
        {leads.length > 0 && (
          <span>Total Est.: <strong style={{ color: "#16a34a" }}>₹{totalValue.toLocaleString("en-IN")}/mo</strong></span>
        )}
      </div>

      {/* ── Main Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", color: "#94a3b8" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #e0e7ff", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Loading leads...</p>
        </div>
      ) : view === "kanban" ? (
        <LeadKanbanBoard leads={leads}
          onEdit={(lead) => { setEditingLead(lead); setShowForm(true); }}
          onDelete={handleDelete}
          onOpenDetail={setDetailLead}
          onStageChange={handleStageChange}
        />
      ) : (
        <LeadTable leads={leads}
          onEdit={(lead) => { setEditingLead(lead); setShowForm(true); }}
          onDelete={handleDelete}
          onOpenDetail={setDetailLead}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
        />
      )}

      {/* ── Modals ── */}
      {showForm && (
        <LeadFormModal
          initialData={editingLead}
          onClose={() => { setShowForm(false); setEditingLead(null); }}
          onSaved={handleSaved}
          activeCompanyId={selectedCompany?._id}
          activeFyId={selectedFY?._id}
          activeFyCode={selectedFY?.fyCode}
        />
      )}
      {detailLead && (
        <LeadDetailDrawer
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onEdit={() => { setEditingLead(detailLead); setShowForm(true); }}
          onDeleted={() => { handleDelete(detailLead._id); setDetailLead(null); }}
          onUpdated={handleUpdated}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
