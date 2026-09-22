"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaUsers,
  FaBullseye,
  FaRupeeSign,
  FaChevronRight,
  FaChevronDown,
  FaUserTie,
  FaCalendarDay,
  FaCalendarWeek,
  FaFileInvoice,
} from "react-icons/fa";

type TreeNode = {
  _id: string;
  name: string;
  employeeCode?: string;
  role: string;
  designation?: string;
  children?: TreeNode[];
};

type ApiData = {
  periodMonth: string;
  currentUserId: string;
  currentUserRole: string;
  selectedUser: any;
  metrics: any;
  directReports: any[];
  users: any[];
  tree: TreeNode | null;
};

const money = (v: number) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const number = (v: number) =>
  Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

function achievementClass(value: number) {
  if (value >= 100) return "text-emerald-600";
  if (value >= 75) return "text-amber-600";
  return "text-red-600";
}

function TreeItem({
  node,
  selectedId,
  onSelect,
  level = 0,
}: {
  node: TreeNode;
  selectedId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const selected = node._id === selectedId;

  return (
    <div>
      <div
        onClick={() => onSelect(node._id)}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition ${
          selected
            ? "bg-indigo-100 ring-1 ring-indigo-300"
            : "hover:bg-slate-100"
        }`}
        style={{ marginLeft: level * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="w-5 h-5 flex items-center justify-center text-slate-500"
          >
            {open ? (
              <FaChevronDown size={10} />
            ) : (
              <FaChevronRight size={10} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
          <FaUserTie size={13} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">
            {node.name}
          </div>

          <div className="text-[10px] text-slate-500 truncate">
            {node.role}
            {node.employeeCode ? ` • ${node.employeeCode}` : ""}
          </div>
        </div>
      </div>

      {open &&
        hasChildren &&
        node.children!.map((child) => (
          <TreeItem
            key={child._id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            level={level + 1}
          />
        ))}
    </div>
  );
}

export default function MyTeamPerformancePage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [periodMonth, setPeriodMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [view, setView] = useState<"weekly" | "daily">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (userId?: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ periodMonth });

      const id = userId || selectedId;
      if (id) params.set("userId", id);

      const res = await fetch(
        `/api/my-team-performance?${params.toString()}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message || "Unable to load performance"
        );
      }

      setData(json);

      if (!selectedId || userId) {
        setSelectedId(
          json.selectedUser?._id || json.currentUserId
        );
      }
    } catch (e: any) {
      setError(
        e?.message || "Unable to load team performance"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth]);

  const metrics = data?.metrics || {};
  const directReports = data?.directReports || [];

  const weeklyRows = metrics.weeklyBreakdown || [];
  const dailyRows = metrics.dailyBreakdown || [];

  const summaryCards = useMemo(
    () => [
      {
        label: "Sales Target",
        value: money(metrics.salesTarget),
        icon: <FaBullseye />,
      },
      {
        label: "Actual Sales",
        value: money(metrics.actualSales),
        icon: <FaChartLine />,
      },
      {
        label: "Collection Target",
        value: money(metrics.collectionTarget),
        icon: <FaBullseye />,
      },
      {
        label: "Actual Collection",
        value: money(metrics.actualCollection),
        icon: <FaRupeeSign />,
      },
    ],
    [metrics]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <FaChartLine />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">
                My Team Performance
              </h1>

              <p className="text-xs text-slate-500">
                Target vs Actual • Hierarchy • Monthly / Weekly / Daily
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={() => load()}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaUsers className="text-indigo-600" />
              <h2 className="font-bold text-slate-800">
                My Hierarchy
              </h2>
            </div>

            <span className="text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 px-2 py-1">
              {data?.currentUserRole || "..."}
            </span>
          </div>

          {loading && !data ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Loading hierarchy...
            </div>
          ) : data?.tree ? (
            <TreeItem
              node={data.tree}
              selectedId={selectedId || data.currentUserId}
              onSelect={(id) => {
                setSelectedId(id);
                load(id);
              }}
            />
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">
              No hierarchy found
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  Selected Employee
                </div>

                <div className="text-xl font-bold text-slate-800">
                  {data?.selectedUser?.name || "-"}
                </div>

                <div className="text-xs text-slate-500">
                  {data?.selectedUser?.role || ""}
                  {data?.selectedUser?.employeeCode
                    ? ` • ${data.selectedUser.employeeCode}`
                    : ""}
                </div>
              </div>

              <select
                value={selectedId || data?.currentUserId || ""}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  load(e.target.value);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-w-[240px]"
              >
                {(data?.users || []).map((u: any) => (
                  <option key={u._id} value={u._id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-slate-50 border border-slate-100 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {card.icon}
                    {card.label}
                  </div>

                  <div className="text-lg font-bold text-slate-800 mt-2">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <div className="rounded-xl bg-indigo-50 p-3">
                <div className="text-xs text-indigo-700">
                  Sales Achievement
                </div>
                <div
                  className={`text-xl font-bold ${achievementClass(
                    metrics.salesAchievement || 0
                  )}`}
                >
                  {metrics.salesAchievement || 0}%
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="text-xs text-emerald-700">
                  Collection Achievement
                </div>
                <div
                  className={`text-xl font-bold ${achievementClass(
                    metrics.collectionAchievement || 0
                  )}`}
                >
                  {metrics.collectionAchievement || 0}%
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3">
                <div className="text-xs text-amber-700">
                  MR Count
                </div>
                <div className="text-xl font-bold text-amber-900">
                  {metrics.mrCount || 0}
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <div className="text-xs text-slate-600">
                  Parties
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {metrics.parties || 0}
                </div>
              </div>

              <div className="rounded-xl bg-purple-50 p-3">
                <div className="text-xs text-purple-700">
                  Bills
                </div>
                <div className="text-xl font-bold text-purple-900">
                  {number(metrics.bills)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-800">
                  Team Performance
                </h2>
                <p className="text-xs text-slate-500">
                  Direct reports of the selected employee.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setView("weekly")}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    view === "weekly"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <FaCalendarWeek className="inline mr-1" />
                  Weekly
                </button>

                <button
                  onClick={() => setView("daily")}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    view === "daily"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <FaCalendarDay className="inline mr-1" />
                  Daily
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3">
                      Employee
                    </th>
                    <th className="text-left px-4 py-3">
                      Role
                    </th>
                    <th className="text-right px-4 py-3">
                      Sales Target
                    </th>
                    <th className="text-right px-4 py-3">
                      Actual Sales
                    </th>
                    <th className="text-right px-4 py-3">
                      Ach.
                    </th>
                    <th className="text-right px-4 py-3">
                      Collection
                    </th>
                    <th className="text-right px-4 py-3">
                      Bills
                    </th>
                    <th className="text-right px-4 py-3">
                      MRs
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {directReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-slate-400"
                      >
                        No direct reports.
                      </td>
                    </tr>
                  ) : (
                    directReports.map((row: any) => (
                      <tr
                        key={row._id}
                        onClick={() => {
                          setSelectedId(row._id);
                          load(row._id);
                        }}
                        className="border-t border-slate-100 hover:bg-indigo-50/40 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {row.name}
                          <div className="text-[10px] text-slate-400">
                            {row.employeeCode || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.role}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.salesTarget)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {money(row.actualSales)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-bold ${achievementClass(
                            row.salesAchievement || 0
                          )}`}
                        >
                          {row.salesAchievement || 0}%
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.actualCollection)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {number(row.bills)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {number(row.mrCount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {view === "weekly"
                  ? "Weekly Target vs Actual"
                  : "Daily Target vs Actual"}
              </h2>

              <p className="text-xs text-slate-500">
                {data?.selectedUser?.name || "Selected employee"} •{" "}
                {periodMonth}
              </p>
            </div>

            <div className="overflow-x-auto">
              {view === "weekly" ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3">
                        Week
                      </th>
                      <th className="text-right px-4 py-3">
                        Sales Target
                      </th>
                      <th className="text-right px-4 py-3">
                        Actual Sales
                      </th>
                      <th className="text-right px-4 py-3">
                        Sales Ach.
                      </th>
                      <th className="text-right px-4 py-3">
                        Collection Target
                      </th>
                      <th className="text-right px-4 py-3">
                        Actual Collection
                      </th>
                      <th className="text-right px-4 py-3">
                        Collection Ach.
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {weeklyRows.map((row: any) => (
                      <tr
                        key={row.weekNo}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {row.label}
                          <div className="text-[10px] text-slate-400">
                            {row.startDate} → {row.endDate}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.salesTarget)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {money(row.actualSales)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-bold ${achievementClass(
                            row.salesAchievement || 0
                          )}`}
                        >
                          {row.salesAchievement || 0}%
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.collectionTarget)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {money(row.actualCollection)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-bold ${achievementClass(
                            row.collectionAchievement || 0
                          )}`}
                        >
                          {row.collectionAchievement || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3">
                        Date
                      </th>
                      <th className="text-right px-4 py-3">
                        Sales Target
                      </th>
                      <th className="text-right px-4 py-3">
                        Actual Sales
                      </th>
                      <th className="text-right px-4 py-3">
                        Sales Ach.
                      </th>
                      <th className="text-right px-4 py-3">
                        Collection Target
                      </th>
                      <th className="text-right px-4 py-3">
                        Actual Collection
                      </th>
                      <th className="text-right px-4 py-3">
                        Collection Ach.
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dailyRows.map((row: any) => (
                      <tr
                        key={row.date}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {row.date}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.salesTarget)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {money(row.actualSales)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-bold ${achievementClass(
                            row.salesAchievement || 0
                          )}`}
                        >
                          {row.salesAchievement || 0}%
                        </td>

                        <td className="px-4 py-3 text-right">
                          {money(row.collectionTarget)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {money(row.actualCollection)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-bold ${achievementClass(
                            row.collectionAchievement || 0
                          )}`}
                        >
                          {row.collectionAchievement || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
            <FaFileInvoice className="inline mr-2" />
            Target figures come from the existing Target Master, while actual
            sales and collections use the same month-scoped Sales Mdis /
            GLedger calculation pattern as the existing Target vs Actual
            report.
          </div>
        </div>
      </div>
    </div>
  );
}
