import ProtectedPage from "@/components/ProtectedPage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ExecutiveAIDashboardContent from "@/components/ExecutiveAIDashboardContent";

export default async function ExecutiveAIDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    redirect("/login");
  }

  return (
    <ProtectedPage permission="dashboard.view">
      <ExecutiveAIDashboardContent />
    </ProtectedPage>
  );
}
