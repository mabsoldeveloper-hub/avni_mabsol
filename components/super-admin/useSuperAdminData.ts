"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SuperAdminUserItem, SuperAdminStats, FilterState } from "./types";

export function useSuperAdminData(initialStatusFilter?: string) {
  const [users, setUsers] = useState<SuperAdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<SuperAdminUserItem | null>(null);

  const [stats, setStats] = useState<SuperAdminStats>({
    total: 0,
    pending: 0,
    active: 0,
    expired: 0,
    rejected: 0,
    suspended: 0,
    deactive: 0,
    headOffices: 0,
    childBranches: 0,
    totalCompanies: 0,
  });

  const [filter, setFilter] = useState<FilterState>({
    search: "",
    status: initialStatusFilter || "all",
    branchType: "all",
    parentCompanyId: "all",
    plan: "all",
    city: "all",
    timeRange: "all",
    date: "",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load super admin users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Extract distinct cities for the city filter dropdown
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const c = u.companyId?.city;
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Extract distinct Head Offices for the parent branch filter dropdown
  const availableHeadOffices = useMemo(() => {
    const map = new Map<string, { _id: string; companyName: string; companyCode: string }>();
    users.forEach((u) => {
      const comp = u.companyId;
      if (comp?._id && (!comp.parentCompanyId || comp.isHeadOffice)) {
        map.set(comp._id.toString(), {
          _id: comp._id.toString(),
          companyName: comp.companyName || "Organization",
          companyCode: comp.companyCode || "",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [users]);

  // Execute admin action (approve, extend, suspend, activate, reject)
  const handleAction = useCallback(
    async (
      userId: string,
      action: "approve" | "extend" | "reject" | "suspend" | "activate",
      durationDays?: number,
      notes?: string,
      sessionTimeoutHours?: number
    ) => {
      setActionLoading(userId);
      try {
        const body: any = { action, notes };
        if (durationDays !== undefined) body.durationDays = durationDays;
        if (sessionTimeoutHours !== undefined) body.sessionTimeoutHours = sessionTimeoutHours;

        const res = await fetch(`/api/super-admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (res.ok) {
          await fetchUsers();
          setSelectedUserForModal(null);
        } else {
          alert(data.error || "Action failed");
        }
      } catch (err) {
        console.error("Action error:", err);
        alert("An error occurred while updating account");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchUsers]
  );

  // Toggle active/inactive via the switch
  const handleToggleActive = useCallback(
    async (u: SuperAdminUserItem) => {
      const newAction = u.status === "Suspended" ? "activate" : "suspend";
      await handleAction(u._id, newAction);
    },
    [handleAction]
  );

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search Query
      if (filter.search.trim()) {
        const q = filter.search.toLowerCase();
        const companyMatch = (u.companyId?.companyName || "").toLowerCase().includes(q);
        const codeMatch = (u.companyId?.companyCode || "").toLowerCase().includes(q);
        const tenantMatch = (u.companyId?.tenantId || "").toLowerCase().includes(q);
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const mobileMatch = (u.mobile || "").toLowerCase().includes(q);
        const gstinMatch = (u.companyId?.gstNo || "").toLowerCase().includes(q);
        const cityMatch = (u.companyId?.city || "").toLowerCase().includes(q);

        if (
          !companyMatch &&
          !codeMatch &&
          !tenantMatch &&
          !nameMatch &&
          !emailMatch &&
          !mobileMatch &&
          !gstinMatch &&
          !cityMatch
        ) {
          return false;
        }
      }

      // 2. Status / Approval Section
      if (filter.status === "pending" || filter.status === "unapproved") {
        if (u.isApproved && u.status === "Active") return false;
      } else if (filter.status === "approved" || filter.status === "active") {
        if (!u.isApproved || u.status === "Suspended" || u.status === "Inactive") return false;
      } else if (filter.status === "suspended") {
        if (u.status !== "Suspended" && u.status !== "Inactive" && u.status !== "Deactivated") return false;
      } else if (filter.status === "expired") {
        if (!u.accessValidUntil) return false;
        if (new Date(u.accessValidUntil).getTime() > Date.now()) return false;
      }

      // 3. Branch Type Filter ('all' | 'head_office' | 'child_branch')
      if (filter.branchType === "head_office") {
        const isHO = !u.companyId?.parentCompanyId || u.companyId?.isHeadOffice === true;
        if (!isHO) return false;
      } else if (filter.branchType === "child_branch") {
        const isBranch = Boolean(u.companyId?.parentCompanyId) || u.companyId?.isHeadOffice === false;
        if (!isBranch) return false;
      }

      // 4. Specific Head Office / Parent Filter
      if (filter.parentCompanyId && filter.parentCompanyId !== "all") {
        const parentId =
          (u.companyId?.parentCompanyId as any)?._id?.toString() ||
          u.companyId?.parentCompanyId?.toString();
        if (parentId !== filter.parentCompanyId) return false;
      }

      // 5. Plan
      if (filter.plan === "free_trial" && u.isUnlimitedAccess) return false;
      if (filter.plan === "unlimited" && !u.isUnlimitedAccess) return false;

      // 6. City
      if (filter.city !== "all") {
        if ((u.companyId?.city || "").toLowerCase() !== filter.city.toLowerCase()) return false;
      }

      // 7. Date
      if (filter.date) {
        const createdDateStr = new Date(u.createdAt).toISOString().split("T")[0];
        if (createdDateStr !== filter.date) return false;
      }

      // 8. Time Range
      if (filter.timeRange !== "all") {
        const createdTime = new Date(u.createdAt).getTime();
        const now = Date.now();
        if (filter.timeRange === "today" && now - createdTime > 24 * 60 * 60 * 1000) return false;
        if (filter.timeRange === "week" && now - createdTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (filter.timeRange === "month" && now - createdTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [users, filter]);

  return {
    users,
    filteredUsers,
    stats,
    loading,
    actionLoading,
    filter,
    setFilter,
    availableCities,
    availableHeadOffices,
    selectedUserForModal,
    setSelectedUserForModal,
    handleAction,
    handleToggleActive,
    refetch: fetchUsers,
  };
}
