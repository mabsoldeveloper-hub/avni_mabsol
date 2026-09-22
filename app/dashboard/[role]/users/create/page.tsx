"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaUserPlus,
  FaShieldAlt,
  FaBuilding,
  FaMapMarkerAlt,
  FaSitemap,
  FaIdCard,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaArrowLeft,
  FaCamera,
  FaMagic,
  FaSearch,
  FaPlus,
  FaTimes,
} from "react-icons/fa";

export default function CreateUserPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<"account" | "organization" | "hierarchy" | "personal">("account");

  const [companies, setCompanies] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // GST Auto-Verification State (same as signup page logic)
  const [gstInput, setGstInput] = useState("");
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [gstMessage, setGstMessage] = useState<string | null>(null);

  const [customAreaInput, setCustomAreaInput] = useState("");
  const [photoPreview, setPhotoPreview] = useState("/avatar.png");

  const [form, setForm] = useState({
    employeeCode: "",
    name: "",
    email: "",
    password: "",
    mobile: "",
    companyId: "",
    roleId: "",
    roleType: "MR",
    assignedAreaNames: [] as string[],
    department: "",
    designation: "",
    gender: "Male",
    dob: "",
    joiningDate: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    status: "Active",
    profilePhoto: "",
    // Sales Hierarchy fields
    salesHierarchyRole: "",
    salesHierarchyReportsTo: "",
    salesHierarchyState: "",
    salesHierarchyRegion: "",
  });

  useEffect(() => {
    loadCompanies();
    loadRoles();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        setUsersList(Array.isArray(data) ? data : data.users || []);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await fetch("/api/company-master");
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : (data?.companies || []));
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : (data?.roles || []));
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  // Live GST verification logic (from signup/register page)
  const handleVerifyGst = async () => {
    const cleanGst = gstInput.trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      alert("Please enter a 15-character GSTIN (e.g. 06AALCM8009M1Z1)");
      return;
    }

    try {
      setIsVerifyingGst(true);
      setGstMessage(null);

      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: cleanGst }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;

        // Auto-fill company details, address, city, state, pin, and territory
        const resolvedState = d.state || d.stateName || "";
        const resolvedCity = d.city || "";
        const resolvedAddress = d.address || "";
        const resolvedPincode = d.pincode || "";

        const newAreas = new Set(form.assignedAreaNames);
        if (resolvedCity) newAreas.add(resolvedCity);
        if (resolvedState) newAreas.add(resolvedState);

        setForm((prev) => ({
          ...prev,
          state: resolvedState || prev.state,
          city: resolvedCity || prev.city,
          address: resolvedAddress || prev.address,
          pincode: resolvedPincode || prev.pincode,
          salesHierarchyState: resolvedState || prev.salesHierarchyState,
          salesHierarchyRegion: resolvedCity ? `${resolvedCity} Region` : prev.salesHierarchyRegion,
          assignedAreaNames: Array.from(newAreas),
        }));

        const bName = d.businessName || d.legalName || d.tradeName || cleanGst;
        setGstMessage(`✓ Verified: ${bName} (${resolvedCity}, ${resolvedState})`);
      } else {
        setGstMessage(json.message || "GSTIN verification failed");
      }
    } catch {
      setGstMessage("Failed to connect to GST verification service");
    } finally {
      setIsVerifyingGst(false);
    }
  };

  const handleRoleChange = (selectedRoleId: string, autoApplyAreas: boolean = true) => {
    const matchedRole = roles.find((r) => String(r._id) === selectedRoleId);
    let rType = "MR";
    let shRole = "";

    if (matchedRole) {
      const rName = (matchedRole.roleName || "").toLowerCase();
      if (rName.includes("admin") || rName.includes("super")) {
        rType = "ADMIN";
      } else if (rName.includes("manager") || rName.includes("rsm") || rName.includes("zsm")) {
        rType = "MANAGER";
        shRole = rName.includes("zsm") ? "ZSM" : "RSM";
      } else {
        rType = "MR";
        shRole = "MR";
      }

      const roleAreaNames: string[] = matchedRole.assignedAreaNames || [];

      setForm((prev) => ({
        ...prev,
        roleId: selectedRoleId,
        roleType: rType,
        salesHierarchyRole: prev.salesHierarchyRole || shRole,
        assignedAreaNames: autoApplyAreas && roleAreaNames.length > 0 ? Array.from(new Set([...prev.assignedAreaNames, ...roleAreaNames])) : prev.assignedAreaNames,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        roleId: selectedRoleId,
      }));
    }
  };

  const handleAddCustomArea = () => {
    const trimmed = customAreaInput.trim();
    if (!trimmed) return;
    if (!form.assignedAreaNames.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        assignedAreaNames: [...prev.assignedAreaNames, trimmed],
      }));
    }
    setCustomAreaInput("");
  };

  const handleRemoveArea = (areaName: string) => {
    setForm((prev) => ({
      ...prev,
      assignedAreaNames: prev.assignedAreaNames.filter((a) => a !== areaName),
    }));
  };

  const saveUser = async () => {
    if (!form.name.trim()) {
      alert("Please enter the user's Full Name");
      return;
    }
    if (!form.email.trim()) {
      alert("Please enter the user's Email address");
      return;
    }
    if (!form.password.trim()) {
      alert("Please set a password for the new user");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create user");
        return;
      }

      alert("User account created successfully!");
      router.push("/dashboard/users");
    } catch (error) {
      alert("Failed to Create User");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";

  const labelClass =
    "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  const selectedRole = roles.find((r) => String(r._id) === form.roleId);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/users" className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1">
              <FaArrowLeft size={10} /> Users Management
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold">Create New User</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <FaUserPlus size={14} />
            </div>
            Create New Enterprise User
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/users"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={saveUser}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all hover:scale-102 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Save & Create User"}
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Profile Card Preview & Section Navigator */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="relative group mb-3">
              <img
                src={photoPreview}
                alt="Profile"
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
              />
              <label className="absolute inset-0 rounded-2xl bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] font-bold">
                <FaCamera size={14} className="mb-1" />
                Change
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      alert("Maximum file size is 2MB");
                      return;
                    }
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload-user-photo", {
                      method: "POST",
                      body: fd,
                    });
                    const data = await res.json();
                    if (data.success && data.url) {
                      setPhotoPreview(data.url);
                      setForm((prev) => ({ ...prev, profilePhoto: data.url }));
                    } else {
                      alert("Upload Failed");
                    }
                  }}
                />
              </label>
            </div>

            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {form.name || "New Team Member"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{form.email || "email@domain.com"}</p>

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {selectedRole?.roleName || "No Role Selected"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${form.status === "Active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                {form.status}
              </span>
            </div>

            {form.assignedAreaNames.length > 0 && (
              <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Areas ({form.assignedAreaNames.length})
                </span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {form.assignedAreaNames.map((area, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-medium text-slate-700 dark:text-slate-300">
                      📍 {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Navigation Tabs */}
          <div className="rounded-2xl p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <button
              onClick={() => setActiveSection("account")}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                activeSection === "account"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaShieldAlt size={12} /> Account &amp; Available Roles
            </button>
            <button
              onClick={() => setActiveSection("organization")}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                activeSection === "organization"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaBuilding size={12} /> GST &amp; Territory Assignment
            </button>
            <button
              onClick={() => setActiveSection("hierarchy")}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                activeSection === "hierarchy"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaSitemap size={12} /> Sales Hierarchy &amp; Reporting
            </button>
            <button
              onClick={() => setActiveSection("personal")}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                activeSection === "personal"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaIdCard size={12} /> Personal Info &amp; Address
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Section Form */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* SECTION 1: ACCOUNT & AVAILABLE ROLES */}
          {activeSection === "account" && (
            <div className="rounded-2xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-5 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaShieldAlt className="text-indigo-600" /> Account Credentials &amp; Role Assignment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a role from the available roles directory.</p>
              </div>

              {/* AVAILABLE ROLES SHOWCASE */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className={labelClass}>
                    ✨ Select System Role
                  </label>
                  <Link
                    href="/dashboard/roles/create"
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    + Create New Role
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const isSelected = String(r._id) === form.roleId;
                    const rName = r.roleName || "Role";
                    const roleAreas: string[] = r.assignedAreaNames || [];

                    return (
                      <div
                        key={r._id}
                        onClick={() => handleRoleChange(r._id, true)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              {rName.toLowerCase().includes("admin") ? "👑" : rName.toLowerCase().includes("manager") ? "📊" : "💼"}
                              {rName}
                            </span>
                            {isSelected && (
                              <FaCheckCircle className="text-indigo-600 shrink-0" size={14} />
                            )}
                          </div>
                          {r.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {r.description}
                            </p>
                          )}
                        </div>

                        {roleAreas.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1">
                            {roleAreas.slice(0, 2).map((a, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                                📍 {a}
                              </span>
                            ))}
                            {roleAreas.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                +{roleAreas.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Login Credentials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className={labelClass}>Employee Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-1042"
                    className={inputClass}
                    value={form.employeeCode}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="email"
                      placeholder="user@mabsolpharma.com"
                      className={`${inputClass} pl-9`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter secure password"
                      className={`${inputClass} pl-9 pr-9`}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <div className="relative">
                    <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      className={`${inputClass} pl-9`}
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Account Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active (Can Login)</option>
                    <option value="Inactive">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSection("organization")}
                  className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-all"
                >
                  Continue to Territory &amp; GST Setup ➔
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: COMPANY & GST / TERRITORY SETUP */}
          {activeSection === "organization" && (
            <div className="rounded-2xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaBuilding className="text-indigo-600" /> Organization &amp; GST-Powered Territory Setup
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Verify GSTIN to auto-fetch official location and assign field territories.</p>
              </div>

              {/* GST Auto-Fetch Tool */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Enter 15-digit GSTIN to auto-fetch State/City/Address (e.g. 06AALCM8009M1Z1)"
                    value={gstInput}
                    onChange={(e) => setGstInput(e.target.value.toUpperCase())}
                    className="w-full text-xs px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 uppercase outline-none font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyGst}
                  disabled={isVerifyingGst || !gstInput.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0 hover:bg-indigo-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FaSearch size={11} /> {isVerifyingGst ? "Verifying..." : "Fetch with GST"}
                </button>
              </div>

              {gstMessage && (
                <p className={`text-xs font-semibold ${gstMessage.startsWith("✓") ? "text-emerald-600" : "text-rose-500"}`}>
                  {gstMessage}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Assigned Company Master</label>
                  <select
                    className={inputClass}
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName} {c.companyCode ? `(${c.companyCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales & Marketing"
                    className={inputClass}
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Medical Representative"
                    className={inputClass}
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </div>

                {/* Custom Territory Area Input */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Add Territory / Assigned Areas</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type area/headquarter name (e.g. Mumbai Central, Pune District)"
                      value={customAreaInput}
                      onChange={(e) => setCustomAreaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomArea();
                        }
                      }}
                      className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomArea}
                      disabled={!customAreaInput.trim()}
                      className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <FaPlus size={10} /> Add Area
                    </button>
                  </div>
                </div>

                {/* Current Assigned Area Tags */}
                <div className="sm:col-span-2">
                  <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-h-12">
                    {form.assignedAreaNames.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No territory areas assigned yet. Type above or fetch via GST.</span>
                    ) : (
                      form.assignedAreaNames.map((area, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                        >
                          <FaMapMarkerAlt size={10} className="text-indigo-500" />
                          {area}
                          <button
                            type="button"
                            onClick={() => handleRemoveArea(area)}
                            className="hover:text-rose-500 ml-1 transition-colors"
                          >
                            <FaTimes size={10} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSection("account")}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  ← Back to Account
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("hierarchy")}
                  className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-all"
                >
                  Continue to Sales Hierarchy ➔
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: SALES HIERARCHY */}
          {activeSection === "hierarchy" && (
            <div className="rounded-2xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaSitemap className="text-indigo-600" /> Sales Hierarchy &amp; Management Tree
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure hierarchy level (ZSM → RSM → MR) and reporting supervisor.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sales Hierarchy Role</label>
                  <select
                    className={inputClass}
                    value={form.salesHierarchyRole}
                    onChange={(e) => setForm({ ...form, salesHierarchyRole: e.target.value })}
                  >
                    <option value="">None / Executive</option>
                    <option value="ZSM">ZSM (Zonal Sales Manager)</option>
                    <option value="RSM">RSM (Regional Sales Manager)</option>
                    <option value="MR">MR / SR (Field Sales Representative)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Direct Supervisor / Reports To</label>
                  <select
                    className={inputClass}
                    value={form.salesHierarchyReportsTo}
                    onChange={(e) => setForm({ ...form, salesHierarchyReportsTo: e.target.value })}
                  >
                    <option value="">None (Top Executive)</option>
                    {usersList.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {u.designation || u.roleName || "Executive"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>State / Territory Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    className={inputClass}
                    value={form.salesHierarchyState}
                    onChange={(e) => setForm({ ...form, salesHierarchyState: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Region / Headquarters</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai West Region"
                    className={inputClass}
                    value={form.salesHierarchyRegion}
                    onChange={(e) => setForm({ ...form, salesHierarchyRegion: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSection("organization")}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  ← Back to Territory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("personal")}
                  className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-all"
                >
                  Continue to Personal Details ➔
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: PERSONAL & ADDRESS DETAILS */}
          {activeSection === "personal" && (
            <div className="rounded-2xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FaIdCard className="text-indigo-600" /> Personal Details &amp; Permanent Address
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Demographic, joining dates, and contact address info.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className={labelClass}>Residential Address</label>
                  <textarea
                    rows={2}
                    placeholder="Enter complete street address..."
                    className={inputClass}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    className={inputClass}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    className={inputClass}
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 400001"
                    className={inputClass}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSection("hierarchy")}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  ← Back to Hierarchy
                </button>

                <button
                  type="button"
                  onClick={saveUser}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  {loading ? "Creating..." : "✓ Complete & Create User"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}