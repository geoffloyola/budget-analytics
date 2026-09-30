import Link from "next/link";
import { LogOut } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import Sidebar from "@/components/Sidebar";

// The app frame: a sidebar for signed-in users (a slide-out menu on phones),
// a slim top bar with Help and Sign in for everyone else.
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer.member && !viewer.email) {
    return (
      <>
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
        {children}
      </>
    );
  }

  const signOutButton = (
    <form action={signOut} className="flex-1">
      <button className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-ink2 hover:bg-surface hover:text-ink">
        <LogOut aria-hidden size={14} /> Sign out
      </button>
    </form>
  );

  return (
    <div className="lg:flex">
      <Sidebar
        user={{
          name: viewer.member?.full_name ?? viewer.email ?? "Signed in",
          role: viewer.member?.role ?? "no access yet",
          isAdmin: viewer.member?.role === "admin",
          demo: viewer.demo,
        }}
        signOut={signOutButton}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
