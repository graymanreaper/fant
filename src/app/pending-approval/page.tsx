import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div>
      <h1 className="page-title">Access pending approval</h1>
      <div className="card">
        <p>
          Thanks for signing in. Your account has been recorded and is now
          waiting for an administrator to grant access.
        </p>
        <p>
          You&apos;ll be able to sign in and use the app once you&apos;ve been
          approved. Reach out to your administrator if you need to speed this
          up.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link href="/api/auth/signout" className="btn">
            Sign out
          </Link>
        </p>
      </div>
    </div>
  );
}
