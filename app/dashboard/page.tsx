import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let targetRole = "admin";
  try {
    const secret = process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026";
    const decoded = jwt.verify(token, secret) as any;
    if (decoded?.isSuperAdmin || decoded?.roleType === "SuperAdmin") {
      targetRole = "super-admin";
    } else if (decoded?.roleType) {
      targetRole = String(decoded.roleType).toLowerCase().trim().replace(/[\s_]+/g, "-");
    }
  } catch {
    redirect("/login");
  }

  redirect(`/dashboard/${targetRole}`);
}
