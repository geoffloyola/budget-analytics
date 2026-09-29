import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseAllocations, parseDistrictItems } from "@/lib/csv";
import type { AgencyTotal, DepartmentTotal, DistrictItem, Stage } from "@/lib/supabase/types";

// All page data comes through here. Two sources:
//   • Supabase (normal): members-only, row-level security enforced.
//   • DEMO_MODE=1: reads data/sample/*.csv from disk, no login. For showing
//     the app before Supabase is set up. Never set it on a real deployment.
export const DEMO_MODE = process.env.DEMO_MODE === "1";

export const HOME_PROVINCE = process.env.NEXT_PUBLIC_HOME_PROVINCE ?? "Bataan";
export const HOME_DISTRICT = process.env.NEXT_PUBLIC_HOME_DISTRICT ?? "2nd District";

const PAGE = 1000; // Supabase returns at most 1,000 rows per request.

async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

// ---- Demo source ----------------------------------------------------------

const demoData = cache(async () => {
  const dir = path.join(process.cwd(), "data", "sample");
  const [alloc, district] = await Promise.all([
    readFile(path.join(dir, "allocations.csv"), "utf8"),
    readFile(path.join(dir, "district_items.csv"), "utf8"),
  ]);
  return { allocations: parseAllocations(alloc).rows, district: parseDistrictItems(district).rows };
});

// ---- Public API ------------------------------------------------------------

export const getDepartmentTotals = cache(async (): Promise<DepartmentTotal[]> => {
  if (DEMO_MODE) {
    const { allocations } = await demoData();
    const byKey = new Map<string, DepartmentTotal>();
    for (const a of allocations) {
      const key = `${a.fiscal_year}|${a.stage}|${a.department_code}`;
      let d = byKey.get(key);
      if (!d) {
        d = {
          fiscal_year: a.fiscal_year,
          stage: a.stage,
          department_code: a.department_code,
          department_name: a.department_name,
          sector: a.sector,
          total: 0,
          ps: 0,
          mooe: 0,
          co: 0,
          finex: 0,
          has_sample: false,
        };
        byKey.set(key, d);
      }
      d.total += a.amount_thousands;
      const k = a.expense_class.toLowerCase() as "ps" | "mooe" | "co" | "finex";
      d[k] = (d[k] ?? 0) + a.amount_thousands;
      d.has_sample ||= a.source === "SAMPLE";
    }
    return [...byKey.values()];
  }
  const supabase = createClient();
  const rows = await fetchAll<DepartmentTotal>((from, to) =>
    supabase.from("department_totals").select("*").order("fiscal_year").order("department_code").range(from, to)
  );
  // numeric columns come back as strings from PostgREST
  return rows.map((r) => ({
    ...r,
    total: Number(r.total),
    ps: r.ps == null ? null : Number(r.ps),
    mooe: r.mooe == null ? null : Number(r.mooe),
    co: r.co == null ? null : Number(r.co),
    finex: r.finex == null ? null : Number(r.finex),
  }));
});

export const getAgencyTotals = cache(async (): Promise<AgencyTotal[]> => {
  if (DEMO_MODE) {
    const { allocations } = await demoData();
    const byKey = new Map<string, AgencyTotal>();
    for (const a of allocations) {
      const key = `${a.fiscal_year}|${a.stage}|${a.department_code}|${a.agency_code}`;
      const t = byKey.get(key);
      if (t) t.total += a.amount_thousands;
      else
        byKey.set(key, {
          fiscal_year: a.fiscal_year,
          stage: a.stage,
          department_code: a.department_code,
          agency_code: a.agency_code,
          agency_name: a.agency_name,
          total: a.amount_thousands,
        });
    }
    return [...byKey.values()];
  }
  const supabase = createClient();
  const rows = await fetchAll<AgencyTotal>((from, to) =>
    supabase.from("agency_totals").select("*").order("fiscal_year").order("agency_code").range(from, to)
  );
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
});

export const getDistrictItems = cache(async (): Promise<DistrictItem[]> => {
  if (DEMO_MODE) {
    const { district } = await demoData();
    return district
      .filter((d) => d.province === HOME_PROVINCE && d.district === HOME_DISTRICT)
      .map((d, i) => ({ ...d, id: i + 1, imported_at: "" }));
  }
  const supabase = createClient();
  const rows = await fetchAll<DistrictItem>((from, to) =>
    supabase
      .from("district_items")
      .select("*")
      .eq("province", HOME_PROVINCE)
      .eq("district", HOME_DISTRICT)
      .order("fiscal_year")
      .order("id")
      .range(from, to)
  );
  return rows.map((r) => ({ ...r, amount_thousands: Number(r.amount_thousands) }));
});

// Every (year, stage) that has data, newest first: [{2027,"NEP"}, {2026,"GAA"}, ...]
export type Edition = { fiscal_year: number; stage: Stage };

export function editionsOf(depts: DepartmentTotal[]): Edition[] {
  const seen = new Map<string, Edition>();
  for (const d of depts) seen.set(`${d.fiscal_year}|${d.stage}`, { fiscal_year: d.fiscal_year, stage: d.stage });
  return [...seen.values()].sort((a, b) =>
    b.fiscal_year - a.fiscal_year || (a.stage === b.stage ? 0 : a.stage === "NEP" ? -1 : 1)
  );
}

export const editionKey = (e: Edition) => `${e.fiscal_year}-${e.stage}`;

export function parseEdition(s: string | undefined, fallback: Edition): Edition {
  const m = s?.match(/^(\d{4})-(NEP|GAA)$/);
  return m ? { fiscal_year: Number(m[1]), stage: m[2] as Stage } : fallback;
}

export const editionLabel = (e: Edition) => `FY${e.fiscal_year} ${e.stage}`;

// The comparison that matters most right now, by default: this year's
// proposal against the budget currently in force.
export function defaultComparison(editions: Edition[]): { base: Edition; target: Edition } | null {
  const target = editions[0];
  if (!target) return null;
  const base =
    target.stage === "NEP"
      ? editions.find((e) => e.stage === "GAA" && e.fiscal_year === target.fiscal_year - 1) ?? editions[1]
      : editions.find((e) => e.stage === "NEP" && e.fiscal_year === target.fiscal_year) ?? editions[1];
  return base ? { base, target } : null;
}
