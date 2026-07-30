import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

/**
 * Entra ID sign-in is active only when the app registration env vars are set.
 * With them unset (e.g. local development) the app runs without a login wall.
 */
export const entraConfigured = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
);

// Paths that stay accessible to signed-in-but-not-yet-approved users.
const PENDING_ALLOWED_PATHS = new Set<string>(["/pending-approval"]);

/** Pure env-var fallback used when the AppUsers table isn't reachable. */
function envAllowsSignIn(email: string): boolean {
  const e = email.toLowerCase();
  const admins = (process.env.AUTH_ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (admins.includes(e)) return true;
  const domains = (process.env.AUTH_ALLOWED_DOMAINS ?? "")
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  return domains.some((d) => e.endsWith("@" + d));
}

function claimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function emailFromClaims(
  user?: { email?: string | null; name?: string | null },
  profile?: unknown,
  token?: { email?: unknown; name?: unknown },
): string | undefined {
  const claims =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : {};

  return (
    claimString(user?.email) ??
    claimString(claims.email) ??
    claimString(claims.preferred_username) ??
    claimString(claims.upn) ??
    claimString(claims.unique_name) ??
    claimString(token?.email)
  );
}

function nameFromClaims(
  user?: { name?: string | null },
  profile?: unknown,
  token?: { name?: unknown },
): string | undefined {
  const claims =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : {};

  return (
    claimString(user?.name) ??
    claimString(claims.name) ??
    claimString(claims.displayName) ??
    claimString(token?.name)
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: entraConfigured ? [MicrosoftEntraID] : [],
  callbacks: {
    // Runs after the OAuth callback. Provision the AppUser row and decide
    // whether the sign-in is allowed. Runs in the Node runtime.
    async signIn({ user, profile }) {
      if (!entraConfigured) return true;
      const email = emailFromClaims(user, profile);
      const name = nameFromClaims(user, profile);
      if (!email) {
        console.error("[auth] Microsoft sign-in did not include an email claim.");
        return false;
      }
      try {
        const { resolveAccess } = await import("@/lib/access");
        const access = await resolveAccess(email, name);
        if (access.status !== "approved") {
          // Non-false return values are used as the post-sign-in redirect URL.
          return "/pending-approval";
        }
        return true;
      } catch (error) {
        // AppUsers table not yet created, or DB unreachable. Fall back to
        // the env allowlist so at least the configured admins can sign in
        // and finish setting things up.
        console.error("[auth] resolveAccess failed on signIn:", error);
        return envAllowsSignIn(email) ? true : "/pending-approval";
      }
    },

    // JWT claims. We fold role + status into the token so middleware (Edge)
    // can gate access without touching the database.
    async jwt({ token, user, profile }) {
      const email = emailFromClaims(user, profile, token);
      const name = nameFromClaims(user, profile, token);

      // First sign-in OR upgrade legacy tokens issued before we stored role.
      if (email && (user?.email || profile || !token.role)) {
        token.email = email;
        if (name) token.name = name;
        try {
          const { resolveAccess } = await import("@/lib/access");
          const access = await resolveAccess(email, name);
          token.role = access.role;
          token.status = access.status;
        } catch (error) {
          // AppUsers table not reachable — fall back to env allowlist so
          // configured admins still get in before db:push has been run.
          console.error("[auth] resolveAccess failed in jwt callback:", error);
          if (envAllowsSignIn(email)) {
            token.role = "admin";
            token.status = "approved";
          } else {
            token.role = "user";
            token.status = "pending";
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const userWithAccess = session.user as typeof session.user & {
          role?: unknown;
          status?: unknown;
        };
        userWithAccess.role = token.role ?? "user";
        userWithAccess.status = token.status ?? "pending";
      }
      return session;
    },

    // Middleware gate. Runs on the Edge runtime for every request that
    // matches the middleware matcher.
    authorized({ auth: session, request }) {
      if (!entraConfigured) return true;
      const path = request.nextUrl.pathname;

      // The waiting-room page has to stay reachable no matter what.
      if (PENDING_ALLOWED_PATHS.has(path)) return true;

      if (!session?.user) return false;

      const userWithAccess = session.user as typeof session.user & {
        role?: unknown;
        status?: unknown;
      };
      const status =
        typeof userWithAccess.status === "string"
          ? userWithAccess.status
          : undefined;
      const role =
        typeof userWithAccess.role === "string" ? userWithAccess.role : undefined;

      if (status !== "approved") {
        return Response.redirect(new URL("/pending-approval", request.url));
      }

      if (path.startsWith("/admin") && role !== "admin") {
        return Response.redirect(new URL("/", request.url));
      }

      return true;
    },
  },
});
