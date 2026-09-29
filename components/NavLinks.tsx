"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/compare", label: "NEP vs GAA" },
  { href: "/spending", label: "Spending" },
  { href: "/trends", label: "Trends" },
  { href: "/district", label: "District lens" },
  { href: "/insights", label: "AI insights" },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/import", label: "Import data" }] : LINKS;
  return (
    <nav className="-mx-1 flex flex-wrap gap-1 text-sm">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-md px-2.5 py-1.5 transition " +
              (active ? "bg-brand2 font-semibold text-onbrand" : "text-onbrand2 hover:text-onbrand")
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
