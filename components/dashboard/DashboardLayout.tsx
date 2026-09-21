"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const isMobile = window.innerWidth < 992;
  
      setMobile(isMobile);
  
      if (isMobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
  
    checkScreen();
    setMounted(true);
  
    window.addEventListener("resize", checkScreen);
  
    return () =>
      window.removeEventListener(
        "resize",
        checkScreen
      );
  }, []);

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobile={mobile}
      />

{!collapsed && mobile && (
  <div
    onClick={() => setCollapsed(true)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      zIndex: 1040,
    }}
  />
)}

        <div
          style={{
            paddingLeft: mobile
              ? "0px"
              : collapsed
              ? "76px"
              : "265px",
            width: "100%",
            transition: mounted ? "padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            minHeight: "100vh",
            overflowX: "clip",
          }}
        >




<Topbar
  setCollapsed={setCollapsed}
  collapsed={collapsed}
  mobile={mobile}
/>

        <div className="container-fluid p-4">
          {children}
        </div>
      </div>
    </>
  );
}