import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, entraConfigured, signIn } from "@/auth";

export default async function SignInPage() {
  if (!entraConfigured) redirect("/investors");

  const session = await auth();
  if (session?.user) redirect("/investors");

  return (
    <div className="signin-shell">
      <div className="signin-panel">
        <Image
          src="/fantaz-logo-wide-white.webp"
          alt="FantaZ"
          width={620}
          height={180}
          className="signin-logo"
          priority
        />
        <h1>Welcome to FantaZ Investor &amp; Ledger System</h1>
        <p>Log in to continue</p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/investors" });
          }}
        >
          <button type="submit" className="btn btn-primary signin-button">
            Microsoft Entra ID
          </button>
        </form>
      </div>
      <footer className="signin-footer">
        Created by Josh Wylie on 7/12/2025 with the help of Claude Code and Codex
      </footer>
    </div>
  );
}
