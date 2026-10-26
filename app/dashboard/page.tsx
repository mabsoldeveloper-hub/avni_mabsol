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
  let isSuperAdmin = false;
  try {
    const secret = process.env.JWT_SECRET || "MabsolCRM@2026SecretKey";
    const decoded = jwt.verify(token, secret) as any;
    const email = String(decoded?.email || "").toLowerCase().trim();
    const superEmail = (process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim();
    const roleType = String(decoded?.roleType || "").toLowerCase().trim();

    if (
      decoded?.isSuperAdmin === true ||
      email === superEmail ||
      email === "mabsoldeveloper@gmail.com" ||
      roleType === "superadmin" ||
      roleType === "super-admin"
    ) {
      isSuperAdmin = true;
    } else if (decoded?.roleType) {
      targetRole = String(decoded.roleType).toLowerCase().trim().replace(/[\s_]+/g, "-");
    }
  } catch {
    redirect("/login");
  }

  if (isSuperAdmin) {
    redirect("/dashboard/super-admin/dashboard");
  }

  redirect(`/dashboard/${targetRole}`);
}
