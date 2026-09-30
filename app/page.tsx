import Link from "next/link";
import { Building2, HardHat, Landmark, TrendingUp } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { editionKey, editionLabel, editionsOf, getDepartmentTotals, parseEdition } from "@/lib/data";
import {
  autoInsights,
  compareDepartments,
  editionTotal,
  expenseClassTotals,
  inEdition,
  priorEdition,
  sectorTotals,
} from "@/lib/analytics";
import { change, peso, pct, pctDelta, pesoDelta, STAGE_LABEL } from "@/lib/format";
import { BarList, Donut, Sparkline, TrendChart } from "@/components/charts";
import EditionPicker from "@/components/EditionPicker";
import { EmptyState, Kpi, NoAccess, PageHeader, SampleBanner } from "@/components/Notices";

export const dynamic = "force-dynamic";

export default async function Overview({ searchParams }: { searchParams: { e?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const depts = await getDepartmentTotals();
  const editions = editionsOf(depts);
  if (editions.length === 0) return <EmptyState />;

  const current = parseEdition(searchParams.e, editions[0]);
  const prior = priorEdition(editions, current);
  const rows = depts.filter(inEdition(current)).sort((a, b) => b.total - a.total);
  const total = editionTotal(depts, current);
  const priorTotal = prior ? editionTotal(depts, prior) : 0;
  const delta = change(priorTotal, total);
  const co = expenseClassTotals(depts, current).find((c) => c.key === "CO")!.value;
  const movers = prior ? compareDepartments(depts, prior, current).filter((m) => m.base > 0) : [];
  const gainers = [...movers].sort((a, b) => b.abs - a.abs).slice(0, 5);
  const losers = [...movers].sort((a, b) => a.abs - b.abs).filter((m) => m.abs < 0).slice(0, 5);

  // Every loaded version in order, oldest first: the shape of the budget over time.
  const timeline = [...editions].reverse();
  const timelineTotals = timeline.map((e) => editionTotal(depts, e));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PageHeader
        eyebrow="Overview"
        title={`${editionLabel(current)} at a glance`}
        subtitle={`${STAGE_LABEL[current.stage]}. All figures in Philippine pesos${prior ? `, compared with the ${editionLabel(prior)}` : ""}.`}
      >
        <EditionPicker
          label="Budget"
          param="e"
          value={editionKey(current)}
          options={editions.map((e) => ({ value: editionKey(e), label: editionLabel(e) }))}
        />
      </PageHeader>

      <SampleBanner show={rows.some((r) => r.has_sample)} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total budget" value={peso(total)} sub={`${rows.length} departments & special funds`} icon={<Landmark size={16} />}>
          <Sparkline values={timelineTotals} label={`Total budget across ${timeline.map(editionLabel).join(", ")}`} />
        </Kpi>
        <Kpi
          label={prior ? `Change vs ${editionLabel(prior)}` : "Change"}
          value={prior ? pesoDelta(delta.abs) : "—"}
          sub={prior ? pctDelta(delta.rel) : "No earlier edition loaded"}
          tone={prior ? (delta.abs >= 0 ? "up" : "down") : undefined}
          icon={<TrendingUp size={16} />}
        />
        <Kpi label="Largest item" value={peso(rows[0]?.total)} sub={rows[0]?.department_name} icon={<Building2 size={16} />} />
        <Kpi label="Capital outlays" value={peso(co)} sub={`${pct(co / total)} of total: infrastructure & equipment`} icon={<HardHat size={16} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="section-title">Total budget, every version loaded</h2>
            <span className="text-xs text-muted">NEP = proposed · GAA = enacted</span>
          </div>
          <TrendChart
            years={timeline.map((e) => e.fiscal_year)}
            labels={timeline.map(editionLabel)}
            series={[{ key: "total", label: "Total budget", values: timelineTotals }]}
            height={250}
          />
        </div>
        <div className="card p-5">
          <h2 className="section-title">By sector</h2>
          <p className="mb-4 text-xs text-muted">DBM sectoral classification, by department</p>
          <Donut segments={sectorTotals(depts, current)} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="section-title">Key findings</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-ink2">
            {autoInsights(depts, current, prior).map((s) => (
              <li key={s} className="flex gap-2.5">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <Link href="/insights" className="btn-secondary mt-5">
            Ask the AI analyst a follow-up →
          </Link>
        </div>
        <div className="card p-5">
          <h2 className="section-title">By type of expense</h2>
          <p className="mb-4 text-xs text-muted">Personnel, operations, capital, financial</p>
          <Donut segments={expenseClassTotals(depts, current)} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title">Largest departments</h2>
          <p className="mb-4 text-xs text-muted">Top 12 by total appropriation</p>
          <BarList total={total} rows={rows.map((d) => ({ key: d.department_code, label: d.department_name, value: d.total }))} />
        </div>
        <div className="card p-5">
          <h2 className="section-title">Biggest movers{prior ? ` vs ${editionLabel(prior)}` : ""}</h2>
          {prior ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <MoverList title="Increases" rows={gainers} />
              <MoverList title="Cuts" rows={losers} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Load an earlier edition to see changes.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function MoverList({
  title,
  rows,
}: {
  title: string;
  rows: { code: string; name: string; abs: number; rel: number | null }[];
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {rows.length === 0 && <li className="text-muted">None</li>}
        {rows.map((m) => (
          <li key={m.code}>
            <Link href={`/compare?focus=${m.code}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface2">
              <span className={"grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] " + (m.abs >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down")} aria-hidden>
                {m.abs >= 0 ? "▲" : "▼"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{m.name}</span>
                <span className="font-mono text-xs text-ink2">
                  {pesoDelta(m.abs)} <span className="text-muted">({pctDelta(m.rel)})</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
