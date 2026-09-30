import "server-only";
import { editionsOf, getAgencyTotals, getDepartmentTotals } from "@/lib/data";

// Departments/funds and their agencies for the amendment form, from the
// budgets loaded for recent years (latest name wins).
export async function formOptions() {
  const [depts, agencies] = await Promise.all([getDepartmentTotals(), getAgencyTotals()]);
  const editions = editionsOf(depts);
  const nepYears = [...new Set(editions.filter((e) => e.stage === "NEP").map((e) => e.fiscal_year))].sort((a, b) => b - a);
  const recent = new Set(nepYears.slice(0, 2));
  const byCode = new Map<string, { code: string; name: string; agencies: Map<string, string> }>();
  for (const d of [...depts].sort((a, b) => a.fiscal_year - b.fiscal_year)) {
    if (!recent.has(d.fiscal_year)) continue;
    byCode.set(d.department_code, { code: d.department_code, name: d.department_name, agencies: byCode.get(d.department_code)?.agencies ?? new Map() });
  }
  for (const a of agencies) {
    if (recent.has(a.fiscal_year)) byCode.get(a.department_code)?.agencies.set(a.agency_code, a.agency_name);
  }
  const list = [...byCode.values()]
    .map((d) => ({ code: d.code, name: d.name, agencies: [...d.agencies].map(([code, name]) => ({ code, name })).sort((x, y) => x.name.localeCompare(y.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Same name under two codes (e.g. BARMM as an automatic appropriation and
  // as a special purpose fund): say which is which.
  const counts = new Map<string, number>();
  for (const d of list) counts.set(d.name, (counts.get(d.name) ?? 0) + 1);
  for (const d of list) {
    if ((counts.get(d.name) ?? 0) > 1) {
      d.name += d.code.startsWith("AUTO-") ? " (automatic appropriation)" : d.code.startsWith("SPF-") ? " (special purpose fund)" : ` (${d.code})`;
    }
  }
  const names = new Map(list.map((d) => [d.code, d.name]));
  const agencyNames = new Map(list.flatMap((d) => d.agencies.map((a) => [a.code, a.name] as const)));
  return { depts: list, years: nepYears.length ? nepYears : [new Date().getFullYear() + 1], names, agencyNames };
}
