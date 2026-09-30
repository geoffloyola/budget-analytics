"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CircleHelp,
  FilePenLine,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MapPin,
  Menu,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
  X,
  Gavel,
} from "lucide-react";

const MAIN = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/legislation", label: "In Congress", icon: Gavel },
  { href: "/amendments", label: "Amendments", icon: FilePenLine },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/spending", label: "Spending", icon: Wallet },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/district", label: "District lens", icon: MapPin },
  { href: "/insights", label: "AI insights", icon: Sparkles },
];

export type SidebarUser = { name: string; role: string; isAdmin: boolean; demo: boolean };

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Menu; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition " +
        (active ? "bg-accentsoft text-accent" : "text-ink2 hover:bg-surface2 hover:text-ink")
      }
    >
      {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-accent" />}
      <Icon aria-hidden size={17} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-onaccent">
        <Landmark aria-hidden size={18} />
      </span>
      <span className="leading-tight">
        <span className="block text-[14px] font-semibold text-ink">Budget Analytics</span>
        <span className="block text-[11px] text-muted">Vice Chair&apos;s office</span>
      </span>
    </Link>
  );
}

function NavBody({ user, signOut, pathname }: { user: SidebarUser; signOut: ReactNode; pathname: string }) {
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <Brand />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Budget</p>
        <div className="space-y-0.5">
          {MAIN.map((l) => (
            <NavItem key={l.href} {...l} active={isActive(l.href)} />
          ))}
        </div>
        <p className="px-3 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Support</p>
        <div className="space-y-0.5">
          <NavItem href="/help" label="Help" icon={CircleHelp} active={isActive("/help")} />
          {user.isAdmin && <NavItem href="/import" label="Import data" icon={Upload} active={isActive("/import")} />}
        </div>
      </nav>
      <div className="m-3 rounded-xl bg-surface2 p-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-onaccent">
            {initials || "?"}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
            <span className="block text-[11px] capitalize text-muted">{user.demo ? "Demo mode" : user.role}</span>
          </span>
        </div>
        {!user.demo && (
          <div className="mt-2.5 flex gap-1">
            <Link href="/account" className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-ink2 hover:bg-surface hover:text-ink">
              <KeyRound aria-hidden size={14} /> Password
            </Link>
            {signOut}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ user, signOut }: { user: SidebarUser; signOut: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-surface lg:block">
        <NavBody user={user} signOut={signOut} pathname={pathname} />
      </aside>

      {/* Phone and tablet: top bar + slide-out menu */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 lg:hidden">
        <Brand />
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost p-2" aria-label="Open menu" aria-expanded={open}>
          <Menu size={20} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost absolute right-2 top-4 p-2" aria-label="Close menu">
              <X size={18} />
            </button>
            <NavBody user={user} signOut={signOut} pathname={pathname} />
          </aside>
        </div>
      )}
    </>
  );
}

