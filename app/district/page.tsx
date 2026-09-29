import { getViewer } from "@/lib/auth";
import {
  editionKey,
  editionLabel,
  getDepartmentTotals,
  getDistrictItems,
  HOME_DISTRICT,
  HOME_PROVINCE,
  parseEdition,
  type Edition,
} from "@/lib/data";
import { inEdition, sum } from "@/lib/analytics";
import { change, peso, pct, pctDelta, pesoDelta } from "@/lib/format";
import { BarList, TrendChart } from "@/components/charts";
import EditionPicker from "@/components/EditionPicker";
import { Kpi, NoAccess, PageHeader, SampleBanner } from "@/components/Notices";
import LocalFunding from "./LocalFunding";

export const dynamic = "force-dynamic";

function groupSum<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + value(r));
  return [...m.entries()].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value);
}

export default async function District({ searchParams }: { searchParams: { e?: string; lfy?: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const [items, depts] = await Promise.all([getDistrictItems(), getDepartmentTotals()]);
  const place = `${HOME_PROVINCE}, ${HOME_DISTRICT}`;

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader eyebrow="District lens" title={place} />
        <LocalFunding fy={Number(searchParams.lfy) || undefined} />
        <div className="card mt-8 p-6 text-sm text-ink2">
          No district items loaded yet. Import a district CSV (template in{" "}
          <code className="font-mono">data/templates/district_items_template.csv</code>) with province{" "}
          <strong>{HOME_PROVINCE}</strong> and district <strong>{HOME_DISTRICT}</strong>.
        </div>
      </main>
    );
  }

  const editions: Edition[] = [
    ...new Map(items.map((i) => [`${i.fiscal_year}-${i.stage}`, { fiscal_year: i.fiscal_year, stage: i.stage }])).values(),
  ].sort((a, b) => b.fiscal_year - a.fiscal_year || (a.stage === "NEP" ? -1 : 1));
  const current = parseEdition(searchParams.e, editions[0]);
  const rows = items.filter(inEdition(current)).sort((a, b) => b.amount_thousands - a.amount_thousands);
  const total = sum(rows.map((r) => r.amount_thousands));

  // Same stage, previous year, for a like-for-like change.
  const prev = items.filter((i) => i.stage === current.stage && i.fiscal_year === current.fiscal_year - 1);
  const prevTotal = sum(prev.map((r) => r.amount_thousands));
  const delta = change(prevTotal, total);

  const dpwhNational = depts.find((d) => d.department_code === "DPWH" && inEdition(current)(d))?.total ?? 0;
  const dpwhHere = sum(rows.filter((r) => r.department_code === "DPWH").map((r) => r.amount_thousands));

  const byStageYears = [...new Set(items.map((i) => i.fiscal_year))].sort();
  const trendFor = (stage: "NEP" | "GAA") =>
    byStageYears.map((y) => {
      const v = sum(items.filter((i) => i.stage === stage && i.fiscal_year === y).map((i) => i.amount_thousands));
      return v || null;
    });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="District lens"
        title={place}
        subtitle="Programs and projects in the district: what's proposed, what was enacted, and how it compares."
      >
        <EditionPicker
          label="Budget"
          param="e"
          value={editionKey(current)}
          options={editions.map((e) => ({ value: editionKey(e), label: editionLabel(e) }))}
        />
      </PageHeader>

      <LocalFunding fy={Number(searchParams.lfy) || undefined} keep={searchParams.e} />

      <div className="mb-4 mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Proposed & enacted district items: {editionLabel(current)}</h2>
        <p className="text-sm text-ink2">From imported NEP/GAA project lists.</p>
      </div>
      <SampleBanner show={items.some((i) => i.source === "SAMPLE")} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`District total, ${editionLabel(current)}`} value={peso(total)} sub={`${rows.length} line items`} />
        <Kpi
          label={`vs FY${current.fiscal_year - 1} ${current.stage}`}
          value={prev.length ? pesoDelta(delta.abs) : "—"}
          sub={prev.length ? pctDelta(delta.rel) : "No earlier year loaded"}
          tone={prev.length ? (delta.abs >= 0 ? "up" : "down") : undefined}
        />
        <Kpi
          label="DPWH items in district"
          value={peso(dpwhHere)}
          sub={dpwhNational ? `${pct(dpwhHere / dpwhNational, 2)} of DPWH nationally` : undefined}
        />
        <Kpi label="Largest single item" value={peso(rows[0]?.amount_thousands)} sub={rows[0]?.category} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title">By category</h2>
          <div className="mt-3">
            <BarList total={total} rows={groupSum(rows, (r) => r.category, (r) => r.amount_thousands)} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="section-title">By municipality</h2>
          <div className="mt-3">
            <BarList total={total} rows={groupSum(rows, (r) => r.municipality ?? "Unspecified", (r) => r.amount_thousands)} />
          </div>
        </div>
      </section>

      {byStageYears.length > 1 && (
        <section className="card mt-6 p-5">
          <h2 className="section-title">District total over time</h2>
          <div className="mt-3">
            <TrendChart
              years={byStageYears}
              height={220}
              series={[
                { key: "NEP", label: "Proposed (NEP)", values: trendFor("NEP") },
                { key: "GAA", label: "Enacted (GAA)", values: trendFor("GAA") },
              ]}
            />
          </div>
        </section>
      )}

      <section className="card mt-6 overflow-x-auto p-5">
        <h2 className="section-title">All line items, {editionLabel(current)}</h2>
        <table className="mt-3 w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5 font-medium">Item</th>
              <th className="py-1.5 font-medium">Category</th>
              <th className="py-1.5 font-medium">Municipality</th>
              <th className="py-1.5 font-medium">Agency</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2 pr-3">{r.item}</td>
                <td className="py-2 pr-3 text-ink2">{r.category}</td>
                <td className="py-2 pr-3 text-ink2">{r.municipality ?? "—"}</td>
                <td className="py-2 pr-3 font-mono text-xs text-muted">{r.agency_code}</td>
                <td className="py-2 text-right font-mono text-xs tabular-nums">{peso(r.amount_thousands, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
