"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaUserTie,
  FaSitemap,
  FaBuilding,
  FaUserCheck,
  FaSearch,
  FaPlus,
  FaTrashAlt,
  FaSave,
  FaArrowLeft,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronRight,
  FaUsers,
  FaCrown,
  FaCheckSquare,
  FaSquare,
  FaTag,
  FaThLarge,
  FaList,
  FaLayerGroup,
  FaFilter,
  FaShieldAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  roleId?: { _id: string; roleName: string } | any;
  roleType?: string;
  reportsTo?: any;
  profilePhoto?: string;
  salesHierarchy?: {
    reportsTo?: string;
    reportsToName?: string;
    roleLevel?: string;
    state?: string;
    zone?: string;
    region?: string;
    territory?: string;
    assignedCompanyCodes?: string[];
    assignedDivisionCodes?: string[];
    notes?: string;
  };
}

interface RoleItem {
  _id: string;
  roleName: string;
  description?: string;
  status?: string;
}

interface CompanyItem {
  _id: string;
  companyCode: string;
  companyName: string;
}

interface DivisionItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  divisionName: string;
}

interface SubDivisionItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  subDivisionCode: string;
  subDivisionName: string;
}

interface CategoryItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  subDivisionCode: string;
  categoryCode: string;
  categoryName: string;
}

interface CustomerOption {
  uniqueId: string;
  code: string;
  name: string;
  city?: string;
  area?: string;
}

interface TerritoryScopeItem {
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  subDivisionCode?: string;
  subDivisionName?: string;
  categoryCode?: string;
  categoryName?: string;
  notes?: string;
}

export default function UserAssignmentWorkbenchPage() {
  // Master Data States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [dynamicRoles, setDynamicRoles] = useState<RoleItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [subDivisions, setSubDivisions] = useState<SubDivisionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);

  // Main Page View Mode: "bulk-hierarchy" (Role Selection & Checkboxes) vs "workbench" (Individual 360°)
  const [viewMode, setViewMode] = useState<"bulk-hierarchy" | "workbench">("bulk-hierarchy");

  // Loading & Saving States
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =========================================================================
  // STATE FOR ROLE-BASED BULK HIERARCHY ASSIGNMENT
  // =========================================================================
  const [activeRole, setActiveRole] = useState<string>(""); // Selected Role Type ("" = All Roles)
  const [bulkSearch, setBulkSearch] = useState<string>(""); // Search users within role
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table"); // Grid vs Table
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<Set<string>>(new Set());

  // Higher Designation Assignment Form
  const [targetManagerId, setTargetManagerId] = useState<string>("");
  const [managerRoleFilter, setManagerRoleFilter] = useState<string>("");
  const [bulkState, setBulkState] = useState<string>("");
  const [bulkZone, setBulkZone] = useState<string>("");
  const [bulkRegion, setBulkRegion] = useState<string>("");
  const [bulkTerritory, setBulkTerritory] = useState<string>("");

  // =========================================================================
  // STATE FOR INDIVIDUAL EXECUTIVE WORKBENCH
  // =========================================================================
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"hierarchy" | "scope" | "parties" | "summary">("hierarchy");

  // Workbench Tab 1: Hierarchy State
  const [roleLevel, setRoleLevel] = useState<string>("MR");
  const [reportsTo, setReportsTo] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [zoneName, setZoneName] = useState<string>("");
  const [regionName, setRegionName] = useState<string>("");
  const [territoryName, setTerritoryName] = useState<string>("");
  const [hierarchyNotes, setHierarchyNotes] = useState<string>("");
  const [directReports, setDirectReports] = useState<any[]>([]);

  // Workbench Tab 2: Scope State
  const [assignedScopes, setAssignedScopes] = useState<TerritoryScopeItem[]>([]);
  const [newScopeCompanyCode, setNewScopeCompanyCode] = useState<string>("");
  const [newScopeDivisionCode, setNewScopeDivisionCode] = useState<string>("");
  const [newScopeSubDivisionCode, setNewScopeSubDivisionCode] = useState<string>("");
  const [newScopeCategoryCode, setNewScopeCategoryCode] = useState<string>("");

  // Workbench Tab 3: Party Assignment State
  const [partySearch, setPartySearch] = useState("");
  const [selectedCustomerKeys, setSelectedCustomerKeys] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------
  // Initial Data Fetching
  // -------------------------------------------------------------
  useEffect(() => {
    fetchAllMasters();
  }, []);

  async function fetchAllMasters() {
    setLoadingUsers(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchCompanies(),
        fetchDivisions(),
        fetchSubDivisions(),
        fetchCategories(),
        fetchCustomers(),
      ]);
    } catch {
      setError("Error initializing assignment workbench.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success || Array.isArray(json)) {
        const list = Array.isArray(json) ? json : json.users || json.data || [];
        setUsers(list);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }

  async function fetchRoles() {
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (Array.isArray(json)) {
        setDynamicRoles(json);
      } else if (json.data && Array.isArray(json.data)) {
        setDynamicRoles(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch dynamic roles", e);
    }
  }

  async function fetchCompanies() {
    const res = await fetch("/api/master/fetch-company-master");
    const json = await res.json();
    if (json.success) setCompanies(json.data || []);
  }

  async function fetchDivisions() {
    const res = await fetch("/api/division-master");
    const json = await res.json();
    if (json.success) setDivisions(json.data || []);
  }

  async function fetchSubDivisions() {
    const res = await fetch("/api/sub-division-master");
    const json = await res.json();
    if (json.success) setSubDivisions(json.data || []);
  }

  async function fetchCategories() {
    const res = await fetch("/api/category-master");
    const json = await res.json();
    if (json.success) setCategories(json.data || []);
  }

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/reports/customer?report=master&limit=5000");
      const json = await res.json();
      if (json.success && json.data?.rows) {
        const list = json.data.rows.map((c: any, index: number) => {
          const code = (c.CODEP || c.CODE || c.ORDNO || "").toString().trim();
          const name = (c.PARNAM || c.customerName || "Unknown Party").toString().trim();
          const city = (c.CITY || "").toString().trim();
          const area = (c.AREA || "").toString().trim();
          return {
            uniqueId: `${code || "nocode"}_${name}_${index}`,
            code,
            name,
            city,
            area,
          };
        });
        setAllCustomers(list);
      }
    } catch (e) {
      console.error("Failed to load party list", e);
    }
  }

  // -------------------------------------------------------------
  // Derived Role List & Count Calculation
  // -------------------------------------------------------------
  const roleListWithCounts = useMemo(() => {
    const roleCountMap = new Map<string, number>();
    const knownRoles = new Set<string>();

    // Add roles from Role Master
    dynamicRoles.forEach((r) => {
      const name = r.roleName.trim();
      if (name) {
        knownRoles.add(name);
        roleCountMap.set(name, 0);
      }
    });

    // Count users in each role
    users.forEach((u) => {
      const r = (
        typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Other"
      ).trim();
      if (r) {
        knownRoles.add(r);
        roleCountMap.set(r, (roleCountMap.get(r) || 0) + 1);
      }
    });

    return Array.from(knownRoles).map((roleName) => ({
      name: roleName,
      count: roleCountMap.get(roleName) || 0,
    }));
  }, [dynamicRoles, users]);

  // Total User Count
  const totalUserCount = users.length;

  // -------------------------------------------------------------
  // Filtered Users for Role-Based Bulk Hierarchy Assignment
  // -------------------------------------------------------------
  const filteredRoleUsers = useMemo(() => {
    return users.filter((u) => {
      const userRole = (
        typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Other"
      ).trim();

      // Role filter
      if (activeRole && userRole.toLowerCase() !== activeRole.toLowerCase()) {
        return false;
      }

      // Search filter
      const q = bulkSearch.trim().toLowerCase();
      if (q) {
        const nameMatch = u.name.toLowerCase().includes(q);
        const codeMatch = u.employeeCode ? u.employeeCode.toLowerCase().includes(q) : false;
        const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
        const managerMatch =
          (u.reportsTo?.name && u.reportsTo.name.toLowerCase().includes(q)) ||
          (u.salesHierarchy?.reportsToName && u.salesHierarchy.reportsToName.toLowerCase().includes(q));
        const territoryMatch =
          u.salesHierarchy?.territory && u.salesHierarchy.territory.toLowerCase().includes(q);

        if (!nameMatch && !codeMatch && !emailMatch && !managerMatch && !territoryMatch) {
          return false;
        }
      }

      // Assignment status filter
      const hasManager = Boolean(
        u.reportsTo?._id || u.reportsTo || u.salesHierarchy?.reportsTo || u.salesHierarchy?.reportsToName
      );
      if (assignmentFilter === "assigned" && !hasManager) return false;
      if (assignmentFilter === "unassigned" && hasManager) return false;

      return true;
    });
  }, [users, activeRole, bulkSearch, assignmentFilter]);

  // Checkbox helpers for Bulk Assignment
  function toggleUserSelection(userId: string) {
    setSelectedBulkUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function handleSelectAllVisible() {
    setSelectedBulkUserIds((prev) => {
      const next = new Set(prev);
      filteredRoleUsers.forEach((u) => next.add(u._id));
      return next;
    });
  }

  function handleDeselectAllVisible() {
    setSelectedBulkUserIds((prev) => {
      const next = new Set(prev);
      filteredRoleUsers.forEach((u) => next.delete(u._id));
      return next;
    });
  }

  function handleClearAllSelections() {
    setSelectedBulkUserIds(new Set());
  }

  const isAllVisibleSelected =
    filteredRoleUsers.length > 0 &&
    filteredRoleUsers.every((u) => selectedBulkUserIds.has(u._id));

  // Eligible Higher Designation Managers
  const eligibleManagers = useMemo(() => {
    return users.filter((u) => {
      // Cannot assign users to report to one of the currently selected users (prevent loops)
      if (selectedBulkUserIds.has(u._id)) return false;

      const r = (
        typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || ""
      ).trim();

      if (managerRoleFilter && r.toLowerCase() !== managerRoleFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [users, selectedBulkUserIds, managerRoleFilter]);

  // -------------------------------------------------------------
  // Bulk Assign Action: Assign to Higher Designation
  // -------------------------------------------------------------
  async function handleExecuteBulkAssign(reportsToId: string | null) {
    if (selectedBulkUserIds.size === 0) {
      setError("Please select at least one user from the grid using the checkboxes.");
      return;
    }

    if (reportsToId === undefined) {
      setError("Please select a higher designation reporting manager.");
      return;
    }

    setBulkAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        userIds: Array.from(selectedBulkUserIds),
        reportsTo: reportsToId || null,
        state: bulkState.trim() || undefined,
        zone: bulkZone.trim() || undefined,
        region: bulkRegion.trim() || undefined,
        territory: bulkTerritory.trim() || undefined,
      };

      const res = await fetch("/api/users/assignment/bulk-hierarchy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(json.message || "Hierarchy assigned successfully!");
        setSelectedBulkUserIds(new Set());
        setTargetManagerId("");
        await fetchUsers();
      } else {
        setError(json.message || "Failed to execute hierarchy assignment.");
      }
    } catch {
      setError("An unexpected error occurred while assigning hierarchy.");
    } finally {
      setBulkAssigning(false);
    }
  }

  // Helper to open Individual Workbench for a user
  function handleOpenWorkbenchForUser(userId: string) {
    setSelectedUserId(userId);
    setViewMode("workbench");
  }

  // -------------------------------------------------------------
  // Individual Workbench Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      resetUserForm();
      return;
    }

    const u = users.find((item) => item._id === selectedUserId);
    if (u) {
      setSelectedUser(u);
      loadUserAssignmentDetails(u._id);
    }
  }, [selectedUserId, users]);

  function resetUserForm() {
    setRoleLevel("MR");
    setReportsTo("");
    setStateName("");
    setZoneName("");
    setRegionName("");
    setTerritoryName("");
    setHierarchyNotes("");
    setDirectReports([]);
    setAssignedScopes([]);
    setSelectedCustomerKeys(new Set());
  }

  async function loadUserAssignmentDetails(userId: string) {
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/assignment?userId=${userId}`);
      const json = await res.json();

      if (json.success && json.data) {
        const { user, hierarchy, territories, partyAssignments, directReports } = json.data;

        // Populate Hierarchy Role
        const userRoleName = typeof user?.roleId === "object" ? user?.roleId?.roleName : user?.roleType || "";
        const level = hierarchy?.roleLevel || userRoleName || "MR";
        setRoleLevel(level);

        // Check if Admin
        const isAdmin = userRoleName.toLowerCase().includes("admin") || level.toLowerCase().includes("admin");
        if (isAdmin) {
          setReportsTo("");
        } else {
          const managerId = typeof user?.reportsTo === "object" ? user?.reportsTo?._id : user?.reportsTo || hierarchy?.reportsTo || "";
          setReportsTo(managerId || "");
        }

        setStateName(hierarchy?.state || "");
        setZoneName(hierarchy?.zone || "");
        setRegionName(hierarchy?.region || "");
        setTerritoryName(hierarchy?.territory || "");
        setHierarchyNotes(hierarchy?.notes || "");
        setDirectReports(directReports || []);

        // Populate Scope
        if (Array.isArray(territories)) {
          const scopes: TerritoryScopeItem[] = territories.map((t: any) => ({
            companyCode: t.companyCode,
            companyName: t.companyName,
            divisionCode: t.divisionCode,
            divisionName: t.divisionName,
            subDivisionCode: t.subDivisionCode || "",
            subDivisionName: t.subDivisionName || "",
            categoryCode: t.categoryCode || "",
            categoryName: t.categoryName || "",
            notes: t.notes || "",
          }));
          setAssignedScopes(scopes);
        } else {
          setAssignedScopes([]);
        }

        // Populate Customer Assignments
        if (Array.isArray(partyAssignments) && allCustomers.length > 0) {
          const activeCodes = new Set(partyAssignments.map((a: any) => (a.customerCode || "").trim().toLowerCase()));
          const activeNames = new Set(partyAssignments.map((a: any) => (a.customerName || "").trim().toLowerCase()));

          const activeKeys = new Set<string>();
          allCustomers.forEach((c) => {
            const codeKey = c.code ? c.code.toLowerCase() : "";
            const nameKey = c.name ? c.name.toLowerCase() : "";
            if ((codeKey && activeCodes.has(codeKey)) || (nameKey && activeNames.has(nameKey))) {
              activeKeys.add(c.uniqueId);
            }
          });
          setSelectedCustomerKeys(activeKeys);
        } else {
          setSelectedCustomerKeys(new Set());
        }
      }
    } catch {
      setError("Failed to load assignment details for user.");
    } finally {
      setLoadingDetails(false);
    }
  }

  const isSelectedUserAdmin = useMemo(() => {
    if (!selectedUser) return false;
    const rName = (
      typeof selectedUser.roleId === "object"
        ? selectedUser.roleId?.roleName || ""
        : selectedUser.roleType || ""
    ).toLowerCase();
    return rName.includes("admin") || roleLevel.toLowerCase().includes("admin");
  }, [selectedUser, roleLevel]);

  const filteredWorkbenchUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.trim().toLowerCase();
      const roleName = typeof u.roleId === "object" ? u.roleId?.roleName || "" : u.roleType || "";
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
        roleName.toLowerCase().includes(q);

      const matchRole = !roleFilter || u.roleType === roleFilter || roleName === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, roleFilter]);

  const scopeDivisions = useMemo(() => {
    return newScopeCompanyCode ? divisions.filter((d) => d.companyCode === newScopeCompanyCode) : [];
  }, [divisions, newScopeCompanyCode]);

  const scopeSubDivisions = useMemo(() => {
    return newScopeCompanyCode && newScopeDivisionCode
      ? subDivisions.filter((s) => s.companyCode === newScopeCompanyCode && s.divisionCode === newScopeDivisionCode)
      : [];
  }, [subDivisions, newScopeCompanyCode, newScopeDivisionCode]);

  const scopeCategories = useMemo(() => {
    return newScopeCompanyCode && newScopeDivisionCode
      ? categories.filter(
        (c) =>
          c.companyCode === newScopeCompanyCode &&
          c.divisionCode === newScopeDivisionCode &&
          (!newScopeSubDivisionCode || c.subDivisionCode === newScopeSubDivisionCode)
      )
      : [];
  }, [categories, newScopeCompanyCode, newScopeDivisionCode, newScopeSubDivisionCode]);

  const filteredParties = useMemo(() => {
    if (!partySearch) return allCustomers;
    const q = partySearch.toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q))
    );
  }, [allCustomers, partySearch]);

  function handleAddScope() {
    if (!newScopeCompanyCode || !newScopeDivisionCode) {
      setError("Please select both a Company and a Division.");
      return;
    }

    const comp = companies.find((c) => c.companyCode === newScopeCompanyCode);
    const div = scopeDivisions.find((d) => d.divisionCode === newScopeDivisionCode);
    const subDiv = scopeSubDivisions.find((s) => s.subDivisionCode === newScopeSubDivisionCode);
    const cat = scopeCategories.find((c) => c.categoryCode === newScopeCategoryCode);

    const newScope: TerritoryScopeItem = {
      companyCode: newScopeCompanyCode,
      companyName: comp?.companyName || newScopeCompanyCode,
      divisionCode: newScopeDivisionCode,
      divisionName: div?.divisionName || newScopeDivisionCode,
      subDivisionCode: newScopeSubDivisionCode || "",
      subDivisionName: subDiv?.subDivisionName || "",
      categoryCode: newScopeCategoryCode || "",
      categoryName: cat?.categoryName || "",
    };

    const exists = assignedScopes.some(
      (s) =>
        s.companyCode === newScope.companyCode &&
        s.divisionCode === newScope.divisionCode &&
        s.subDivisionCode === newScope.subDivisionCode &&
        s.categoryCode === newScope.categoryCode
    );

    if (exists) {
      setError("This product/division scope is already added.");
      return;
    }

    setAssignedScopes([...assignedScopes, newScope]);
    setNewScopeSubDivisionCode("");
    setNewScopeCategoryCode("");
    setError(null);
  }

  function handleRemoveScope(index: number) {
    setAssignedScopes(assignedScopes.filter((_, i) => i !== index));
  }

  function togglePartySelect(uniqueId: string) {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      if (updated.has(uniqueId)) {
        updated.delete(uniqueId);
      } else {
        updated.add(uniqueId);
      }
      return updated;
    });
  }

  function handleSelectAllVisibleParties() {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredParties.forEach((c) => updated.add(c.uniqueId));
      return updated;
    });
  }

  function handleDeselectAllVisibleParties() {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredParties.forEach((c) => updated.delete(c.uniqueId));
      return updated;
    });
  }

  async function handleSaveAllAssignments() {
    if (!selectedUserId) {
      setError("Please select an Executive User first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const assignedCustomers = allCustomers
      .filter((c) => selectedCustomerKeys.has(c.uniqueId))
      .map((c) => ({
        customerCode: c.code || c.name,
        customerName: c.name,
        city: c.city,
        area: c.area,
      }));

    try {
      const payload = {
        userId: selectedUserId,
        roleLevel,
        reportsTo: isSelectedUserAdmin ? null : (reportsTo || null),
        state: stateName,
        zone: zoneName,
        region: regionName,
        territory: territoryName,
        notes: hierarchyNotes,
        territoryScopes: assignedScopes,
        assignedCustomers,
      };

      const res = await fetch("/api/users/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(json.message || "All user assignments saved successfully!");
        fetchUsers();
        loadUserAssignmentDetails(selectedUserId);
      } else {
        setError(json.message || "Failed to save assignments.");
      }
    } catch {
      setError("An unexpected error occurred while saving assignments.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="coontainer-fluid">
    {/* <div className="space-y-6 p-4 max-w-7xl mx-auto"> */}
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 p-6 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <FaSitemap /> Hierarchy & Role Assignment Workbench
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Multi-User Selection
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Executive Hierarchy & Role Assignment
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Select any role type to view users, choose multiple executives with checkboxes, and assign them directly to higher designations in a structured grid format.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/users"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
            >
              <FaArrowLeft /> Back to Users
            </Link>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
          <button
            onClick={() => setViewMode("bulk-hierarchy")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === "bulk-hierarchy"
                ? "bg-white text-indigo-950 shadow-lg font-extrabold scale-105"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <FaSitemap /> 1. Role-Based Hierarchy Assignment (Bulk Checkboxes)
          </button>

          <button
            onClick={() => setViewMode("workbench")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === "workbench"
                ? "bg-white text-indigo-950 shadow-lg font-extrabold scale-105"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <FaUserTie /> 2. Individual 360° Scope & Party Workbench
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 text-base shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-400 hover:text-rose-600">
            <FaTimes />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-emerald-500 text-base shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 text-emerald-400 hover:text-emerald-600">
            <FaTimes />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: ROLE-BASED BULK HIERARCHY ASSIGNMENT (THE REQUESTED FEATURE)       */}
      {/* ========================================================================= */}
      {viewMode === "bulk-hierarchy" && (
        <div className="space-y-6">
          {/* STEP 1: ROLE SELECTION GRID */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FaLayerGroup className="text-indigo-600" /> Step 1: Select Role Type
                </h2>
                <p className="text-[11px] text-slate-500">
                  Click any role card below to instantly display users belonging to that role with multi-select checkboxes.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Total Users: <strong className="text-indigo-600">{totalUserCount}</strong>
              </span>
            </div>

            {/* Role Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
              {/* "All Roles" Card */}
              <button
                type="button"
                onClick={() => setActiveRole("")}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  activeRole === ""
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30 scale-[1.02]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    activeRole === "" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    ALL
                  </span>
                  <FaUsers className={activeRole === "" ? "text-indigo-200" : "text-slate-400"} />
                </div>
                <div>
                  <div className="font-extrabold text-xs leading-tight">All Roles</div>
                  <div className={`text-[11px] mt-0.5 ${activeRole === "" ? "text-indigo-100" : "text-slate-500"}`}>
                    {totalUserCount} Users
                  </div>
                </div>
              </button>

              {/* Dynamic Role Cards */}
              {roleListWithCounts.map((r) => {
                const isSelected = activeRole.toLowerCase() === r.name.toLowerCase();
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setActiveRole(r.name)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30 scale-[1.02]"
                        : "bg-white hover:bg-indigo-50/50 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {r.name.slice(0, 4).toUpperCase()}
                      </span>
                      {isSelected ? (
                        <FaCheckCircle className="text-emerald-300 text-xs" />
                      ) : (
                        <FaShieldAlt className="text-slate-300 text-xs" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate leading-tight" title={r.name}>
                        {r.name}
                      </div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                        {r.count} {r.count === 1 ? "User" : "Users"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2 & 3: GRID WORKBENCH AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / CENTER: USERS SELECTION GRID WITH PROPER CHECKBOXES */}
            <div className="lg:col-span-8 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              {/* Header with Search, Checkbox Controls & View Toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FaCheckSquare className="text-indigo-600" /> Step 2: Multi-User Selection Grid
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Role: <strong className="text-indigo-700">{activeRole || "All Roles"}</strong> • Showing {filteredRoleUsers.length} user(s)
                  </p>
                </div>

                {/* View Switcher: Grid vs Table */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                  <button
                      type="button"
                      onClick={() => setLayoutView("table")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                        layoutView === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Detailed Table View"
                    >
                      <FaList size={11} /> Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutView("grid")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                        layoutView === "grid" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Cards Grid View"
                    >
                      <FaThLarge size={11} /> Grid
                    </button>
                    
                  </div>
                </div>
              </div>

              {/* Toolbar: Search, Status Filter & Checkbox Action Buttons */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, employee code, territory, manager..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {bulkSearch && (
                    <button
                      onClick={() => setBulkSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <FaTimes size={10} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <FaFilter size={11} className="text-slate-400 shrink-0" />
                  <select
                    value={assignmentFilter}
                    onChange={(e: any) => setAssignmentFilter(e.target.value)}
                    className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    <option value="all">All Assignment Status</option>
                    <option value="assigned">Already Assigned</option>
                    <option value="unassigned">Unassigned (No Manager)</option>
                  </select>
                </div>

                {/* Select / Deselect All Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={isAllVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5"
                  >
                    {isAllVisibleSelected ? (
                      <>
                        <FaCheckSquare className="text-indigo-600" /> Deselect Visible
                      </>
                    ) : (
                      <>
                        <FaSquare className="text-indigo-400" /> Select Visible ({filteredRoleUsers.length})
                      </>
                    )}
                  </button>

                  {selectedBulkUserIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSelections}
                      className="px-2.5 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all"
                      title="Clear Selection"
                    >
                      Clear ({selectedBulkUserIds.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Selection Summary Badge Bar */}
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="master-checkbox"
                    checked={isAllVisibleSelected && filteredRoleUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) handleSelectAllVisible();
                      else handleDeselectAllVisible();
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="master-checkbox" className="font-bold text-slate-700 cursor-pointer">
                    Select All Visible Users
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">Selected for Assignment:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-sm">
                    {selectedBulkUserIds.size} User(s)
                  </span>
                </div>
              </div>

              {/* USER CARDS GRID FORMAT */}
              {loadingUsers ? (
                <div className="py-20 text-center text-xs font-semibold text-slate-400">
                  Loading users...
                </div>
              ) : filteredRoleUsers.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-lg mb-2">
                    <FaUsers />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No users found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {activeRole
                      ? `There are currently no users with role "${activeRole}". Select another role above or adjust your search.`
                      : "No users match your search criteria."}
                  </p>
                </div>
              ) : layoutView === "grid" ? (
                /* GRID FORMAT: 2-3 COLUMNS */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
                  {filteredRoleUsers.map((u) => {
                    const isChecked = selectedBulkUserIds.has(u._id);
                    const userRole = (
                      typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Executive"
                    ).trim();

                    const currentManagerName =
                      u.reportsTo?.name ||
                      u.salesHierarchy?.reportsToName ||
                      (u.reportsTo && typeof u.reportsTo === "string" ? users.find((m) => m._id === u.reportsTo)?.name : null);

                    const territory = u.salesHierarchy?.territory || u.salesHierarchy?.region || "";

                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleUserSelection(u._id)}
                        className={`rounded-2xl border p-3.5 transition-all cursor-pointer relative select-none flex flex-col justify-between ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-400 shadow-md ring-2 ring-indigo-500/20"
                            : "bg-white hover:bg-slate-50/90 border-slate-200 shadow-sm"
                        }`}
                      >
                        {/* Top: Checkbox & Role Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleUserSelection(u._id);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {u.employeeCode || "NO CODE"}
                            </span>
                          </div>

                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {userRole}
                          </span>
                        </div>

                        {/* Middle: Avatar & User Info */}
                        <div className="flex items-center gap-3 my-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm ${
                              isChecked
                                ? "bg-indigo-600 text-white"
                                : "bg-gradient-to-br from-slate-100 to-indigo-100 text-indigo-800"
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {u.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>

                        {/* Current Manager Badge */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Reporting To:</span>
                            {currentManagerName ? (
                              <span className="font-bold text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[170px]" title={currentManagerName}>
                                <FaUserCheck size={9} className="text-indigo-600 shrink-0" />
                                <span className="truncate">{currentManagerName}</span>
                              </span>
                            ) : (
                              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1 text-[10px]">
                                <FaExclamationTriangle size={8} /> Unassigned
                              </span>
                            )}
                          </div>

                          {territory && (
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="flex items-center gap-1 text-slate-400">
                                <FaMapMarkerAlt size={9} /> Territory:
                              </span>
                              <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                {territory}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Action Button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWorkbenchForUser(u._id);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                          >
                            Configure Scope & Parties <FaChevronRight size={8} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABLE FORMAT WITH CHECKBOXES */
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[620px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllVisibleSelected && filteredRoleUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAllVisible();
                              else handleDeselectAllVisible();
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Executive User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Current Reporting Manager</th>
                        <th className="p-3">Territory / Zone</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoleUsers.map((u) => {
                        const isChecked = selectedBulkUserIds.has(u._id);
                        const userRole = (
                          typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Executive"
                        ).trim();

                        const currentManagerName =
                          u.reportsTo?.name ||
                          u.salesHierarchy?.reportsToName ||
                          (u.reportsTo && typeof u.reportsTo === "string" ? users.find((m) => m._id === u.reportsTo)?.name : null);

                        const territory = u.salesHierarchy?.territory || u.salesHierarchy?.region || "—";

                        return (
                          <tr
                            key={u._id}
                            onClick={() => toggleUserSelection(u._id)}
                            className={`cursor-pointer transition-all ${
                              isChecked ? "bg-indigo-50/80 text-indigo-950 font-medium" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleUserSelection(u._id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isChecked ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold block leading-tight">{u.name}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {u.employeeCode ? `${u.employeeCode} • ` : ""}
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {userRole}
                              </span>
                            </td>
                            <td className="p-3">
                              {currentManagerName ? (
                                <span className="font-bold text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
                                  <FaUserCheck size={9} className="text-indigo-600" /> {currentManagerName}
                                </span>
                              ) : (
                                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-flex items-center gap-1 text-[10px]">
                                  <FaExclamationTriangle size={8} /> Unassigned
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">{territory}</td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenWorkbenchForUser(u._id)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              >
                                Scope & Parties
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: STEP 3 - ASSIGN TO HIGHER DESIGNATION */}
            <div className="lg:col-span-4 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5 sticky top-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FaUserTie className="text-indigo-600" /> Step 3: Assign to Higher Designation
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a senior reporting manager to link all checked executives into the hierarchy chain.
                </p>
              </div>

              {/* Selected Users Pill Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Selected Executives:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white">
                    {selectedBulkUserIds.size} Selected
                  </span>
                </div>

                {selectedBulkUserIds.size === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No users selected yet. Check the boxes of users you want to assign.
                  </p>
                ) : (
                  <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 pt-1">
                    {Array.from(selectedBulkUserIds).map((id) => {
                      const u = users.find((item) => item._id === id);
                      if (!u) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 shadow-2xs"
                        >
                          {u.name}
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(id)}
                            className="text-slate-400 hover:text-rose-500 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Filter Managers by Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Filter Higher Designation By Role:
                </label>
                <select
                  value={managerRoleFilter}
                  onChange={(e) => setManagerRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                >
                  <option value="">All Higher Designations (Managers & Admins)</option>
                  {dynamicRoles.map((r) => (
                    <option key={r._id} value={r.roleName}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Higher Designation Manager Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Higher Reporting Manager (Supervisor) *
                </label>
                <select
                  value={targetManagerId}
                  onChange={(e) => setTargetManagerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-indigo-200 bg-indigo-50/40 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">-- Choose Senior Reporting Manager --</option>
                  {eligibleManagers.map((m) => {
                    const managerRole = typeof m.roleId === "object" ? m.roleId?.roleName : m.roleType || "Manager";
                    return (
                      <option key={m._id} value={m._id}>
                        {m.name} ({managerRole}) {m.employeeCode ? `• ${m.employeeCode}` : ""}
                      </option>
                    );
                  })}
                </select>

                {targetManagerId && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 mt-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                      {users.find((u) => u._id === targetManagerId)?.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950">
                        {users.find((u) => u._id === targetManagerId)?.name}
                      </div>
                      <div className="text-[10px] text-indigo-700 font-semibold">
                        Role: {typeof users.find((u) => u._id === targetManagerId)?.roleId === "object"
                          ? (users.find((u) => u._id === targetManagerId)?.roleId as any)?.roleName
                          : users.find((u) => u._id === targetManagerId)?.roleType || "Supervisor"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Jurisdiction Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Optional Jurisdiction Override for Selected
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="State / Zone"
                    value={bulkState}
                    onChange={(e) => setBulkState(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50"
                  />
                  <input
                    type="text"
                    placeholder="Region / HQ"
                    value={bulkRegion}
                    onChange={(e) => setBulkRegion(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  disabled={bulkAssigning || selectedBulkUserIds.size === 0 || !targetManagerId}
                  onClick={() => handleExecuteBulkAssign(targetManagerId)}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                  <FaUserCheck />
                  {bulkAssigning
                    ? "Assigning Hierarchy..."
                    : `Assign ${selectedBulkUserIds.size} User(s) to Manager`}
                </button>

                <button
                  type="button"
                  disabled={bulkAssigning || selectedBulkUserIds.size === 0}
                  onClick={() => handleExecuteBulkAssign(null)}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTimes /> Unassign (Set as Independent / Top-Level)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INDIVIDUAL 360° SCOPE & PARTY WORKBENCH (FULL ORIGINAL CAPABILITY) */}
      {/* ========================================================================= */}
      {viewMode === "workbench" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR: Executive User Selector — TABLE FORMAT */}
          <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col h-[750px]">
            <div className="pb-3 border-b border-slate-100 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FaUsers className="text-indigo-600" /> Select Executive User
              </h3>

              {/* Search Input */}
              <div className="relative">
                <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name, code..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Dynamic Role Filter Dropdown */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
              >
                <option value="">All Roles (from Role Master)</option>
                {dynamicRoles.map((r) => (
                  <option key={r._id} value={r.roleName}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>

            {/* User Table */}
            <div className="flex-1 overflow-y-auto mt-3 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-2.5">Executive</th>
                    <th className="p-2.5">Code / Email</th>
                    <th className="p-2.5 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-xs font-semibold text-slate-400">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredWorkbenchUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-xs font-semibold text-slate-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredWorkbenchUsers.map((u) => {
                      const isSelected = u._id === selectedUserId;
                      const roleName = typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Executive";

                      return (
                        <tr
                          key={u._id}
                          onClick={() => setSelectedUserId(u._id)}
                          className={`cursor-pointer transition-all ${
                            isSelected ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className="p-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold leading-tight">{u.name}</span>
                            </div>
                          </td>
                          <td className={`p-2.5 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                            {u.employeeCode ? u.employeeCode : u.email}
                          </td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isSelected
                                  ? "bg-white/20 text-white border-white/30"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {roleName}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT WORKBENCH PANEL */}
          <div className="lg:col-span-8 space-y-4">
            {selectedUserId && selectedUser ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[750px] flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Executive Header Banner */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 border border-indigo-100/80 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900">{selectedUser.name}</h2>
                        <p className="text-xs text-slate-500">
                          {selectedUser.email} {selectedUser.employeeCode ? `• Code: ${selectedUser.employeeCode}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Role Master: {typeof selectedUser.roleId === "object" ? selectedUser.roleId?.roleName : roleLevel || "Executive"}
                      </span>
                    </div>
                  </div>

                  {/* WORKBENCH TABS */}
                  <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setActiveTab("hierarchy")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                        activeTab === "hierarchy"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <FaSitemap /> 1. Reporting Hierarchy
                    </button>

                    <button
                      onClick={() => setActiveTab("scope")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                        activeTab === "scope"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <FaBuilding /> 2. Company & Product Scope ({assignedScopes.length})
                    </button>

                    <button
                      onClick={() => setActiveTab("parties")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                        activeTab === "parties"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <FaUserCheck /> 3. Party / Customer Mapping ({selectedCustomerKeys.size})
                    </button>

                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                        activeTab === "summary"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <FaTag /> 4. 360° Summary Matrix
                    </button>
                  </div>

                  {/* TAB CONTENT PANELS */}
                  {loadingDetails ? (
                    <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading user assignment details...</div>
                  ) : (
                    <>
                      {/* TAB 1: REPORTING HIERARCHY */}
                      {activeTab === "hierarchy" && (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Hierarchy Role Level (from Role Master) *
                              </label>
                              <select
                                value={roleLevel}
                                onChange={(e) => setRoleLevel(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                              >
                                {dynamicRoles.map((r) => (
                                  <option key={r._id} value={r.roleName}>
                                    {r.roleName}
                                  </option>
                                ))}
                                {roleLevel && !dynamicRoles.some((r) => r.roleName === roleLevel) && (
                                  <option value={roleLevel}>{roleLevel}</option>
                                )}
                              </select>
                            </div>

                            <div>
                              {isSelectedUserAdmin ? (
                                <div className="h-full flex flex-col justify-end">
                                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                                    <FaCrown className="text-amber-600 text-sm" />
                                    <span>Super Admin (Top Level Authority - Does Not Report To Anyone)</span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Reports To (Parent Manager)
                                  </label>
                                  <select
                                    value={reportsTo}
                                    onChange={(e) => setReportsTo(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                                  >
                                    <option value="">-- None (Top Level Executive) --</option>
                                    {users
                                      .filter((u) => u._id !== selectedUserId)
                                      .map((u) => {
                                        const managerRole = typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "";
                                        return (
                                          <option key={u._id} value={u._id}>
                                            {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {managerRole || "Executive"}
                                          </option>
                                        );
                                      })}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">State / Zone Jurisdiction</label>
                              <input
                                type="text"
                                value={stateName}
                                onChange={(e) => setStateName(e.target.value)}
                                placeholder="e.g. Uttar Pradesh"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Region / HQ Territory</label>
                              <input
                                type="text"
                                value={regionName}
                                onChange={(e) => setRegionName(e.target.value)}
                                placeholder="e.g. Lucknow HQ"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                              />
                            </div>
                          </div>

                          {/* Direct Downline Subordinates */}
                          <div className="pt-3 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                              <FaUsers className="text-indigo-600" /> Direct Downline Team Reporting to {selectedUser.name} ({directReports.length})
                            </h4>

                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Code / Email</th>
                                    <th className="p-3 text-right">Role</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {directReports.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} className="p-6 text-center text-slate-400">
                                        No employees currently report directly to this executive.
                                      </td>
                                    </tr>
                                  ) : (
                                    directReports.map((r) => (
                                      <tr key={r._id} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-800">{r.name}</td>
                                        <td className="p-3 text-slate-400">{r.employeeCode ? r.employeeCode : r.email}</td>
                                        <td className="p-3 text-right">
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                            {typeof r.roleId === "object" ? r.roleId?.roleName : r.roleType || "Subordinate"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: COMPANY & PRODUCT SCOPE */}
                      {activeTab === "scope" && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                              + Add Product / Division Scope
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Company *</label>
                                <select
                                  value={newScopeCompanyCode}
                                  onChange={(e) => {
                                    setNewScopeCompanyCode(e.target.value);
                                    setNewScopeDivisionCode("");
                                    setNewScopeSubDivisionCode("");
                                    setNewScopeCategoryCode("");
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
                                >
                                  <option value="">-- Company --</option>
                                  {companies.map((c) => (
                                    <option key={c._id} value={c.companyCode}>
                                      {c.companyName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Division *</label>
                                <select
                                  value={newScopeDivisionCode}
                                  disabled={!newScopeCompanyCode}
                                  onChange={(e) => {
                                    setNewScopeDivisionCode(e.target.value);
                                    setNewScopeSubDivisionCode("");
                                    setNewScopeCategoryCode("");
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                                >
                                  <option value="">-- Division --</option>
                                  {scopeDivisions.map((d) => (
                                    <option key={d._id} value={d.divisionCode}>
                                      {d.divisionName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sub-Division (Optional)</label>
                                <select
                                  value={newScopeSubDivisionCode}
                                  disabled={!newScopeDivisionCode}
                                  onChange={(e) => setNewScopeSubDivisionCode(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                                >
                                  <option value="">All Sub-Divisions</option>
                                  {scopeSubDivisions.map((s) => (
                                    <option key={s._id} value={s.subDivisionCode}>
                                      {s.subDivisionName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Category (Optional)</label>
                                <select
                                  value={newScopeCategoryCode}
                                  disabled={!newScopeDivisionCode}
                                  onChange={(e) => setNewScopeCategoryCode(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                                >
                                  <option value="">All Categories</option>
                                  {scopeCategories.map((c) => (
                                    <option key={c._id} value={c.categoryCode}>
                                      {c.categoryName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleAddScope}
                                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                              >
                                <FaPlus /> Add Scope
                              </button>
                            </div>
                          </div>

                          {/* Assigned Scopes Table */}
                          <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                  <th className="p-3">Company</th>
                                  <th className="p-3">Division</th>
                                  <th className="p-3">Sub-Division</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {assignedScopes.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-400">
                                      No product/division scope assigned yet.
                                    </td>
                                  </tr>
                                ) : (
                                  assignedScopes.map((scope, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-3 font-bold text-slate-900">{scope.companyName}</td>
                                      <td className="p-3 font-bold text-indigo-700">{scope.divisionName}</td>
                                      <td className="p-3 text-slate-600">{scope.subDivisionName || "All Sub-Divisions"}</td>
                                      <td className="p-3 text-slate-600">{scope.categoryName || "All Categories"}</td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => handleRemoveScope(idx)}
                                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        >
                                          <FaTrashAlt />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: PARTY / CUSTOMER MAPPING */}
                      {activeTab === "parties" && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="relative w-full sm:w-80">
                              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search party name, code, city..."
                                value={partySearch}
                                onChange={(e) => setPartySearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                                Assigned Parties: <span className="text-indigo-600">{selectedCustomerKeys.size}</span>
                              </span>
                              <button
                                type="button"
                                onClick={handleSelectAllVisibleParties}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                Select Visible
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllVisibleParties}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                Deselect Visible
                              </button>
                            </div>
                          </div>

                          {/* Party Table */}
                          <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                  <th className="p-3 w-8"></th>
                                  <th className="p-3">Party Name</th>
                                  <th className="p-3">Code</th>
                                  <th className="p-3">City</th>
                                  <th className="p-3">Area</th>
                                  <th className="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredParties.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                                      No parties found.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredParties.map((c) => {
                                    const isChecked = selectedCustomerKeys.has(c.uniqueId);
                                    return (
                                      <tr
                                        key={c.uniqueId}
                                        onClick={() => togglePartySelect(c.uniqueId)}
                                        className={`cursor-pointer transition-all ${
                                          isChecked ? "bg-indigo-50/80 text-indigo-950" : "hover:bg-slate-50 text-slate-700"
                                        }`}
                                      >
                                        <td className="p-3">
                                          <div className={`text-sm ${isChecked ? "text-indigo-600" : "text-slate-300"}`}>
                                            {isChecked ? <FaCheckSquare /> : <FaSquare />}
                                          </div>
                                        </td>
                                        <td className="p-3 font-bold">{c.name}</td>
                                        <td className="p-3 text-slate-500">{c.code || "N/A"}</td>
                                        <td className="p-3 text-slate-500">{c.city || "—"}</td>
                                        <td className="p-3 text-slate-500">{c.area || "—"}</td>
                                        <td className="p-3 text-right">
                                          {isChecked && (
                                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                              Assigned
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: 360° SUMMARY MATRIX */}
                      {activeTab === "summary" && (
                        <div className="space-y-4">
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4 shadow-lg">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                              <h3 className="text-sm font-extrabold flex items-center gap-2">
                                <FaCrown className="text-amber-400" /> Executive Ownership Matrix
                              </h3>
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                                Role: {roleLevel || selectedUser.roleType || "Executive"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-[11px]">Reporting Manager</p>
                                <p className="font-bold text-white mt-1">
                                  {isSelectedUserAdmin
                                    ? "Top Authority (Does Not Report To Anyone)"
                                    : users.find((u) => u._id === reportsTo)?.name || "Top Level Executive / Admin"}
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-[11px]">Assigned Product Scopes</p>
                                <p className="font-bold text-emerald-400 mt-1">{assignedScopes.length} Division(s)</p>
                              </div>

                              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-[11px]">Assigned Parties / Customers</p>
                                <p className="font-bold text-teal-300 mt-1">{selectedCustomerKeys.size} Party(ies)</p>
                              </div>
                            </div>
                          </div>

                          {/* Summary breakdown tables */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 p-3">
                                <h4 className="font-bold text-slate-800">Assigned Companies & Divisions</h4>
                              </div>
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                    <th className="p-2.5">Company</th>
                                    <th className="p-2.5">Division</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {assignedScopes.length === 0 ? (
                                    <tr>
                                      <td colSpan={2} className="p-4 text-center text-slate-400 text-[11px]">
                                        No division scopes added.
                                      </td>
                                    </tr>
                                  ) : (
                                    assignedScopes.map((s, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                                          <FaChevronRight size={9} className="text-indigo-500" /> {s.companyName}
                                        </td>
                                        <td className="p-2.5 font-bold text-indigo-700">{s.divisionName}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 p-3">
                                <h4 className="font-bold text-slate-800">Direct Subordinates ({directReports.length})</h4>
                              </div>
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                    <th className="p-2.5">Name</th>
                                    <th className="p-2.5 text-right">Role</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {directReports.length === 0 ? (
                                    <tr>
                                      <td colSpan={2} className="p-4 text-center text-slate-400 text-[11px]">
                                        No direct reportees.
                                      </td>
                                    </tr>
                                  ) : (
                                    directReports.map((r) => (
                                      <tr key={r._id} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-medium text-slate-700">
                                          {r.name} <span className="text-slate-400 font-normal">({r.employeeCode || r.email})</span>
                                        </td>
                                        <td className="p-2.5 text-right">
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                            {typeof r.roleId === "object" ? r.roleId?.roleName : r.roleType || "Subordinate"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center mt-6">
                  <span className="text-xs text-slate-500">
                    Editing assignments for: <strong className="text-slate-900">{selectedUser.name}</strong>
                  </span>

                  <button
                    onClick={handleSaveAllAssignments}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <FaSave /> {saving ? "Saving All..." : "Save All Assignments"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-dashed border-slate-300 p-16 text-center space-y-3 min-h-[750px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
                  <FaUserTie />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">No Executive Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select any executive from the left panel to configure their reporting manager, dynamic role from Role Master, product scope, and assigned parties.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    // </div>
  );
}