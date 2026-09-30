import { getViewer } from "@/lib/auth";
import {
  defaultComparison,
  editionKey,
  editionLabel,
  editionsOf,
  getAgencyTotals,
  getDepartmentTotals,
  parseEdition,
} from "@/lib/data";
import { compareAgencies, compareDepartments, inEdition, sum } from "@/lib/analytics";
import { change, peso, pctDelta, pesoDelta, sectorLabel, STAGE_LABEL } from "@/lib/format";
import { DeltaBar } from "@/components/charts";
import { stageIndex } from "@/lib/stages";
import EditionPicker from "@/components/EditionPicker";
import { EmptyState, Kpi, NoAccess, PageHeader, SampleBanner } from "@/components/Notices";

export const dynamic = "force-dynamic";

export default async function Compare({
  searchParams,
}: {
  searchParams: { base?: string; target?: string; focus?: string };
}) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const [depts, agencies] = await Promise.all([getDepartmentTotals(), getAgencyTotals()]);
  const editions = editionsOf(depts);
  const def = defaultComparison(editions);
  if (!def) return <EmptyState />;

  const base = parseEdition(searchParams.base, def.base);
  const target = parseEdition(searchParams.target, def.target);
  const rows = compareDepartments(depts, base, target);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.abs)), 1);
  const baseTotal = sum(depts.filter(inEdition(base)).map((d) => d.total));
  const targetTotal = sum(depts.filter(inEdition(target)).map((d) => d.total));
  const total = change(baseTotal, targetTotal);
  const ups = rows.filter((r) => r.abs > 0);
  const downs = rows.filter((r) => r.abs < 0);
  const options = editions.map((e) => ({ value: editionKey(e), label: editionLabel(e) }));
  // Same year, earlier version → later version: changes made in Congress.
  const isDeliberation = base.fiscal_year === target.fiscal_year && stageIndex(base.stage) < stageIndex(target.stage);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PageHeader
        eyebrow="Comparison"
        title={`${editionLabel(base)} → ${editionLabel(target)}`}
        subtitle={
          isDeliberation
            ? `What changed in Congress between the ${STAGE_LABEL[base.stage]} and the ${STAGE_LABEL[target.stage]}.`
            : "How the budget shifts between two editions. Click a department to see its agencies."
        }
      >
        <EditionPicker label="From" param="base" value={editionKey(base)} options={options} />
        <EditionPicker label="To" param="target" value={editionKey(target)} options={options} />
      </PageHeader>

      <SampleBanner show={depts.some((d) => d.has_sample)} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Total, ${editionLabel(base)}`} value={peso(baseTotal)} />
        <Kpi
          label={`Total, ${editionLabel(target)}`}
          value={peso(targetTotal)}
          sub={`${pesoDelta(total.abs)} (${pctDelta(total.rel)})`}
          tone={total.abs >= 0 ? "up" : "down"}
        />
        <Kpi
          label="Departments increased"
          value={String(ups.length)}
          sub={`${pesoDelta(sum(ups.map((r) => r.abs)))} added in total`}
          tone="up"
        />
        <Kpi
          label="Departments cut"
          value={String(downs.length)}
          sub={`${pesoDelta(sum(downs.map((r) => r.abs)))} removed in total`}
          tone="down"
        />
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_5rem_minmax(6rem,10rem)] items-center gap-3 border-b border-border bg-surface2 px-4 py-2 text-xs font-semibold text-muted max-lg:hidden">
          <span>Department</span>
          <span className="text-right">{editionLabel(base)}</span>
          <span className="text-right">{editionLabel(target)}</span>
          <span className="text-right">Change</span>
          <span className="text-right">%</span>
          <span className="text-center">Cut ◀ ▶ Increase</span>
        </div>
        <ul>
          {rows.map((r) => {
            const agencyRows = compareAgencies(agencies, r.code, base, target);
            return (
              <li key={r.code} className="border-b border-border last:border-0">
                <details open={searchParams.focus === r.code} className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2 lg:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_5rem_minmax(6rem,10rem)]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        <span aria-hidden className="mr-1 inline-block text-muted transition group-open:rotate-90">›</span>
                        {r.name}
                      </span>
                      <span className="text-xs text-muted">{sectorLabel(r.sector)}</span>
                    </span>
                    <span className="text-right font-mono text-xs tabular-nums max-lg:hidden">{peso(r.base)}</span>
                    <span className="text-right font-mono text-xs tabular-nums max-lg:hidden">{peso(r.target)}</span>
                    <span className="text-right font-mono text-xs tabular-nums">{pesoDelta(r.abs)}</span>
                    <span className="text-right font-mono text-xs tabular-nums text-ink2 max-lg:hidden">{pctDelta(r.rel)}</span>
                    <span className="max-lg:hidden">
                      <DeltaBar value={r.abs} maxAbs={maxAbs} />
                    </span>
                  </summary>
                  <table className="mb-3 ml-8 mr-4 w-[calc(100%-3rem)] text-xs">
                    <thead className="text-left text-muted">
                      <tr>
                        <th className="py-1 font-medium">Agency</th>
                        <th className="py-1 text-right font-medium">{editionLabel(base)}</th>
                        <th className="py-1 text-right font-medium">{editionLabel(target)}</th>
                        <th className="py-1 text-right font-medium">Change</th>
                        <th className="py-1 text-right font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agencyRows.map((a) => (
                        <tr key={a.code} className="border-t border-border">
                          <td className="py-1.5 pr-3 text-ink2">{a.name}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{peso(a.base)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{peso(a.target)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{pesoDelta(a.abs)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums text-muted">{pctDelta(a.rel)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
