import type { Viewer } from "@/lib/auth";

export function SampleBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div role="note" className="mb-5 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink">
      <strong className="font-semibold">Sample data. Not official figures.</strong>{" "}
      These numbers are generated placeholders for trying out the app. Import DBM&apos;s GAA/NEP tables before
      using any figure in a briefing or on the floor.
    </div>
  );
}

export function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-xl font-semibold">Access not yet granted</h1>
      <p className="mt-2 text-sm text-ink2">
        You&apos;re signed in as <strong>{viewer.email}</strong>, but this account hasn&apos;t been added to the
        office&apos;s member list. Ask the administrator to add you.
      </p>
    </main>
  );
}

export function EmptyState() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-xl font-semibold">No budget data yet</h1>
      <p className="mt-2 text-sm text-ink2">
        Import GAA or NEP figures from the Import data page, or load the sample set with{" "}
        <code className="font-mono">npm run import -- data/sample/allocations.csv</code>.
      </p>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink2">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</p>
      {sub && (
        <p className="mt-1 text-xs text-ink2">
          {tone && <span aria-hidden className={tone === "up" ? "text-up" : "text-down"}>{tone === "up" ? "▲ " : "▼ "}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
