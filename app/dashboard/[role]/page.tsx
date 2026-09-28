import ClientDashboardWrapper from "@/components/dashboard/ClientDashboardWrapper";
import ProtectedPage from "@/components/ProtectedPage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RoleDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const secret = process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026";
    jwt.verify(token, secret);
  } catch {
    redirect("/login");
  }

  return (
    <ProtectedPage permission="dashboard.view">
      <ClientDashboardWrapper />
    </ProtectedPage>
  );
}



