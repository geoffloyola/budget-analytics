import { LogOut } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import Sidebar from "@/components/Sidebar";
import SignedOutBar from "@/components/SignedOutBar";

// The app frame: a sidebar for signed-in users (a slide-out menu on phones),
// a slim top bar with Help and Sign in for everyone else.
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer.member && !viewer.email) {
    return (
      <>
        <SignedOutBar />
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
