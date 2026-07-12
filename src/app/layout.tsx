import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth, entraConfigured, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "FantaZ -- Investor & Ledger System",
  description: "Web application migrated from the Microsoft Access database.",
  icons: {
    icon: "/fantaz-logo.png",
    shortcut: "/fantaz-logo.png",
    apple: "/fantaz-logo.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = entraConfigured ? await auth() : null;

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <span className="brand">
            <Image
              src="/fantaz-logo.png"
              alt=""
              width={18}
              height={18}
              className="brand-logo"
              priority
            />
            <span>FantaZ</span>
          </span>
          <nav>
            <Link href="/investors">Investors</Link>
            <Link href="/investors/new">New Member</Link>
            <Link href="/transactions">Transactions</Link>
            <Link href="/transactions/new">New Transaction</Link>
            <Link href="/reports">Reports</Link>
          </nav>
          <span className="spacer" />
          {session?.user ? (
            <span className="user">
              {session.user.name ?? session.user.email}{" "}
              <form
                style={{ display: "inline" }}
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className="linkbutton">
                  (sign out)
                </button>
              </form>
            </span>
          ) : null}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
