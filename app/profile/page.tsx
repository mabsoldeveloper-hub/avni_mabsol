"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaUserCircle,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaShieldAlt,
  FaSave,
  FaSyncAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    designation: "",
    department: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          const u = data.user;
          setUser(u);
          setForm({
            name: u.name || "",
            email: u.email || "",
            mobile: u.mobile || "",
            designation: u.designation || "",
            department: u.department || "",
            city: u.city || "",
            state: u.state || "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg("");
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccessMsg("Profile updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";

  const labelClass =
    "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <FaSyncAlt size={24} className="animate-spin text-indigo-600" />
        <p className="text-xs font-semibold">Loading your enterprise profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white border border-indigo-500/20 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 z-10 text-center sm:text-left">
          <div className="w-24 h-24 rounded-2xl ring-4 ring-white/20 overflow-hidden bg-indigo-950 flex items-center justify-center shrink-0 shadow-lg">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-3xl font-black text-indigo-300">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                {user?.roleName || user?.roleType || "Enterprise User"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center gap-1">
                <FaCheckCircle size={9} /> Verified Account
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{user?.name || "Account Profile"}</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">{user?.email || "No email provided"}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-400">
              {user?.employeeCode && (
                <span>ID: <strong className="text-slate-200">{user.employeeCode}</strong></span>
              )}
              {user?.headquarter && (
                <span className="flex items-center gap-1">
                  <FaMapMarkerAlt size={10} className="text-indigo-400" /> {user.headquarter}
                </span>
              )}
              {user?.companyName && (
                <span className="flex items-center gap-1">
                  <FaBuilding size={10} className="text-indigo-400" /> {user.companyName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Details */}
      <form
        onSubmit={handleUpdate}
        className="rounded-2xl p-6 sm:p-7 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FaShieldAlt className="text-indigo-600" /> Personal &amp; Organization Profile Details
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage your user profile information and contact details.</p>
          </div>

          {successMsg && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <FaCheckCircle /> {successMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input
              type="text"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="email"
                disabled
                className={`${inputClass} pl-9 opacity-80 cursor-not-allowed`}
                value={form.email}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Mobile Number</label>
            <div className="relative">
              <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="tel"
                className={`${inputClass} pl-9`}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Designation</label>
            <input
              type="text"
              className={inputClass}
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Department</label>
            <input
              type="text"
              className={inputClass}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              className={inputClass}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            <FaSave /> {saving ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
