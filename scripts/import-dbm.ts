// Imports a DBM line-item budget spreadsheet (NEP or GAA "by object" xlsx).
//
//   npm run import:dbm -- data/sources/NEP-FY2027.xlsx --year 2027 --stage NEP
//   npm run import:dbm -- data/sources/FY2026-GAA-Byobject.xlsx --year 2026 --stage GAA
//   add --dry-run to only print the totals
//
// Replaces that year+stage in `allocations` (department/agency/expense class)
// and `district_items` (lines in the home province), and removes SAMPLE rows.

import { config } from "dotenv";
import path from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import {
  allocationKey,
  EXPENSE_CLASS,
  categoryOf,
  districtOf,
  municipalityIn,
  provinceMatcher,
  splitName,
  type AllocationKey,
  type DbmRow,
} from "../lib/dbm";

config({ path: ".env.local" });

const PROVINCE = process.env.NEXT_PUBLIC_HOME_PROVINCE ?? "Bataan";
// Municipalities used to tag items with a place (whole province, not just the district).
const BATAAN_TOWNS = ["Abucay", "Bagac", "Balanga", "Dinalupihan", "Hermosa", "Limay", "Mariveles", "Morong", "Orani", "Orion", "Pilar", "Samal"];

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// Some DBM files (e.g. the FY2026 NEP's special purpose fund rows) have the
// expense class and object code columns swapped: the class ("2") sits in
// UACS_OBJ_CD and the 10-digit object code in UACS_EXP_CD.
function expenseClassCode(exp: string, obj: string): string {
  if (exp in EXPENSE_CLASS) return exp;
  if (obj in EXPENSE_CLASS) return obj;
  return exp;
}

async function read(file: string, onRow: (r: DbmRow) => void) {
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: "cache", worksheets: "emit", styles: "ignore", hyperlinks: "ignore" });
  let found = false;
  for await (const ws of wb) {
    let h: Record<string, number> | null = null;
    for await (const row of ws) {
      const v = (row.values as unknown[]).slice(1);
      if (!h) {
        h = Object.fromEntries(v.map((c, i) => [String(c), i]));
        if (!("AMT" in h) || !("UACS_EXP_CD" in h)) break; // not the data sheet
        found = true;
        continue;
      }
      const amount = v[h.AMT];
      if (typeof amount !== "number" || amount === 0) continue; // heading rows carry no amount
      const s = (k: string) => (h![k] === undefined || v[h![k]] == null ? "" : String(v[h![k]]).trim());
      onRow({
        sorder: Number(v[h.SORDER]),
        deptCode: s("DEPARTMENT"),
        deptName: s("UACS_DPT_DSC"),
        agencyCode: s("AGENCY"),
        agencyName: s("UACS_AGY_DSC"),
        papId: s("PREXC_FPAP_ID"),
        description: s("DSC"),
        operUnit: s("UACS_OPER_DSC"),
        regionId: s("UACS_REG_ID"),
        expCode: expenseClassCode(s("UACS_EXP_CD"), s("UACS_OBJ_CD")),
        amount,
      });
    }
  }
  if (!found) throw new Error(`${file}: no sheet with AMT and UACS_EXP_CD columns; is this a DBM "by object" file?`);
}

async function main() {
  const file = process.argv[2];
  const year = Number(arg("year"));
  const stage = arg("stage")?.toUpperCase();
  const dry = process.argv.includes("--dry-run");
  if (!file || !Number.isInteger(year) || (stage !== "NEP" && stage !== "GAA")) {
    console.error("Usage: npm run import:dbm -- <file.xlsx> --year 2027 --stage NEP|GAA [--dry-run]");
    process.exit(1);
  }
  const source = `${stage} FY${year} (DBM, ${path.basename(file)})`;
  const inProvince = provinceMatcher(PROVINCE);

  const alloc = new Map<string, AllocationKey & { amount: number }>();
  const items = new Map<string, Record<string, unknown> & { amount_thousands: number }>();
  let total = 0;
  let rows = 0;
  let skippedClass = 0;

  console.log(`Reading ${file}…`);
  await read(file, (r) => {
    rows++;
    total += r.amount;
    const k = allocationKey(r);
    if (!k) {
      skippedClass++;
      return;
    }
    const key = `${k.department_code}|${k.agency_code}|${k.expense_class}`;
    const a = alloc.get(key);
    if (a) a.amount += r.amount;
    else alloc.set(key, { ...k, amount: r.amount });

    // Home-province lines: named in the operating unit (e.g. "Bataan 2nd District
    // Engineering Office", "Division of Bataan") or in the project description.
    if (r.sorder === 1 && (inProvince(r.operUnit) || inProvince(r.description))) {
      const district = districtOf(r.operUnit);
      const place = municipalityIn(`${r.description} ${r.operUnit}`, BATAAN_TOWNS);
      const unit = r.operUnit && !/central office|office of the secretary/i.test(r.operUnit) ? ` · ${r.operUnit}` : "";
      const item = `${r.description}${unit}`.slice(0, 500);
      const ik = `${district}|${k.agency_code}|${item}`;
      const it = items.get(ik);
      if (it) it.amount_thousands += r.amount;
      else
        items.set(ik, {
          fiscal_year: year,
          stage,
          department_code: k.department_code,
          agency_code: k.agency_code,
          item,
          province: PROVINCE,
          district,
          municipality: place,
          category: categoryOf(r, splitName(r.deptName).short ?? ""),
          amount_thousands: r.amount,
          source,
        });
    }
  });

  const allocRows = [...alloc.values()].map(({ amount, ...k }) => ({
    fiscal_year: year,
    stage,
    ...k,
    amount_thousands: amount,
    source,
  }));
  const itemRows = [...items.values()];
  const T = (x: number) => `₱${(x / 1e9).toFixed(3)}T`;
  const bySector = new Map<string, number>();
  for (const a of allocRows) bySector.set(a.sector, (bySector.get(a.sector) ?? 0) + a.amount_thousands);

  console.log(`${rows.toLocaleString()} line items, total ${T(total)}.`);
  console.log(`→ ${allocRows.length} allocation rows (${new Set(allocRows.map((a) => a.department_code)).size} departments/funds), total ${T(allocRows.reduce((s, a) => s + a.amount_thousands, 0))}`);
  console.log(`  by sector: ${[...bySector].map(([s, v]) => `${s} ${T(v)}`).join(", ")}`);
  console.log(`→ ${itemRows.length} ${PROVINCE} items, ₱${(itemRows.reduce((s, i) => s + i.amount_thousands, 0) / 1e6).toFixed(2)}B`);
  if (skippedClass) console.log(`  (${skippedClass} lines with an unknown expense class were skipped)`);
  if (dry) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  for (const table of ["allocations", "district_items"] as const) {
    const del = await db.from(table).delete().eq("fiscal_year", year).eq("stage", stage);
    if (del.error) throw new Error(`${table}: ${del.error.message}`);
    const sample = await db.from(table).delete().eq("source", "SAMPLE");
    if (sample.error) throw new Error(`${table}: ${sample.error.message}`);
  }
  for (const [table, data] of [["allocations", allocRows], ["district_items", itemRows]] as const) {
    for (let i = 0; i < data.length; i += 500) {
      const { error } = await db.from(table).insert(data.slice(i, i + 500));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  }
  console.log(`Saved ${source} to Supabase.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
