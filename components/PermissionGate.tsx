"use client";

import { ReactNode } from "react";
import { usePermission } from "@/context/PermissionContext";

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
}

export default function PermissionGate({
  permission,
  children,
}: PermissionGateProps) {
  const { loading, can } = usePermission();

  // Permission data abhi load ho rahi hai
  if (loading) {
    return null;
  }

  // User ke paas permission nahi hai
  if (!can(permission)) {
    return null;
  }

  // Permission available hai
  return <>{children}</>;
}