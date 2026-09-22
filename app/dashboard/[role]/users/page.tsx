import PermissionButton from "@/components/PermissionButton";
import ProtectedPage from "@/components/ProtectedPage";
import UsersTable from "@/components/UsersTable";
import Link from "next/link";
import { fetchUsersList } from "@/app/api/users/route";

export const dynamic = "force-dynamic";

async function getUsers() {
  try {
    const data = await fetchUsersList();

    if (!data?.success) {
      return {
        users: [],
        hierarchy: null,
      };
    }

    // Convert to plain serializable objects for Client Component
    const users = JSON.parse(JSON.stringify(data.users || []));

    return {
      users: Array.isArray(users) ? users : [],
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