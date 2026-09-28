import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let targetRole = "admin";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
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