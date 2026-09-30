import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import NavLinks from "@/components/NavLinks";

export default async function SiteHeader() {
  const viewer = await getViewer();
  if (!viewer.member && !viewer.email) return null; // login page

  return (
    <header className="no-print bg-brand text-onbrand">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold">Budget Analytics</span>
          <span className="hidden text-xs text-onbrand2 sm:inline">Committee on Appropriations · Vice Chair&apos;s office</span>
        </Link>
        <NavLinks isAdmin={viewer.member?.role === "admin"} />
        <div className="ml-auto flex items-center gap-3 text-xs text-onbrand2">
          {viewer.demo ? (
            <span className="badge bg-gold text-brand">Demo mode</span>
          ) : (
            <>
              <Link href="/account" className="hidden rounded px-2 py-1 hover:bg-brand2 hover:text-onbrand md:inline" title="Change password">
                {viewer.member?.full_name ?? viewer.email}
              </Link>
              <form action={signOut}>
                <button className="rounded px-2 py-1 hover:bg-brand2 hover:text-onbrand">Sign out</button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
