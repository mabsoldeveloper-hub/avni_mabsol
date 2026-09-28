"use client";

import { useState, useMemo } from "react";
import DeleteUserButton from "@/components/DeleteUserButton";
import PermissionButton from "@/components/PermissionButton";
import Link from "next/link";
import { FaUsers, FaSearch } from "react-icons/fa";
import { useUser } from "@/context/UserContext";

const PAGE_SIZE = 10;

export default function UsersTable({ users }: { users: any[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user } = useUser();

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) => {
      const h = user.salesHierarchy;
      return (
        user.name?.toLowerCase().includes(q) ||
        user.employeeCode?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.companyId?.companyName?.toLowerCase().includes(q) ||
        user.roleId?.roleName?.toLowerCase().includes(q) ||
        user.department?.toLowerCase().includes(q) ||
        user.designation?.toLowerCase().includes(q) ||
        user.mobile?.toLowerCase().includes(q) ||
        h?.roleLevel?.toLowerCase().includes(q) ||
        h?.reportsToName?.toLowerCase().includes(q) ||
        h?.state?.toLowerCase().includes(q) ||
        h?.region?.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // reset to first page on new search
  }

  return (
    <div
      className="
                relative rounded-2xl overflow-hidden
                bg-white/60 backdrop-blur-xl
                border border-white/40
                shadow-[0_4px_20px_rgba(0,0,0,0.06)]
            "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
            <FaUsers size={14} />
          </div>
          <h5 className="text-sm font-semibold text-white tracking-wide m-0">
            Users
          </h5>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <FaSearch
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
            />
            <input
              type="text"
              placeholder="Search name, code, email, company..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="
                                pl-8 pr-3 py-1.5 rounded-lg text-xs w-56
                                bg-white/20 text-white placeholder-white/70
                                border border-white/30 outline-none
                                focus:bg-white/30 focus:border-white/50
                                transition-colors
                            "
            />
          </div>
          <span className="text-[11px] font-medium text-white/80 whitespace-nowrap">
            {filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
            {"-"}
            {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of{" "}
            {filteredUsers.length}
          </span>
        </div>
      </div>

      {/* body */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200/70 bg-white/30">
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Photo
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Code
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Name
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Email
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Company
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Role
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Sales Hierarchy
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Department
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Designation
              </th>
              <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Mobile
              </th>
              <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Status
              </th>
              <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="text-center text-gray-400 py-8 text-sm"
                >
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user: any) => {
                const h = user.salesHierarchy;
                return (
                  <tr
                    key={user._id}
                    className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                  >
                    <td className="px-4 py-2.5">
                      <div className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0 ring-2 ring-indigo-400/40 bg-indigo-50 flex items-center justify-center">
                        {user.profilePhoto ? (
                          <img
                            src={user.profilePhoto}
                            alt={user.name || ""}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              if (target.nextElementSibling) {
                                (
                                  target.nextElementSibling as HTMLElement
                                ).style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <span
                          style={{
                            display: user.profilePhoto ? "none" : "flex",
                          }}
                          className="w-full h-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-xs items-center justify-center select-none uppercase tracking-wider"
                        >
                          {user.name
                            ? (user.name.trim().split(/\s+/).length >= 2
                                ? `${user.name.trim().split(/\s+/)[0][0]}${user.name.trim().split(/\s+/)[1][0]}`
                                : user.name.slice(0, 1)
                              ).toUpperCase()
                            : "U"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-gray-600">
                      {user.employeeCode}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700">
                      {user.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{user.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {user.companyId?.companyName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {user.roleId?.roleName}
                    </td>

                    {/* Sales Hierarchy Column */}
                    <td className="px-4 py-2.5">
                      {h ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              h.roleLevel === "RSM"
                                ? "bg-teal-100 text-teal-800 border border-teal-200"
                                : h.roleLevel === "VP"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : h.roleLevel === "NSM"
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : h.roleLevel === "ZSM"
                                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                                      : h.roleLevel === "ASM"
                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {h.roleLevel === "RSM"
                              ? "RSM (Regional)"
                              : h.roleLevel === "VP"
                                ? "VP Sales"
                                : h.roleLevel === "NSM"
                                  ? "NSM (National)"
                                  : h.roleLevel === "ZSM"
                                    ? "ZSM (Zonal)"
                                    : h.roleLevel === "ASM"
                                      ? "ASM (Area)"
                                      : "M.R. / S.R."}
                          </span>
                          {h.reportsToName && (
                            <span className="text-[10px] text-gray-500 font-medium">
                              Reports:{" "}
                              <span className="font-semibold text-gray-700">
                                {h.reportsToName}
                              </span>
                            </span>
                          )}
                          {(h.state || h.region) && (
                            <span className="text-[10px] text-slate-400">
                              {[h.state, h.region].filter(Boolean).join(" / ")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/dashboard/${user.role}/master/sales-hierarchy`}
                          className="text-[11px] text-indigo-600 hover:underline font-medium"
                        >
                          + Assign Hierarchy
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-gray-600">
                      {user.department}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {user.designation}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{user.mobile}</td>

                    <td className="px-4 py-2.5 text-center">
                      {user.status === "Active" ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-700 ring-1 ring-emerald-400/30">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-400/20 text-red-700 ring-1 ring-red-400/30">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <PermissionButton permission="users.edit">
                          <Link
                            href={`/dashboard/${user.role}/users/edit/${user._id}`}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-amber-500/90 hover:bg-amber-500 transition-colors"
                          >
                            Edit
                          </Link>
                        </PermissionButton>

                        <Link
                          href={`/dashboard/${user.role}/users/assignment`}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors whitespace-nowrap"
                          title="Assign Reporting Manager, Products, and Parties"
                        >
                          Assign Scope
                        </Link>

                        <Link
                          href={`/dashboard/${user.role}/users/permission/${user._id}`}
                          className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 transition-colors"
                        >
                          Permission
                        </Link>

                        <PermissionButton permission="users.delete">
                          <DeleteUserButton userId={user._id.toString()} />
                        </PermissionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="relative flex justify-center items-center gap-2 px-4 py-3 bg-white/30 border-t border-gray-200/70">
          <button
            className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={
                p === currentPage
                  ? "px-3 py-1 rounded-lg text-xs font-semibold text-white bg-amber-500/90"
                  : "px-3 py-1 rounded-lg text-xs font-medium text-gray-600 bg-white/50 hover:bg-white/70 transition-colors"
              }
            >
              {p}
            </button>
          ))}

          <button
            className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
