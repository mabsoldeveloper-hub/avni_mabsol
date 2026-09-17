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
  });

  const [filter, setFilter] = useState<FilterState>({
    search: "",
    status: initialStatusFilter || "all",
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
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const gstinMatch = (u.companyId?.gstNo || "").toLowerCase().includes(q);
        if (!companyMatch && !nameMatch && !emailMatch && !gstinMatch) return false;
      }

      // 2. Status
      if (filter.status === "pending" && u.isApproved) return false;
      if (filter.status === "approved" && (!u.isApproved || u.status === "Suspended")) return false;
      if (filter.status === "suspended" && u.status !== "Suspended") return false;
      if (filter.status === "expired") {
        if (!u.accessValidUntil) return false;
        if (new Date(u.accessValidUntil).getTime() > Date.now()) return false;
      }

      // 3. Plan
      if (filter.plan === "free_trial" && u.isUnlimitedAccess) return false;
      if (filter.plan === "unlimited" && !u.isUnlimitedAccess) return false;

      // 4. City
      if (filter.city !== "all") {
        if ((u.companyId?.city || "").toLowerCase() !== filter.city.toLowerCase()) return false;
      }

      // 5. Date
      if (filter.date) {
        const createdDateStr = new Date(u.createdAt).toISOString().split("T")[0];
        if (createdDateStr !== filter.date) return false;
      }

      // 6. Time Range
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
    selectedUserForModal,
    setSelectedUserForModal,
    handleAction,
    handleToggleActive,
    refetch: fetchUsers,
  };
}
