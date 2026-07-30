import { NextResponse } from "next/server";
import { auth, entraConfigured } from "@/auth";
import { setUserRole, setUserStatus } from "@/lib/access";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function requireAdmin(): Promise<{ email: string } | Response> {
  if (!entraConfigured) return { email: "dev" };
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return { email: session.user.email ?? "unknown" };
}

export async function PATCH(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    role?: string;
  };

  if (body.status) {
    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'." },
        { status: 400 },
      );
    }
    await setUserStatus(id, body.status, gate.email);
  }

  if (body.role) {
    if (body.role !== "user" && body.role !== "admin") {
      return NextResponse.json(
        { error: "Role must be 'user' or 'admin'." },
        { status: 400 },
      );
    }
    await setUserRole(id, body.role);
  }

  return NextResponse.json({ ok: true });
}
