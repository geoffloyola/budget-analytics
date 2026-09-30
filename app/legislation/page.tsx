import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { editionsOf, getAgencyTotals, getDepartmentTotals } from "@/lib/data";
import { sum } from "@/lib/analytics";
import { change, peso, pctDelta, pesoDelta, sectorLabel } from "@/lib/format";
import { calendarStatus, monthRange, STAGES } from "@/lib/stages";
import { manilaDate } from "@/lib/time";
import type { Stage } from "@/lib/supabase/types";
import EditionPicker from "@/components/EditionPicker";
import { isOpen, listAmendments, totals } from "@/lib/amendments";
import { EmptyState, Kpi, NoAccess, PageHeader } from "@/components/Notices";

export const dynamic = "force-dynamic";

// Follows one fiscal year's budget through Congress: NEP → House → Senate →
// Bicam → GAA, per department, with what changed at each step.
export default async function Legislation({ searchParams }: { searchParams: { fy?: string; sort?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const [depts, agencies] = await Promise.all([getDepartmentTotals(), getAgencyTotals()]);
  const editions = editionsOf(depts);
  const years = [...new Set(editions.filter((e) => e.stage === "NEP").map((e) => e.fiscal_year))].sort((a, b) => b - a);
  if (years.length === 0) return <EmptyState />;
  const fy = years.includes(Number(searchParams.fy)) ? Number(searchParams.fy) : years[0];
  const today = manilaDate();
  const amendments = await listAmendments(fy);
  const amendmentsFor = (code: string) => amendments.filter((a) => a.lines.some((l) => l.department_code === code));
  const openAmendments = amendments.filter((a) => isOpen(a.status));

  const loaded = STAGES.filter((s) => editions.some((e) => e.fiscal_year === fy && e.stage === s.key));
  const latest = loaded[loaded.length - 1];
  const inYear = (stage: Stage) => depts.filter((d) => d.fiscal_year === fy && d.stage === stage);
  const totalOf = (stage: Stage) => sum(inYear(stage).map((d) => d.total));
  const nepTotal = totalOf("NEP");
  const latestTotal = totalOf(latest.key);

  // One row per department, with its amount in each loaded version.
  const codes = [...new Set(depts.filter((d) => d.fiscal_year === fy).map((d) => d.department_code))];
  const rows = codes.map((code) => {
    const at = Object.fromEntries(loaded.map((s) => [s.key, depts.find((d) => d.fiscal_year === fy && d.stage === s.key && d.department_code === code)?.total ?? 0])) as Record<Stage, number>;
    const any = depts.find((d) => d.fiscal_year === fy && d.department_code === code)!;
    return { code, name: any.department_name, sector: any.sector, at, ...change(at.NEP, at[latest.key]) };
  });
  const sortByChange = searchParams.sort !== "size" && loaded.length > 1;
  rows.sort((a, b) => (sortByChange ? Math.abs(b.abs) - Math.abs(a.abs) : b.at.NEP - a.at.NEP));

  const agencyRows = (code: string) => {
    const list = agencies.filter((a) => a.fiscal_year === fy && a.department_code === code);
    const ids = [...new Set(list.map((a) => a.agency_code))];
    return ids
      .map((id) => {
        const at = Object.fromEntries(loaded.map((s) => [s.key, list.find((a) => a.agency_code === id && a.stage === s.key)?.total ?? 0])) as Record<Stage, number>;
        return { id, name: list.find((a) => a.agency_code === id)!.agency_name, at, ...change(at.NEP, at[latest.key]) };
      })
      .sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs) || b.at.NEP - a.at.NEP);
  };

  const cols = `minmax(0,1fr) repeat(${loaded.length}, 6.5rem)${loaded.length > 1 ? " 7rem 4.5rem" : ""}`;
  const changed = rows.filter((r) => r.abs !== 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="Budget legislation"
        title={`FY${fy} budget in Congress`}
        subtitle="Each version of the budget as it moves from the President's proposal to the enacted GAA, and what changed at every step."
      >
        <EditionPicker label="Fiscal year" param="fy" value={String(fy)} options={years.map((y) => ({ value: String(y), label: `FY${y}` }))} />
      </PageHeader>

      {/* Timeline: data loaded, and where the typical calendar says we are. */}
      <ol className="mb-6 grid gap-2 sm:grid-cols-5">
        {STAGES.map((s, i) => {
          const has = loaded.some((l) => l.key === s.key);
          const cal = calendarStatus(fy, s.key, today);
          return (
            <li
              key={s.key}
              className={
                "card p-3 " + (has ? "border-accent/50" : cal === "now" ? "border-gold" : "opacity-80")
              }
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {i + 1}. {monthRange(fy, s.key)}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{s.label}</p>
              <p className="mt-1 text-xs">
                {has ? (
                  <span className="text-good">✓ Loaded: {peso(totalOf(s.key))}</span>
                ) : cal === "now" ? (
                  <span className="font-medium text-warn">● Under way (typical calendar)</span>
                ) : cal === "done" ? (
                  <span className="text-muted">Not loaded yet</span>
                ) : (
                  <span className="text-muted">Upcoming</span>
                )}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{s.what}</p>
            </li>
          );
        })}
      </ol>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="President's proposal (NEP)" value={peso(nepTotal)} />
        <Kpi
          label={`Latest version: ${latest.short}`}
          value={peso(latestTotal)}
          sub={
            loaded.length === 1
              ? "Only the NEP is loaded so far"
              : latestTotal === nepTotal
                ? "Same total as the NEP: changes are realignments"
                : `${pesoDelta(latestTotal - nepTotal)} vs NEP`
          }
          tone={loaded.length > 1 && latestTotal !== nepTotal ? (latestTotal > nepTotal ? "up" : "down") : undefined}
        />
        <Kpi
          label="Departments & funds changed"
          value={loaded.length > 1 ? String(changed.length) : "—"}
          sub={loaded.length > 1 ? `of ${rows.length}` : undefined}
        />
        <Kpi
          label="Realigned (gross)"
          value={loaded.length > 1 ? peso(sum(changed.filter((r) => r.abs > 0).map((r) => r.abs))) : "—"}
          sub={loaded.length > 1 ? "added to departments, offset by cuts elsewhere" : undefined}
        />
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <span className="font-medium">Amendments log:</span>
        <span className="text-ink2">
          {amendments.length} logged for FY{fy}, {openAmendments.length} open
          {openAmendments.length > 0 && `, adding ${peso(openAmendments.reduce((s, a) => s + totals(a).added, 0))} gross`}
        </span>
        <Link href={`/amendments?fy=${fy}`} className="btn-secondary ml-auto py-1 text-xs">
          Open log
        </Link>
        <Link href="/amendments/new" className="btn-primary py-1 text-xs">
          ＋ Log one
        </Link>
      </div>

      {loaded.length === 1 && (
        <div role="note" className="mt-5 rounded-lg border border-border bg-surface2 px-4 py-3 text-sm text-ink2">
          Only the NEP is loaded for FY{fy}. When the House version (or a committee draft) is available, import it and this
          page shows every change against the NEP:
          <code className="mt-2 block font-mono text-xs">npm run import:dbm -- &lt;file.xlsx&gt; --year {fy} --stage HOUSE</code>
          <span className="mt-1 block text-xs">
            Or a CSV in the allocations format with <code className="font-mono">stage</code> = HOUSE / SENATE / BICAM, via Import
            data.
          </span>
        </div>
      )}

      <section className="card mt-6 overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="section-title mr-auto">By department and fund</h2>
          {loaded.length > 1 && (
            <>
              <span className="text-xs text-muted">Sort:</span>
              {[
                ["change", "Biggest change"],
                ["size", "Largest"],
              ].map(([k, l]) => (
                <Link
                  key={k}
                  href={`/legislation?fy=${fy}&sort=${k}`}
                  className={"rounded-md px-2.5 py-1 text-xs " + ((k === "size") !== sortByChange ? "bg-accent text-onaccent" : "text-ink2 hover:bg-surface2")}
                >
                  {l}
                </Link>
              ))}
            </>
          )}
        </div>
        <div className="min-w-[44rem]">
          <div className="grid items-center gap-3 bg-surface2 px-4 py-2 text-xs font-semibold text-muted" style={{ gridTemplateColumns: cols }}>
            <span>Department / fund</span>
            {loaded.map((s) => (
              <span key={s.key} className="text-right">
                {s.short}
              </span>
            ))}
            {loaded.length > 1 && (
              <>
                <span className="text-right">vs NEP</span>
                <span className="text-right">%</span>
              </>
            )}
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.code} className="border-b border-border last:border-0">
                <details className="group">
                  <summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2" style={{ gridTemplateColumns: cols }}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        <span aria-hidden className="mr-1 inline-block text-muted transition group-open:rotate-90">›</span>
                        {r.name}
                      </span>
                      <span className="text-xs text-muted">
                        {sectorLabel(r.sector)}
                        {amendmentsFor(r.code).length > 0 && (
                          <Link href={`/amendments?fy=${fy}&status=all&dept=${r.code}`} className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent hover:underline">
                            {amendmentsFor(r.code).length} amendment{amendmentsFor(r.code).length === 1 ? "" : "s"}
                          </Link>
                        )}
                      </span>
                    </span>
                    {loaded.map((s, i) => {
                      const prev = i > 0 ? r.at[loaded[i - 1].key] : null;
                      const moved = prev != null && r.at[s.key] !== prev;
                      return (
                        <span key={s.key} className={"text-right font-mono text-xs tabular-nums " + (moved ? "font-semibold" : "")}>
                          {peso(r.at[s.key])}
                          {moved && (
                            <span aria-label={r.at[s.key] > prev! ? "increased" : "cut"} className={"ml-0.5 " + (r.at[s.key] > prev! ? "text-up" : "text-down")}>
                              {r.at[s.key] > prev! ? "▲" : "▼"}
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {loaded.length > 1 && (
                      <>
                        <span className="text-right font-mono text-xs tabular-nums">{r.abs ? pesoDelta(r.abs) : "—"}</span>
                        <span className="text-right font-mono text-xs tabular-nums text-muted">{r.abs ? pctDelta(r.rel) : ""}</span>
                      </>
                    )}
                  </summary>
                  <div className="pb-2">
                    {agencyRows(r.code).map((a) => (
                      <div key={a.id} className="grid items-center gap-3 border-t border-border px-4 py-1.5 pl-9 text-xs" style={{ gridTemplateColumns: cols }}>
                        <span className="truncate text-ink2" title={a.name}>
                          {a.name}
                        </span>
                        {loaded.map((s) => (
                          <span key={s.key} className="text-right font-mono tabular-nums">
                            {peso(a.at[s.key])}
                          </span>
                        ))}
                        {loaded.length > 1 && (
                          <>
                            <span className="text-right font-mono tabular-nums">{a.abs ? pesoDelta(a.abs) : "—"}</span>
                            <span className="text-right font-mono tabular-nums text-muted">{a.abs ? pctDelta(a.rel) : ""}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <p className="mt-4 text-xs text-muted">
        Months follow DBM&apos;s typical budget calendar; actual dates vary by year. ▲/▼ mark a change from the previous
        version.
      </p>
    </main>
  );
}
