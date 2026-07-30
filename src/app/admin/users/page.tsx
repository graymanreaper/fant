import { notFound } from "next/navigation";
import { auth, entraConfigured } from "@/auth";
import { listAppUsers } from "@/lib/access";
import AdminUserRow, { type AdminUserRowData } from "@/components/AdminUserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Only admins can see this — belt and suspenders on top of middleware.
  if (entraConfigured) {
    const session = await auth();
    const userWithAccess = session?.user as
      | { role?: unknown }
      | undefined;
    const role =
      typeof userWithAccess?.role === "string"
        ? userWithAccess.role
        : undefined;
    if (role !== "admin") notFound();
  }

  const session = entraConfigured ? await auth() : null;
  const currentEmail = session?.user?.email ?? null;
  const users = await listAppUsers();
  const rows: AdminUserRowData[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    status: u.status,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    approvedAt: u.approvedAt ? u.approvedAt.toISOString() : null,
    approvedBy: u.approvedBy,
  }));

  const pending = rows.filter((u) => u.status === "pending").length;

  return (
    <div>
      <h1 className="page-title">Users</h1>
      <div className="card">
        <p className="muted">
          Total {rows.length} user{rows.length === 1 ? "" : "s"}
          {pending > 0
            ? ` — ${pending} waiting for approval.`
            : " — none awaiting approval."}
        </p>
        <table className="grid">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 80 }}>Role</th>
              <th style={{ width: 110 }}>Signed up</th>
              <th>Approved by</th>
              <th style={{ width: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                currentUserEmail={currentEmail}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
