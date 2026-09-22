"use client";

import { useEffect, useState } from "react";

interface ProfileForm {
  name: string;
  email: string;
  mobile: string;
  employeeCode: string;
  companyName: string;
  roleName: string;
  department: string;
  designation: string;
  gender: string;
  dob: string;
  joiningDate: string;
  status: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  profilePhoto: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PRIMARY = "var(--color-primary, #2563eb)";

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
      <div
        className="flex items-center gap-2 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: accent }}
      >
        <span className="h-2 w-2 rounded-full bg-white/80" />
        {title}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-inner backdrop-blur-md transition focus:border-primary/50 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30";

const readOnlyClass =
  "w-full rounded-2xl border border-white/50 bg-slate-100/60 px-4 py-2.5 text-sm text-slate-500 shadow-inner backdrop-blur-md cursor-not-allowed";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    mobile: "",
    employeeCode: "",
    companyName: "",
    roleName: "",
    department: "",
    designation: "",
    gender: "",
    dob: "",
    joiningDate: "",
    status: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    profilePhoto: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");

      if (!res.ok) throw new Error("Failed to load profile");

      const data = await res.json();

      if (data.success && data.user) {
        const u = data.user;
        setForm({
          name: u.name || "",
          email: u.email || "",
          mobile: u.mobile || "",
          employeeCode: u.employeeCode || "",
          companyName: u.companyId?.companyName || "",
          roleName: u.roleId?.roleName || "",
          department: u.department || "",
          designation: u.designation || "",
          gender: u.gender || "",
          dob: u.dob ? u.dob.substring(0, 10) : "",
          joiningDate: u.joiningDate ? u.joiningDate.substring(0, 10) : "",
          status: u.status || "",
          address: u.address || "",
          city: u.city || "",
          state: u.state || "",
          country: u.country || "",
          pincode: u.pincode || "",
          profilePhoto: u.profilePhoto || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      alert("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleInputChange =
    (field: keyof ProfileForm) =>
      (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      };

  const updateProfile = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      alert("Confirm Password does not match.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      alert(data.message || "Profile updated successfully");

      // Reset password fields after update
      if (data.success) {
        setForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Profile Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("====>>",file);
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-user-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.url) {
        setForm((prev) => ({ ...prev, profilePhoto: data.url }));
        alert("Photo uploaded successfully");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to upload photo");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-6 py-4 text-sm font-medium text-slate-600 shadow-lg backdrop-blur-2xl">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4 py-8 sm:px-8">
      {/* ambient glass blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile summary */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-8 overflow-hidden rounded-[28px] border border-white/60 bg-white/50 p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
            <div className="relative mx-auto w-fit">
              <img
                src={form.profilePhoto || "/admin.jpg"}
                alt="Profile"
                width={130}
                height={130}
                className="mx-auto rounded-full border-4 border-white/80 object-cover shadow-lg"
                style={{ width: 130, height: 130, objectFit: "cover" }}
              />
            </div>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
              {form.name || "Employee"}
            </h3>
            <p className="text-sm text-slate-500">{form.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: PRIMARY }}
              >
                {form.roleName || "-"}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {form.companyName || "-"}
              </span>
            </div>

            <label className="mt-6 block cursor-pointer rounded-2xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm backdrop-blur-md transition hover:bg-white/90 active:scale-[0.97]">
              Change Profile Photo
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">
          {/* Basic Information */}
          <SectionCard title="Basic Information" accent={PRIMARY}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={handleInputChange("name")}
                />
              </Field>
              <Field label="Email">
                <input className={readOnlyClass} value={form.email} readOnly />
              </Field>
              <Field label="Mobile">
                <input
                  className={inputClass}
                  value={form.mobile}
                  onChange={handleInputChange("mobile")}
                />
              </Field>
              <Field label="Gender">
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={handleInputChange("gender")}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Date Of Birth">
                <input
                  type="date"
                  className={inputClass}
                  value={form.dob}
                  onChange={handleInputChange("dob")}
                />
              </Field>
            </div>
          </SectionCard>

          {/* Office Information */}
          <SectionCard title="Office Information" accent="#10b981">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employee Code">
                <input className={readOnlyClass} value={form.employeeCode} readOnly />
              </Field>
              <Field label="Company">
                <input className={readOnlyClass} value={form.companyName} readOnly />
              </Field>
              <Field label="Role">
                <input className={readOnlyClass} value={form.roleName} readOnly />
              </Field>
              <Field label="Department">
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={handleInputChange("department")}
                />
              </Field>
              <Field label="Designation">
                <input
                  className={inputClass}
                  value={form.designation}
                  onChange={handleInputChange("designation")}
                />
              </Field>
              <Field label="Joining Date">
                <input
                  type="date"
                  className={readOnlyClass}
                  value={form.joiningDate}
                  readOnly
                />
              </Field>
              <Field label="Status">
                <input className={readOnlyClass} value={form.status} readOnly />
              </Field>
            </div>
          </SectionCard>

          {/* Address Information */}
          <SectionCard title="Address Information" accent="#f59e0b">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Address">
                <textarea
                  rows={3}
                  className={`${inputClass} resize-none sm:col-span-2`}
                  value={form.address}
                  onChange={handleInputChange("address")}
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={handleInputChange("city")}
                />
              </Field>
              <Field label="State">
                <input
                  className={inputClass}
                  value={form.state}
                  onChange={handleInputChange("state")}
                />
              </Field>
              <Field label="Country">
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={handleInputChange("country")}
                />
              </Field>
              <Field label="Pincode">
                <input
                  className={inputClass}
                  value={form.pincode}
                  onChange={handleInputChange("pincode")}
                />
              </Field>
            </div>
          </SectionCard>

          {/* Change Password */}
          <SectionCard title="Change Password" accent="#f43f5e">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Current Password">
                <input
                  type="password"
                  className={inputClass}
                  value={form.currentPassword}
                  onChange={handleInputChange("currentPassword")}
                />
              </Field>
              <Field label="New Password">
                <input
                  type="password"
                  className={inputClass}
                  value={form.newPassword}
                  onChange={handleInputChange("newPassword")}
                />
              </Field>
              <Field label="Confirm Password">
                <input
                  type="password"
                  className={inputClass}
                  value={form.confirmPassword}
                  onChange={handleInputChange("confirmPassword")}
                />
              </Field>
            </div>
          </SectionCard>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pb-4">
            <button
              className="rounded-2xl border border-white/70 bg-white/60 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white/90 active:scale-[0.97]"
              onClick={() => window.location.reload()}
            >
              Cancel
            </button>
            <button
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
              disabled={saving}
              onClick={updateProfile}
            >
              {saving ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}