import "server-only";
import { prisma } from "@/lib/prisma";

export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "user" | "admin";

export interface AccessResult {
  status: UserStatus;
  role: UserRole;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const ALLOWED_DOMAINS = parseList(process.env.AUTH_ALLOWED_DOMAINS);
const ADMIN_EMAILS = parseList(process.env.AUTH_ADMIN_EMAILS);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function domainOf(email: string): string {
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(at + 1) : "";
}

/**
 * Look up (or provision) an AppUser record on sign-in.
 *
 * - Emails matching AUTH_ADMIN_EMAILS are always approved and set to admin.
 * - Emails whose domain matches AUTH_ALLOWED_DOMAINS are auto-approved.
 * - Everyone else is provisioned as `pending` and blocked from the app
 *   until an administrator approves them.
 */
export async function resolveAccess(
  email: string,
  name?: string | null,
): Promise<AccessResult> {
  const normalized = normalizeEmail(email);
  const isConfiguredAdmin = ADMIN_EMAILS.includes(normalized);
  const domainAllowed = ALLOWED_DOMAINS.includes(domainOf(normalized));
  const autoApprove = isConfiguredAdmin || domainAllowed;

  const existing = await prisma.appUser.findUnique({
    where: { email: normalized },
  });

  if (!existing) {
    const status: UserStatus = autoApprove ? "approved" : "pending";
    const role: UserRole = isConfiguredAdmin ? "admin" : "user";
    await prisma.appUser.create({
      data: {
        email: normalized,
        name: name ?? null,
        status,
        role,
        approvedAt: status === "approved" ? new Date() : null,
        approvedBy: status === "approved" ? "auto" : null,
      },
    });
    return { status, role };
  }

  // Keep configured admins in sync — promote if they were previously non-admin
  // (e.g. AUTH_ADMIN_EMAILS was updated after they first signed in).
  if (
    isConfiguredAdmin &&
    (existing.role !== "admin" || existing.status !== "approved")
  ) {
    await prisma.appUser.update({
      where: { email: normalized },
      data: {
        role: "admin",
        status: "approved",
        approvedAt: existing.approvedAt ?? new Date(),
        approvedBy: existing.approvedBy ?? "auto",
        name: existing.name ?? name ?? null,
      },
    });
    return { status: "approved", role: "admin" };
  }

  // Fill in name if we only just learned it.
  if (!existing.name && name) {
    await prisma.appUser.update({
      where: { email: normalized },
      data: { name },
    });
  }

  return {
    status: existing.status as UserStatus,
    role: existing.role as UserRole,
  };
}

/** Fetch every AppUser row, ordered pending first for the admin screen. */
export async function listAppUsers() {
  return prisma.appUser.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

export async function setUserStatus(
  id: number,
  status: UserStatus,
  actorEmail: string,
): Promise<void> {
  await prisma.appUser.update({
    where: { id },
    data: {
      status,
      approvedAt: status === "approved" ? new Date() : null,
      approvedBy: status === "approved" ? actorEmail : null,
    },
  });
}

export async function setUserRole(id: number, role: UserRole): Promise<void> {
  await prisma.appUser.update({ where: { id }, data: { role } });
}
