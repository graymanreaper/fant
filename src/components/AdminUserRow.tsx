"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminUserRowData {
  id: number;
  email: string;
  name: string | null;
  status: "pending" | "approved" | "rejected" | string;
  role: "user" | "admin" | string;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export default function AdminUserRow({
  user,
  currentUserEmail,
}: {
  user: AdminUserRowData;
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf =
    currentUserEmail !== null &&
    currentUserEmail.toLowerCase() === user.email.toLowerCase();

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Update failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>{user.email}</td>
      <td>{user.name ?? ""}</td>
      <td>
        <span
          className={`pill ${
            user.status === "approved"
              ? "pill-active"
              : user.status === "pending"
                ? ""
                : "pill-inactive"
          }`}
        >
          {user.status}
        </span>
      </td>
      <td>{user.role}</td>
      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
      <td>{user.approvedBy ?? ""}</td>
      <td>
        {error ? (
          <span className="muted" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        ) : null}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {user.status !== "approved" ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => patch({ status: "approved" })}
            >
              Approve
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={busy || isSelf}
              title={isSelf ? "You can't reject yourself." : ""}
              onClick={() => patch({ status: "rejected" })}
            >
              Reject
            </button>
          )}
          {user.role === "admin" ? (
            <button
              type="button"
              className="btn"
              disabled={busy || isSelf}
              title={isSelf ? "You can't demote yourself." : ""}
              onClick={() => patch({ role: "user" })}
            >
              Remove admin
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => patch({ role: "admin", status: "approved" })}
            >
              Make admin
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
