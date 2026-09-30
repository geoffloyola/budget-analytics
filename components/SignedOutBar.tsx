"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Top bar for signed-out pages (Help). The sign-in page has its own design.
export default function SignedOutBar() {
  if (usePathname() === "/login") return null;
  return (
    <header className="no-print border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/login" className="text-[15px] font-semibold text-ink">
          Budget Analytics
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/help" className="rounded-md px-2.5 py-1.5 text-ink2 hover:text-ink">
            Help
          </Link>
          <Link href="/login" className="btn-primary py-1.5">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
