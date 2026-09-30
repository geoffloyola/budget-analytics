import { getLgsfProjects, getLocalReleases, HOME_MUNICIPALITIES, HOME_PROVINCE } from "@/lib/data";
import { sum } from "@/lib/analytics";
import { peso } from "@/lib/format";
import { formatManila } from "@/lib/time";
import { BarList } from "@/components/charts";

// Real, official data from DBM COMPASS for the home province: Local
// Government Support Fund projects and release orders (SAROs).

const PROGRAM_LABEL: Record<string, string> = {
  LGSF_FA: "Financial assistance to LGUs",
  LGSF_GEF: "Growth equity fund",
  LGSF_GGG: "Green, green, green",
  LGSF_SBDP: "Barangay development (SBDP)",
  LGSF_SAFPB: "Support to former rebels & families",
};

export default async function LocalFunding({ fy, keep }: { fy?: number; keep?: string }) {
  const [{ rows: allProjects, syncedAt }, allReleases] = await Promise.all([getLgsfProjects(), getLocalReleases()]);
  if (allProjects.length === 0 && allReleases.length === 0) {
    return (
      <section className="card p-5 text-sm text-ink2">
        No DBM COMPASS data yet. Run <code className="font-mono">npm run sync:compass</code>.
      </section>
    );
  }

  // District filter: configured municipalities, plus projects DBM lists
  // without a municipality (they can't be excluded with certainty).
  // DBM spells cities both ways ("Balanga", "Balanga City", "City of Balanga").
  const norm = (s: string) => s.toLowerCase().replace(/\bcity( of)?\b/g, "").trim();
  const home = HOME_MUNICIPALITIES.map(norm);
  const inDistrict = (m: string | null) => home.length === 0 || m == null || home.includes(norm(m));
  const scoped = allProjects.filter((p) => inDistrict(p.municipality));

  const years = [...new Set([...scoped.map((p) => p.fiscal_year), ...allReleases.map((r) => r.fiscal_year)])].sort((a, b) => b - a);
  const year = fy && years.includes(fy) ? fy : years[0];
  const projects = scoped.filter((p) => p.fiscal_year === year).sort((a, b) => b.amount_thousands - a.amount_thousands);
  const releases = allReleases
    .filter((r) => r.fiscal_year === year)
    .sort((a, b) => (b.released_on ?? "").localeCompare(a.released_on ?? ""));

  const byMunicipality = new Map<string, number>();
  for (const p of projects) {
    const k = p.municipality ?? "Municipality not specified";
    byMunicipality.set(k, (byMunicipality.get(k) ?? 0) + p.amount_thousands);
  }
  const byYear = years
    .slice()
    .reverse()
    .map((y) => ({ y, v: sum(scoped.filter((p) => p.fiscal_year === y).map((p) => p.amount_thousands)) }));
  const scope = HOME_MUNICIPALITIES.length ? HOME_MUNICIPALITIES.join(", ") : `all of ${HOME_PROVINCE}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Official releases: FY{year}</h2>
          <p className="text-sm text-ink2">
            From DBM COMPASS. Local Government Support Fund projects in {scope}, and release orders mentioning {HOME_PROVINCE}.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 text-xs" aria-label="Fiscal year">
          {years.map((y) => (
            <a
              key={y}
              href={`?lfy=${y}${keep ? `&e=${encodeURIComponent(keep)}` : ""}`}
              aria-current={y === year ? "true" : undefined}
              className={"rounded-md px-2.5 py-1 " + (y === year ? "bg-accent text-onaccent" : "text-ink2 hover:bg-surface2")}
            >
              FY{y}
            </a>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="section-title">Support fund projects by municipality</h3>
          <p className="mb-3 text-xs text-muted">
            {projects.length} projects · {peso(sum(projects.map((p) => p.amount_thousands)))} ·{" "}
            {byYear.map((b) => `FY${b.y} ${peso(b.v)}`).join(" · ")}
          </p>
          {projects.length ? (
            <BarList rows={[...byMunicipality].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value)} />
          ) : (
            <p className="text-sm text-muted">No support fund projects recorded for FY{year}.</p>
          )}
        </div>
        <div className="card max-h-[24rem] overflow-y-auto p-5">
          <h3 className="section-title">Projects</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {projects.map((p, i) => (
              <li key={i} className="flex gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block">{p.project}</span>
                  <span className="text-xs text-muted">
                    {[p.barangay, p.municipality ?? "Municipality not specified", PROGRAM_LABEL[p.program] ?? p.program].filter(Boolean).join(" · ")}
                    {p.nca_thousands ? " · cash released" : ""}
                  </span>
                </span>
                <span className="font-mono text-xs tabular-nums">{peso(p.amount_thousands, 2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card overflow-x-auto p-5">
        <h3 className="section-title">Release orders (SARO) mentioning {HOME_PROVINCE}</h3>
        <p className="mb-2 text-xs text-muted">
          Found by text search, so this is a sample, not a complete list, and it may include province-wide items outside the
          district. Negative amounts are withdrawn savings.
        </p>
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5 font-medium">Date</th>
              <th className="py-1.5 font-medium">Agency</th>
              <th className="py-1.5 font-medium">Purpose</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((r) => (
              <tr key={r.doc_no} className="border-t border-border align-top">
                <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-muted">{r.released_on ?? "—"}</td>
                <td className="py-2 pr-3 text-xs text-ink2">
                  {r.agency}
                  <span className="block text-muted">{r.department}</span>
                </td>
                <td className="py-2 pr-3 text-xs">
                  {r.purpose}
                  <span className="block font-mono text-[11px] text-muted">{r.doc_no}</span>
                </td>
                <td className="py-2 text-right font-mono text-xs tabular-nums">{peso(r.amount_thousands, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {releases.length === 0 && <p className="text-sm text-muted">None found for FY{year}.</p>}
      </div>
      {syncedAt && <p className="text-xs text-muted">Source: DBM COMPASS (compass.dbm.gov.ph). Last synced {formatManila(syncedAt)}.</p>}
    </section>
  );
}
