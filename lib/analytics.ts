import { change, peso, pct, pctDelta, SECTORS, sectorLabel } from "@/lib/format";
import type { AgencyTotal, DepartmentTotal, DistrictItem } from "@/lib/supabase/types";
import type { ExecutionRow, ExecutionTotal, LgsfProject, LocalRelease } from "@/lib/compass";
import { editionLabel, type Edition } from "@/lib/data";

// Pure calculations shared by the pages and the AI context builder.

export const inEdition = (e: Edition) => (d: { fiscal_year: number; stage: string }) =>
  d.fiscal_year === e.fiscal_year && d.stage === e.stage;

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function editionTotal(depts: DepartmentTotal[], e: Edition) {
  return sum(depts.filter(inEdition(e)).map((d) => d.total));
}

export function sectorTotals(depts: DepartmentTotal[], e: Edition) {
  const rows = depts.filter(inEdition(e));
  return SECTORS.map((s) => ({
    key: s.key,
    label: s.label,
    value: sum(rows.filter((d) => d.sector === s.key).map((d) => d.total)),
  }));
}

export function expenseClassTotals(depts: DepartmentTotal[], e: Edition) {
  const rows = depts.filter(inEdition(e));
  return [
    { key: "PS", label: "Personnel services", value: sum(rows.map((d) => d.ps ?? 0)) },
    { key: "MOOE", label: "Maintenance & operating (MOOE)", value: sum(rows.map((d) => d.mooe ?? 0)) },
    { key: "CO", label: "Capital outlays", value: sum(rows.map((d) => d.co ?? 0)) },
    { key: "FinEx", label: "Financial expenses", value: sum(rows.map((d) => d.finex ?? 0)) },
  ];
}

export type DeptChange = {
  code: string;
  name: string;
  sector: DepartmentTotal["sector"];
  base: number;
  target: number;
  abs: number;
  rel: number | null;
};

export function compareDepartments(depts: DepartmentTotal[], base: Edition, target: Edition): DeptChange[] {
  const b = new Map(depts.filter(inEdition(base)).map((d) => [d.department_code, d]));
  const t = new Map(depts.filter(inEdition(target)).map((d) => [d.department_code, d]));
  const codes = new Set([...b.keys(), ...t.keys()]);
  return [...codes]
    .map((code) => {
      const bd = b.get(code);
      const td = t.get(code);
      const c = change(bd?.total, td?.total);
      return {
        code,
        name: (td ?? bd)!.department_name,
        sector: (td ?? bd)!.sector,
        base: bd?.total ?? 0,
        target: td?.total ?? 0,
        ...c,
      };
    })
    .sort((x, y) => Math.abs(y.abs) - Math.abs(x.abs));
}

export function compareAgencies(agencies: AgencyTotal[], dept: string, base: Edition, target: Edition) {
  const pick = (e: Edition) =>
    new Map(agencies.filter((a) => a.department_code === dept && inEdition(e)(a)).map((a) => [a.agency_code, a]));
  const b = pick(base);
  const t = pick(target);
  return [...new Set([...b.keys(), ...t.keys()])]
    .map((code) => ({
      code,
      name: (t.get(code) ?? b.get(code))!.agency_name,
      base: b.get(code)?.total ?? 0,
      target: t.get(code)?.total ?? 0,
      ...change(b.get(code)?.total, t.get(code)?.total),
    }))
    .sort((x, y) => Math.abs(y.abs) - Math.abs(x.abs));
}

// Plain-language findings computed straight from the numbers: no AI, so
// these are always exact and free. The AI page goes deeper on request.
export function autoInsights(depts: DepartmentTotal[], current: Edition, prior: Edition | null): string[] {
  const out: string[] = [];
  const total = editionTotal(depts, current);
  if (!total) return out;
  const rows = depts.filter(inEdition(current)).sort((a, b) => b.total - a.total);

  const top3 = rows.slice(0, 3);
  out.push(
    `The three largest items (${top3.map((d) => d.department_name).join("; ")}) take ${pct(
      sum(top3.map((d) => d.total)) / total
    )} of the ${editionLabel(current)}.`
  );

  const debt = sum(rows.filter((d) => d.sector === "debt_burden").map((d) => d.total));
  if (debt) out.push(`Debt burden (interest payments and net lending) is ${peso(debt)}, or ${pct(debt / total)} of the budget: money not available for programs.`);

  const co = sum(rows.map((d) => d.co ?? 0));
  if (co) out.push(`Capital outlays (infrastructure, equipment) are ${peso(co)}, or ${pct(co / total)} of the total.`);

  if (prior) {
    const priorTotal = editionTotal(depts, prior);
    const c = change(priorTotal, total);
    out.push(
      `Against the ${editionLabel(prior)}, the total moves by ${c.abs >= 0 ? "+" : ""}${peso(c.abs)} (${pctDelta(c.rel)}).`
    );
    const moves = compareDepartments(depts, prior, current).filter((m) => m.base > 0);
    const up = [...moves].sort((a, b) => b.abs - a.abs)[0];
    const down = [...moves].sort((a, b) => a.abs - b.abs)[0];
    if (up && up.abs > 0) out.push(`Biggest increase: ${up.name}, +${peso(up.abs)} (${pctDelta(up.rel)}).`);
    if (down && down.abs < 0) out.push(`Biggest cut: ${down.name}, ${peso(down.abs)} (${pctDelta(down.rel)}).`);
    const fastest = moves.filter((m) => m.base > total * 0.002).sort((a, b) => (b.rel ?? 0) - (a.rel ?? 0))[0];
    if (fastest && fastest !== up && (fastest.rel ?? 0) > 0.15)
      out.push(`Fastest growth among sizeable items: ${fastest.name}, ${pctDelta(fastest.rel)}. Worth asking the agency to justify.`);
  }
  return out;
}

// The prior edition to compare a given one against: same-year NEP for a GAA
// (what Congress changed), the previous year's GAA for a NEP (what's new).
export function priorEdition(editions: Edition[], e: Edition): Edition | null {
  if (e.stage === "GAA") {
    return editions.find((x) => x.stage === "NEP" && x.fiscal_year === e.fiscal_year) ?? null;
  }
  return editions.find((x) => x.stage === "GAA" && x.fiscal_year === e.fiscal_year - 1) ?? null;
}

// Compact CSV of everything the AI needs, in ₱ thousands. Department totals for
// every edition plus agency and district detail, so answers cite real rows.
export function buildDataContext(depts: DepartmentTotal[], agencies: AgencyTotal[], district: DistrictItem[]): string {
  const deptLines = [
    "fiscal_year,stage,department_code,department_name,sector,total,ps,mooe,co,finex",
    ...[...depts]
      .sort((a, b) => a.department_code.localeCompare(b.department_code) || a.fiscal_year - b.fiscal_year || a.stage.localeCompare(b.stage))
      .map((d) =>
        [d.fiscal_year, d.stage, d.department_code, `"${d.department_name}"`, sectorLabel(d.sector), d.total, d.ps ?? 0, d.mooe ?? 0, d.co ?? 0, d.finex ?? 0].join(",")
      ),
  ];
  const agencyLines = [
    "fiscal_year,stage,department_code,agency_code,agency_name,total",
    ...[...agencies]
      .sort((a, b) => a.agency_code.localeCompare(b.agency_code) || a.fiscal_year - b.fiscal_year || a.stage.localeCompare(b.stage))
      .map((a) => [a.fiscal_year, a.stage, a.department_code, a.agency_code, `"${a.agency_name}"`, a.total].join(",")),
  ];
  const districtLines = [
    "fiscal_year,stage,department_code,category,municipality,item,amount",
    ...[...district]
      .sort((a, b) => a.fiscal_year - b.fiscal_year || a.stage.localeCompare(b.stage) || a.item.localeCompare(b.item))
      .map((d) => [d.fiscal_year, d.stage, d.department_code, d.category, d.municipality ?? "", `"${d.item}"`, d.amount_thousands].join(",")),
  ];
  return [
    "<department_totals unit=\"PHP thousands\">",
    ...deptLines,
    "</department_totals>",
    "<agency_totals unit=\"PHP thousands\">",
    ...agencyLines,
    "</agency_totals>",
    "<home_district_items unit=\"PHP thousands\">",
    ...districtLines,
    "</home_district_items>",
  ].join("\n");
}

// Official execution and local release data (DBM COMPASS) for the AI context.
export function buildCompassContext(
  totals: ExecutionTotal[],
  rows: ExecutionRow[],
  lgsf: LgsfProject[],
  releases: LocalRelease[]
): string {
  const q = (s: string | null) => `"${(s ?? "").replace(/"/g, "'")}"`;
  return [
    '<execution_totals unit="PHP thousands" note="government-wide, incl. special purpose funds and automatic appropriations">',
    "fiscal_year,period,as_of,appropriations,adjustments,total_available,allotments,obligations,disbursements,unreleased,unobligated",
    ...totals.map((t) =>
      [t.fiscal_year, t.period, t.as_of, t.appropriations, t.adjustments, t.total_available, t.allotments, t.obligations, t.disbursements, t.unreleased, t.unobligated].join(",")
    ),
    "</execution_totals>",
    '<execution_by_department unit="PHP thousands" note="appropriations = current_year + continuing (carried over); allotments = released; obligations = committed; disbursements = paid">',
    "fiscal_year,period,department,appropriations,current_year,continuing,unprogrammed_released,total_available,allotments,obligations,disbursements,unreleased,unobligated",
    ...rows
      .filter((r) => r.agency === "")
      .map((r) =>
        [r.fiscal_year, r.period, q(r.department), r.appropriations, r.current_year ?? "", r.continuing ?? "", r.unprogrammed ?? "", r.total_available, r.allotments, r.obligations, r.disbursements, r.unreleased, r.unobligated].join(",")
      ),
    "</execution_by_department>",
    '<home_province_lgsf_projects unit="PHP thousands">',
    "fiscal_year,program,municipality,barangay,project,amount",
    ...lgsf.map((p) => [p.fiscal_year, p.program, q(p.municipality), q(p.barangay), q(p.project), p.amount_thousands].join(",")),
    "</home_province_lgsf_projects>",
    '<home_province_saro_releases unit="PHP thousands" note="text-search sample, not complete">',
    "released_on,department,agency,purpose,amount",
    ...releases.map((r) => [r.released_on ?? "", q(r.department), q(r.agency), q(r.purpose.slice(0, 200)), r.amount_thousands].join(",")),
    "</home_province_saro_releases>",
  ].join("\n");
}
