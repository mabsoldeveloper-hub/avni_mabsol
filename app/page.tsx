import LandingPage from "@/components/LandingPage";
import "./landing.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let targetUrl: string | null = null;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026";
      const decoded = jwt.verify(token, secret) as any;
      if (decoded) {
        if (
          decoded.isSuperAdmin ||
          decoded.roleType === "SuperAdmin" ||
          decoded.roleType === "super-admin"
        ) {
          targetUrl = "/dashboard/super-admin";
        } else {
          const roleSlug = decoded.roleType
            ? String(decoded.roleType).toLowerCase().trim().replace(/[\s_]+/g, "-")
            : "admin";
          targetUrl = `/dashboard/${roleSlug}`;
        }
      }
    } catch {
      // Invalid/expired token - show landing page normally
    }
  }

  // redirect must be outside try/catch so Next.js NEXT_REDIRECT is handled correctly
  if (targetUrl) {
    redirect(targetUrl);
  }

  return <LandingPage />;
}