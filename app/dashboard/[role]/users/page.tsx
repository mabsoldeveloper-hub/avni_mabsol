import PermissionButton from "@/components/PermissionButton";
import ProtectedPage from "@/components/ProtectedPage";
import UsersTable from "@/components/UsersTable";
import Link from "next/link";
import { cookies } from "next/headers";

type UsersApiResponse = {
  success?: boolean;
  users?: any[];
  hierarchy?: {
    currentUserId?: string;
    currentRole?: string;
    isAdmin?: boolean;
    totalAccessibleUsers?: number;
  };
  error?: string;
};

async function getUsers() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";

    const res = await fetch("http://localhost:3000/api/users", {
      method: "GET",
      headers: {
        ...(token ? { Cookie: `token=${token}` } : {}),
      },
      cache: "no-store",
    });

    const data: UsersApiResponse = await res.json();

    if (!res.ok || !data?.success) {
      console.error(
        "GET /api/users failed:",
        data?.error || res.statusText
      );

      return {
        users: [],
        hierarchy: null,
      };
    }

    return {
      users: Array.isArray(data.users) ? data.users : [],
      hierarchy: data.hierarchy || null,
    };
  } catch (error) {
    console.error("Users page: failed to load users:", error);

    return {
      users: [],
      hierarchy: null,
    };
  }
}

export default async function UsersPage() {
  const { users, hierarchy } = await getUsers();

  // Current logged-in user's role
  const currentRole = hierarchy?.currentRole;

  // Dynamic users/create URL
  const createUserHref = currentRole
    ? `/dashboard/${currentRole}/users/create`
    : "/dashboard";

  return (
    <ProtectedPage permission="users.view">
      <div
        className="card shadow border-0"
        style={{
          borderRadius: "16px",
        }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 className="mb-1">Users Management</h3>

              {hierarchy && (
                <div className="text-muted small">
                  <span className="fw-semibold">
                    {hierarchy.currentRole || "User"}
                  </span>

                  {" • "}

                  {hierarchy.isAdmin
                    ? "All users"
                    : `${hierarchy.totalAccessibleUsers || 0} users in your hierarchy`}
                </div>
              )}
            </div>

            <PermissionButton permission="users.create">
              <Link
                href={createUserHref}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-[#343872] hover:bg-[#282b57] transition-all shadow-xs cursor-pointer"
              >
                + Create User
              </Link>
            </PermissionButton>
          </div>

          <UsersTable users={users} />
        </div>
      </div>
    </ProtectedPage>
  );
}