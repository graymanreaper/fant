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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: entraConfigured ? [MicrosoftEntraID] : [],
  callbacks: {
    // Runs after the OAuth callback. Provision the AppUser row and decide
    // whether the sign-in is allowed. Runs in the Node runtime.
    async signIn({ user }) {
      if (!entraConfigured) return true;
      if (!user?.email) return false;
      const { resolveAccess } = await import("@/lib/access");
      const access = await resolveAccess(user.email, user.name);
      if (access.status !== "approved") {
        // Non-false return values are used as the post-sign-in redirect URL.
        return "/pending-approval";
      }
      return true;
    },

    // JWT claims. We fold role + status into the token so middleware (Edge)
    // can gate access without touching the database.
    async jwt({ token, user }) {
      const email =
        (user?.email as string | undefined) ??
        (token.email as string | undefined);
      const name =
        (user?.name as string | null | undefined) ??
        (token.name as string | null | undefined);

      // First sign-in OR upgrade legacy tokens issued before we stored role.
      if (email && (user?.email || !token.role)) {
        try {
          const { resolveAccess } = await import("@/lib/access");
          const access = await resolveAccess(email, name);
          token.role = access.role;
          token.status = access.status;
        } catch {
          // AppUsers table may not exist yet; default to pending so admin
          // can promote once db:push has been run.
          if (!token.role) token.role = "user";
          if (!token.status) token.status = "pending";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role ?? "user";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).status = token.status ?? "pending";
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (session.user as any).status as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = (session.user as any).role as string | undefined;

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
