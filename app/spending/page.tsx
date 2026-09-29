import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getExecution } from "@/lib/data";
import { sum } from "@/lib/analytics";
import { peso, pct } from "@/lib/format";
import { formatManila } from "@/lib/time";
import type { ExecutionRow } from "@/lib/compass";
import { TrendChart } from "@/components/charts";
import EditionPicker from "@/components/EditionPicker";
import { Kpi, NoAccess, PageHeader } from "@/components/Notices";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<string, string> = { FY: "full year", Q1: "Q1", Q2: "Q2 (Jan–Jun)", Q3: "Q3 (Jan–Sep)", Q4: "Q4" };

type SortKey = "unobligated" | "obligation_rate" | "unreleased" | "available";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "unobligated", label: "Unused releases" },
  { key: "obligation_rate", label: "Slowest to commit" },
  { key: "unreleased", label: "Not yet released" },
  { key: "available", label: "Largest budget" },
];

const rate = (a: number, b: number) => (b > 0 ? a / b : null);

export default async function Spending({ searchParams }: { searchParams: { fy?: string; sort?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const { rows, totals, syncedAt } = await getExecution();
  if (totals.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader eyebrow="Spending performance" title="No execution data yet" />
        <div className="card p-6 text-sm text-ink2">
          Run <code className="font-mono">npm run sync:compass</code> to pull budget execution data from DBM COMPASS.
        </div>
      </main>
    );
  }

  const years = totals.map((t) => t.fiscal_year).sort((a, b) => b - a);
  const fy = years.includes(Number(searchParams.fy)) ? Number(searchParams.fy) : years[0];
  const total = totals.find((t) => t.fiscal_year === fy)!;
  const sort: SortKey = SORTS.some((s) => s.key === searchParams.sort) ? (searchParams.sort as SortKey) : "unobligated";
  const partial = total.period !== "FY";

  const depts = rows.filter((r) => r.fiscal_year === fy && r.agency === "");
  const agenciesOf = (d: string) => rows.filter((r) => r.fiscal_year === fy && r.department === d && r.agency !== "");
  const sorted = [...depts].sort((a, b) => {
    if (sort === "obligation_rate") return (rate(a.obligations, a.allotments) ?? 2) - (rate(b.obligations, b.allotments) ?? 2);
    if (sort === "unreleased") return b.unreleased - a.unreleased;
    if (sort === "available") return b.total_available - a.total_available;
    return b.unobligated - a.unobligated;
  });

  const oblRate = rate(total.obligations, total.allotments);
  const disbRate = rate(total.disbursements, total.obligations);
  const otherFunds = total.total_available - sum(depts.map((d) => d.total_available));

  // Findings: computed, not AI.
  const sizeable = depts.filter((d) => d.allotments > 10_000_000); // ≥ ₱10B released
  const slowest = [...sizeable].sort((a, b) => rate(a.obligations, a.allotments)! - rate(b.obligations, b.allotments)!).slice(0, 3);
  const idle = [...depts].sort((a, b) => b.unobligated - a.unobligated)[0];
  const unreleased = [...depts].sort((a, b) => b.unreleased - a.unreleased)[0];
  const unprog = sum(depts.map((d) => d.unprogrammed ?? 0));
  const carried = sum(depts.map((d) => d.continuing ?? 0));
  const prevTotal = totals.find((t) => t.fiscal_year === fy - 1);

  const findings = [
    `Agencies have committed ${pct(oblRate)} of the funds released to them${partial ? ` as of ${formatDate(total.as_of)}` : " for the year"}, and paid out ${pct(disbRate)} of what they committed.`,
    slowest.length > 0 &&
      `Slowest to commit among large departments: ${slowest.map((d) => `${d.department} (${pct(rate(d.obligations, d.allotments))})`).join("; ")}.`,
    idle && `Largest unused balance: ${idle.department}, with ${peso(idle.unobligated)} released but not yet committed.`,
    unreleased && unreleased.unreleased > 0 && `Largest amount not yet released: ${unreleased.department}, ${peso(unreleased.unreleased)}.`,
    unprog > 0 && `${peso(unprog)} of unprogrammed appropriations has been released to departments this year.`,
    carried > 0 && `${peso(carried)} of departments' appropriations is carried over from earlier years (continuing appropriations), not new money.`,
    prevTotal &&
      !partial &&
      `Commitment rate vs FY${fy - 1}: ${pct(oblRate)} against ${pct(rate(prevTotal.obligations, prevTotal.allotments))}.`,
  ].filter(Boolean) as string[];

  const trendYears = [...years].reverse();
  const trendTotal = trendYears.map((y) => totals.find((t) => t.fiscal_year === y)!);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="Spending performance"
        title={`FY${fy} budget execution`}
        subtitle={`How much of the budget has been released, committed and paid: ${PERIOD_LABEL[total.period] ?? total.period}, as of ${formatDate(total.as_of)}.`}
      >
        <EditionPicker
          label="Year"
          param="fy"
          value={String(fy)}
          options={years.map((y) => {
            const t = totals.find((x) => x.fiscal_year === y)!;
            return { value: String(y), label: `FY${y}${t.period === "FY" ? "" : ` (to ${t.period})`}` };
          })}
        />
      </PageHeader>

      {partial && (
        <div role="note" className="mb-5 rounded-lg border border-border bg-surface2 px-4 py-3 text-sm text-ink2">
          FY{fy} is still in progress. These are partial-year figures, so low rates partly reflect timing. Compare with
          the same quarter of past years before drawing conclusions.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Available to spend" value={peso(total.total_available)} sub="Appropriations incl. carry-overs, plus adjustments" />
        <Kpi
          label="Released to agencies"
          value={peso(total.allotments)}
          sub={`${pct(rate(total.allotments, total.total_available))} of available; ${peso(total.unreleased)} not yet released`}
        />
        <Kpi label="Committed (obligated)" value={pct(oblRate)} sub={`${peso(total.obligations)} of releases`} />
        <Kpi label="Paid (disbursed)" value={pct(disbRate)} sub={`${peso(total.disbursements)} of commitments`} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="section-title">Key findings</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink2">
            {findings.map((s) => (
              <li key={s} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <Link href="/insights" className="btn-secondary mt-4">
            Ask the AI analyst about spending →
          </Link>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title">Rates over the years</h2>
          <p className="mb-2 text-xs text-muted">
            Latest period of each year.
            {trendTotal[trendTotal.length - 1].period !== "FY" && ` * FY${years[0]} is year to date (${trendTotal[trendTotal.length - 1].period}).`}
          </p>
          <TrendChart
            unit="pct"
            partialLast={trendTotal[trendTotal.length - 1].period !== "FY"}
            height={220}
            years={trendYears}
            series={[
              { key: "obl", label: "Committed ÷ released", values: trendTotal.map((t) => rate(t.obligations, t.allotments)) },
              { key: "disb", label: "Paid ÷ committed", values: trendTotal.map((t) => rate(t.disbursements, t.obligations)) },
            ]}
          />
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="section-title mr-auto">By department</h2>
          <span className="text-xs text-muted">Sort:</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/spending?fy=${fy}&sort=${s.key}`}
              aria-current={s.key === sort ? "true" : undefined}
              className={"rounded-md px-2.5 py-1 text-xs " + (s.key === sort ? "bg-accent text-onaccent" : "text-ink2 hover:bg-surface2")}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_minmax(7rem,11rem)_4.5rem_6.5rem] items-center gap-3 bg-surface2 px-4 py-2 text-xs font-semibold text-muted max-lg:hidden">
          <span>Department</span>
          <span className="text-right">Available</span>
          <span className="text-right">Released</span>
          <span>Committed ÷ released</span>
          <span className="text-right">Paid ÷ comm.</span>
          <span className="text-right">Unused</span>
        </div>
        <ul>
          {sorted.map((d) => (
            <li key={d.department} className="border-b border-border last:border-0">
              <details className="group">
                <summary className="cursor-pointer list-none px-4 py-2.5 text-sm hover:bg-surface2">
                  <DeptLine r={d} bold />
                </summary>
                <div className="px-4 pb-3 pl-8">
                  {d.current_year != null && (
                    <p className="mb-2 text-xs text-muted">
                      Appropriation {peso(d.appropriations)} = current year {peso(d.current_year)} + carried over{" "}
                      {peso(d.continuing ?? 0)}
                      {d.unprogrammed ? ` · unprogrammed released ${peso(d.unprogrammed)}` : ""}
                    </p>
                  )}
                  {agenciesOf(d.department).map((a) => (
                    <div key={a.agency} className="border-t border-border py-1.5 text-xs">
                      <DeptLine r={a} />
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
          {otherFunds > 0 && (
            <li className="px-4 py-2.5 text-xs text-muted">
              Plus {peso(otherFunds)} in special purpose funds and automatic appropriations (e.g. debt interest, the national
              tax allotment) that COMPASS doesn&apos;t break down by department.
            </li>
          )}
        </ul>
      </section>

      <p className="mt-4 text-xs text-muted">
        Source: DBM COMPASS (compass.dbm.gov.ph), Statement of Appropriations, Allotments, Obligations, Disbursements and
        Balances (SAAODB).{syncedAt && ` Last synced ${formatManila(syncedAt)}.`}
      </p>
    </main>
  );
}

function DeptLine({ r, bold }: { r: ExecutionRow; bold?: boolean }) {
  const obl = rate(r.obligations, r.allotments);
  const disb = rate(r.disbursements, r.obligations);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_minmax(7rem,11rem)_4.5rem_6.5rem]">
      <span className={"min-w-0 truncate " + (bold ? "font-medium" : "text-ink2")}>
        {bold && <span aria-hidden className="mr-1 inline-block text-muted transition group-open:rotate-90">›</span>}
        {r.agency || r.department}
      </span>
      <span className="text-right font-mono text-xs tabular-nums max-lg:hidden">{peso(r.total_available)}</span>
      <span className="text-right font-mono text-xs tabular-nums max-lg:hidden">{peso(r.allotments)}</span>
      <span className="flex items-center gap-2">
        <span className="relative h-2.5 flex-1 rounded bg-surface2 max-lg:w-16" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded bg-s1" style={{ width: `${Math.min(obl ?? 0, 1) * 100}%` }} />
        </span>
        <span className="w-12 text-right font-mono text-xs tabular-nums">{pct(obl, 0)}</span>
      </span>
      <span className="text-right font-mono text-xs tabular-nums text-ink2 max-lg:hidden">{pct(disb, 0)}</span>
      <span className="text-right font-mono text-xs tabular-nums max-lg:hidden">{peso(r.unobligated)}</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
