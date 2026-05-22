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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: entraConfigured ? [MicrosoftEntraID] : [],
  callbacks: {
    authorized({ auth: session }) {
      // No provider configured -> open access (development).
      if (!entraConfigured) return true;
      return Boolean(session?.user);
    },
  },
});
