"use client";

import { useRouter } from "next/navigation";

interface Props {
  userId: string;
}

export default function DeleteUserButton({
  userId,
}: Props) {
  const router = useRouter();

  const deleteUser = async () => {
    const ok = confirm(
      "Are you sure you want to delete this user?"
    );

    if (!ok) return;

    const res = await fetch(
      `/api/users/${userId}`,
      {
        method: "DELETE",
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("User Deleted Successfully");

      router.refresh(); // Refresh Server Component
    } else {
      alert(data.error || "Delete Failed");
    }
  };

  return (
    <button
      className="px-3.5 py-1 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer shadow-2xs"
      onClick={deleteUser}
    >
      Delete
    </button>
  );
}