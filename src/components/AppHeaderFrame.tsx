"use client";

import { usePathname } from "next/navigation";

export default function AppHeaderFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/signin") return null;
  return <>{children}</>;
}
