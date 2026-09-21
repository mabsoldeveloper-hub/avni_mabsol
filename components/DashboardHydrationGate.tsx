"use client";
import { useEffect, useState } from "react";
export default function DashboardHydrationGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div aria-hidden="true" style={{ minHeight: "100vh" }} />;
  return <>{children}</>;
}
