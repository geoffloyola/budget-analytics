import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { editionsOf, getDepartmentTotals } from "@/lib/data";
import { sum } from "@/lib/analytics";
import { pct, pctDelta, peso, SECTORS } from "@/lib/format";
import type { Stage } from "@/lib/supabase/types";
import { TrendChart } from "@/components/charts";
import { EmptyState, NoAccess, PageHeader, SampleBanner } from "@/components/Notices";

export const dynamic = "force-dynamic";

const MAX_SERIES = 5; // the palette's validated categorical slots

export default async function Trends({ searchParams }: { searchParams: { d?: string; stage?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const depts = await getDepartmentTotals();
  if (editionsOf(depts).length === 0) return <EmptyState />;

  const stage: Stage = searchParams.stage === "NEP" ? "NEP" : "GAA";
  const rows = depts.filter((d) => d.stage === stage);
  const years = [...new Set(rows.map((d) => d.fiscal_year))].sort();
  const latest = years[years.length - 1];

  const names = new Map(depts.map((d) => [d.department_code, d.department_name]));
  const ranked = [...rows.filter((d) => d.fiscal_year === latest)].sort((a, b) => b.total - a.total);
  // ?d= holds colour slots in order; an empty slot ("DPWH,,DOH") keeps the
  // remaining lines' colours when one is removed.
  const slots = (searchParams.d != null ? searchParams.d.split(",") : ranked.slice(0, 4).map((d) => d.department_code))
    .slice(0, MAX_SERIES)
    .map((c) => (names.has(c) ? c : ""));
  const selected = slots.filter(Boolean);

  const valueOf = (code: string, year: number) =>
    rows.find((d) => d.department_code === code && d.fiscal_year === year)?.total ?? null;
  const series = slots.flatMap((code, slot) =>
    code ? [{ key: code, label: names.get(code)!, slot, values: years.map((y) => valueOf(code, y)) }] : []
  );
  const totals = years.map((y) => sum(rows.filter((d) => d.fiscal_year === y).map((d) => d.total)));

  const href = (codes: string[], s: Stage = stage) => `/trends?stage=${s}&d=${codes.join(",").replace(/,+$/, "")}`;
  const withSlot = (code: string) => {
    const free = slots.indexOf("");
    return free === -1 ? [...slots, code] : slots.map((c, i) => (i === free ? code : c));
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="Trends"
        title={`Department budgets over time (${stage})`}
        subtitle={`Pick up to ${MAX_SERIES} departments to compare. Nominal pesos, not adjusted for inflation.`}
      >
        <div className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
          {(["GAA", "NEP"] as Stage[]).map((s) => (
            <Link
              key={s}
              href={href(slots, s)}
              aria-current={s === stage ? "page" : undefined}
              className={"rounded-md px-3 py-1 " + (s === stage ? "bg-accent text-onaccent" : "text-ink2 hover:text-ink")}
            >
              {s === "GAA" ? "Enacted (GAA)" : "Proposed (NEP)"}
            </Link>
          ))}
        </div>
      </PageHeader>

      <SampleBanner show={rows.some((d) => d.has_sample)} />

      <section className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="card p-5">
          {years.length < 2 ? (
            <p className="text-sm text-muted">Load at least two fiscal years of {stage} data to see a trend.</p>
          ) : (
            <TrendChart years={years} series={series} />
          )}
        </div>
        <div className="card max-h-[26rem] overflow-y-auto p-3">
          <p className="px-2 pb-2 text-xs font-semibold text-muted">
            Departments ({selected.length}/{MAX_SERIES} selected)
          </p>
          <ul className="text-sm">
            {ranked.map((d) => {
              const on = selected.includes(d.department_code);
              const next = on
                ? slots.map((c) => (c === d.department_code ? "" : c))
                : selected.length < MAX_SERIES
                  ? withSlot(d.department_code)
                  : null;
              return (
                <li key={d.department_code}>
                  {next ? (
                    <Link
                      href={href(next)}
                      className={"flex items-center gap-2 rounded px-2 py-1.5 hover:bg-surface2 " + (on ? "font-semibold" : "text-ink2")}
                    >
                      <span aria-hidden className={"grid h-4 w-4 place-items-center rounded border text-[10px] " + (on ? "border-accent bg-accent text-onaccent" : "border-border")}>
                        {on ? "✓" : ""}
                      </span>
                      <span className="truncate">{d.department_name}</span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-2 py-1.5 text-muted">
                      <span aria-hidden className="h-4 w-4 rounded border border-border" />
                      <span className="truncate">{d.department_name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="card mt-6 overflow-x-auto p-5">
        <h2 className="section-title">Sector shares by year ({stage})</h2>
        <table className="mt-3 w-full min-w-[36rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5 font-medium">Sector</th>
              {years.map((y) => (
                <th key={y} className="py-1.5 text-right font-medium">
                  FY{y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTORS.map((s) => (
              <tr key={s.key} className="border-t border-border">
                <td className="py-2 text-ink2">{s.label}</td>
                {years.map((y, i) => {
                  const v = sum(rows.filter((d) => d.fiscal_year === y && d.sector === s.key).map((d) => d.total));
                  return (
                    <td key={y} className="py-2 text-right font-mono text-xs tabular-nums">
                      {peso(v)} <span className="text-muted">{pct(v / totals[i], 0)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2">Total</td>
              {years.map((y, i) => (
                <td key={y} className="py-2 text-right font-mono text-xs tabular-nums">
                  {peso(totals[i])}{" "}
                  <span className="font-normal text-muted">{i > 0 ? pctDelta((totals[i] - totals[i - 1]) / totals[i - 1]) : ""}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
