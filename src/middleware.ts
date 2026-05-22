export { auth as middleware } from "@/auth";

export const config = {
  // Run on every route except Next internals, the auth endpoints and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
