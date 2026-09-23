"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
  };

  return (
    <button
      onClick={logout}
      className="w-full py-2 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs border border-rose-600 cursor-pointer"
    >
      Logout
    </button>
  );
}