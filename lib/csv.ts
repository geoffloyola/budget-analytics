import { parse } from "csv-parse/sync";
import type { Database, ExpenseClass, Sector, Stage } from "@/lib/supabase/types";

// CSV formats accepted by the importer (templates in data/templates/).
// Both the CLI script and the admin Import page validate through here, so a
// file that imports from one imports from the other.

type AllocationInsert = Database["public"]["Tables"]["allocations"]["Insert"];
type DistrictInsert = Database["public"]["Tables"]["district_items"]["Insert"];

export const ALLOCATION_COLUMNS = [
  "fiscal_year",
  "stage",
  "department_code",
  "department_name",
  "sector",
  "agency_code",
  "agency_name",
  "expense_class",
  "amount_thousands",
  "source",
] as const;

export const DISTRICT_COLUMNS = [
  "fiscal_year",
  "stage",
  "department_code",
  "agency_code",
  "item",
  "province",
  "district",
  "municipality",
  "category",
  "amount_thousands",
  "source",
] as const;

const STAGES: Stage[] = ["NEP", "GAA"];
const SECTORS: Sector[] = ["social", "economic", "general_public", "defense", "debt_burden"];
const CLASSES: ExpenseClass[] = ["PS", "MOOE", "CO", "FinEx"];

export type CsvKind = "allocations" | "district_items";

export type ParseResult<T> = { rows: T[]; errors: string[] };

function readRecords(text: string): Record<string, string>[] {
  return parse(text, { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
}

// "1,234,567.89" and "(1,000)" (accounting negative) both appear in DBM exports.
function amount(raw: string): number {
  const s = raw.replace(/[₱,\s]/g, "");
  const neg = /^\(.*\)$/.test(s);
  const n = Number(neg ? s.slice(1, -1) : s);
  return neg ? -n : n;
}

function checkHeader(records: Record<string, string>[], cols: readonly string[]): string[] {
  if (records.length === 0) return ["The file has no data rows."];
  const missing = cols.filter((c) => !(c in records[0]) && c !== "municipality");
  return missing.length ? [`Missing column(s): ${missing.join(", ")}`] : [];
}

export function detectKind(text: string): CsvKind | null {
  const header = text.split(/\r?\n/, 1)[0].toLowerCase();
  if (header.includes("expense_class")) return "allocations";
  if (header.includes("district")) return "district_items";
  return null;
}

export function parseAllocations(text: string): ParseResult<AllocationInsert> {
  const records = readRecords(text);
  const errors = checkHeader(records, ALLOCATION_COLUMNS);
  if (errors.length) return { rows: [], errors };

  const rows: AllocationInsert[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const year = Number(r.fiscal_year);
    const stage = r.stage.toUpperCase() as Stage;
    const sector = r.sector.toLowerCase().replace(/\s+/g, "_") as Sector;
    const cls = CLASSES.find((c) => c.toLowerCase() === r.expense_class.toLowerCase());
    const amt = amount(r.amount_thousands);
    const problems = [
      !Number.isInteger(year) && "fiscal_year",
      !STAGES.includes(stage) && "stage (NEP or GAA)",
      !SECTORS.includes(sector) && `sector (${SECTORS.join("/")})`,
      !cls && "expense_class (PS/MOOE/CO/FinEx)",
      !Number.isFinite(amt) && "amount_thousands",
      !r.department_code && "department_code",
      !r.agency_code && "agency_code",
      !r.source && "source",
    ].filter(Boolean);
    if (problems.length) {
      errors.push(`Line ${line}: bad ${problems.join(", ")}`);
      return;
    }
    rows.push({
      fiscal_year: year,
      stage,
      department_code: r.department_code.toUpperCase(),
      department_name: r.department_name,
      sector,
      agency_code: r.agency_code.toUpperCase(),
      agency_name: r.agency_name,
      expense_class: cls!,
      amount_thousands: amt,
      source: r.source,
    });
  });
  return { rows, errors };
}

export function parseDistrictItems(text: string): ParseResult<DistrictInsert> {
  const records = readRecords(text);
  const errors = checkHeader(records, DISTRICT_COLUMNS);
  if (errors.length) return { rows: [], errors };

  const rows: DistrictInsert[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const year = Number(r.fiscal_year);
    const stage = r.stage.toUpperCase() as Stage;
    const amt = amount(r.amount_thousands);
    const problems = [
      !Number.isInteger(year) && "fiscal_year",
      !STAGES.includes(stage) && "stage (NEP or GAA)",
      !Number.isFinite(amt) && "amount_thousands",
      !r.item && "item",
      !r.province && "province",
      !r.district && "district",
      !r.category && "category",
      !r.source && "source",
    ].filter(Boolean);
    if (problems.length) {
      errors.push(`Line ${line}: bad ${problems.join(", ")}`);
      return;
    }
    rows.push({
      fiscal_year: year,
      stage,
      department_code: r.department_code.toUpperCase(),
      agency_code: r.agency_code.toUpperCase(),
      item: r.item,
      province: r.province,
      district: r.district,
      municipality: r.municipality || null,
      category: r.category,
      amount_thousands: amt,
      source: r.source,
    });
  });
  return { rows, errors };
}

export const UPSERT_KEYS: Record<CsvKind, string> = {
  allocations: "fiscal_year,stage,department_code,agency_code,expense_class",
  district_items: "fiscal_year,stage,province,district,agency_code,item",
};
