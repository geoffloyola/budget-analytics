import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { isOpen, kindLabel, listAmendments, STATUSES, totals } from "@/lib/amendments";
import { peso } from "@/lib/format";
import { formatManila } from "@/lib/time";
import EditionPicker from "@/components/EditionPicker";
import { Kpi, NoAccess, PageHeader } from "@/components/Notices";
import { formOptions } from "./options";
import StatusBadge from "./StatusBadge";

export const dynamic = "force-dynamic";

export default async function Amendments({ searchParams }: { searchParams: { fy?: string; status?: string; dept?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const { years, names } = await formOptions();
  const fy = years.includes(Number(searchParams.fy)) ? Number(searchParams.fy) : years[0];
  const all = await listAmendments(fy);
  const filter = searchParams.status ?? "open";
  const shown = all.filter((a) => {
    if (filter === "open" && !isOpen(a.status)) return false;
    if (filter !== "open" && filter !== "all" && a.status !== filter) return false;
    if (searchParams.dept && !a.lines.some((l) => l.department_code === searchParams.dept)) return false;
    return true;
  });

  const open = all.filter((a) => isOpen(a.status));
  const adopted = all.filter((a) => ["committee", "plenary", "senate", "bicam", "enacted"].includes(a.status));
  const grossOpen = open.reduce((s, a) => s + totals(a).added, 0);
  const tabs = [["open", "Open"], ["all", "All"], ...STATUSES.map((s) => [s.key, s.label])];
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ fy: String(fy), status: filter, ...(searchParams.dept ? { dept: searchParams.dept } : {}) });
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k);
    return `/amendments?${p}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="Amendments log"
        title={`FY${fy} amendments`}
        subtitle="Proposed changes to the budget during deliberations, who proposed them, where the money moves, and where each one stands."
      >
        <EditionPicker label="Fiscal year" param="fy" value={String(fy)} options={years.map((y) => ({ value: String(y), label: `FY${y}` }))} />
        <Link href="/amendments/new" className="btn-primary">
          ＋ Log an amendment
        </Link>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Logged" value={String(all.length)} sub={`${open.length} still open`} />
        <Kpi label="Adopted so far" value={String(adopted.length)} sub="in committee, plenary, Senate, Bicam or GAA" />
        <Kpi label="Funds added in open amendments" value={peso(grossOpen)} sub="gross, before offsetting cuts" />
        <Kpi label="Affecting the home district" value={String(all.filter((a) => a.home_district).length)} />
      </section>

      <nav className="mt-6 flex flex-wrap gap-1 text-xs" aria-label="Filter by status">
        {tabs.map(([k, l]) => (
          <Link key={k} href={q({ status: k })} aria-current={k === filter ? "true" : undefined} className={"rounded-md px-2.5 py-1 " + (k === filter ? "bg-accent text-onaccent" : "text-ink2 hover:bg-surface2")}>
            {l}
          </Link>
        ))}
        {searchParams.dept && (
          <Link href={q({ dept: undefined })} className="ml-2 rounded-md bg-surface2 px-2.5 py-1 text-ink">
            {names.get(searchParams.dept) ?? searchParams.dept} ✕
          </Link>
        )}
      </nav>

      <section className="card mt-3 overflow-x-auto">
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {all.length === 0 ? "No amendments logged for this year yet." : "No amendments match this filter."}
          </p>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-surface2 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Amendment</th>
                <th className="py-2 font-medium">Proposed by</th>
                <th className="py-2 font-medium">Departments</th>
                <th className="py-2 text-right font-medium">Added</th>
                <th className="py-2 text-right font-medium">Cut</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const t = totals(a);
                const depts = [...new Set(a.lines.map((l) => l.department_code))];
                return (
                  <tr key={a.id} className="border-t border-border align-top hover:bg-surface2">
                    <td className="px-4 py-2.5">
                      <Link href={`/amendments/${a.id}`} className="font-medium text-ink hover:underline">
                        {a.title}
                      </Link>
                      <span className="block text-xs text-muted">
                        {kindLabel(a.kind)}
                        {a.home_district && " · home district"} · updated {formatManila(a.updated_at)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-ink2">{a.proposed_by}</td>
                    <td className="py-2.5 pr-3 text-xs text-ink2">
                      {depts.slice(0, 3).map((d) => (
                        <Link key={d} href={q({ dept: d })} className="block hover:underline">
                          {names.get(d) ?? d}
                        </Link>
                      ))}
                      {depts.length > 3 && <span className="text-muted">+{depts.length - 3} more</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums">{t.added ? peso(t.added) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums">{t.cut ? peso(t.cut) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
