// Reads DBM's line-item budget spreadsheets (the NEP and GAA "by object"
// Excel files published on dbm.gov.ph) and rolls them up into what the app
// stores. One row in those files = one agency × program/project × operating
// unit × region × object of expenditure, amount in ₱ thousands.
//
// SORDER 1 rows are department/agency budgets; SORDER 2 rows are special
// purpose funds and automatic appropriations (department = "New General
// Appropriations" / "Automatic Appropriations", agency = the fund).

import type { ExpenseClass, Sector } from "@/lib/supabase/types";

export type DbmRow = {
  sorder: number;
  deptCode: string;
  deptName: string;
  agencyCode: string;
  agencyName: string;
  papId: string;
  description: string;
  operUnit: string;
  regionId: string;
  expCode: string;
  amount: number; // ₱ thousands
};

export const EXPENSE_CLASS: Record<string, ExpenseClass> = { "1": "PS", "2": "MOOE", "3": "FinEx", "6": "CO" };

// "Department of Education (DepEd)" → { name: "Department of Education", short: "DEPED" }
export function splitName(full: string): { name: string; short: string | null } {
  const m = full.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  return m ? { name: m[1].trim(), short: m[2].trim().toUpperCase().replace(/[^A-Z0-9]+/g, "") } : { name: full.trim(), short: null };
}

// DBM's sectoral classification, assigned per department (an approximation:
// DBM classifies by function, so a few departments straddle sectors).
const DEPT_SECTOR: Record<string, Sector> = {
  DEPED: "social", SUCS: "social", DOH: "social", DSWD: "social", DOLE: "social", DMW: "social", DHSUD: "social",
  DPWH: "economic", DOTR: "economic", DA: "economic", DAR: "economic", DENR: "economic", DOE: "economic",
  DTI: "economic", DICT: "economic", DOST: "economic", DOT: "economic", DEPDEV: "economic", BSGC: "economic",
  DND: "defense",
};

// Departments renamed between budget years, mapped to their current code so
// trends stay on one line. NEDA became DEPDev (RA 12145, 2025).
const DEPT_ALIAS: Record<string, string> = { NEDA: "DEPDEV" };

// Special purpose funds / automatic appropriations, by fund name.
export function spfSector(fund: string): Sector {
  if (/debt interest|net lending/i.test(fund)) return "debt_burden";
  if (/AFP Modernization/i.test(fund)) return "defense";
  return "general_public";
}

export type AllocationKey = {
  department_code: string;
  department_name: string;
  sector: Sector;
  agency_code: string;
  agency_name: string;
  expense_class: ExpenseClass;
};

export function allocationKey(r: DbmRow): AllocationKey | null {
  const cls = EXPENSE_CLASS[r.expCode];
  if (!cls) return null;
  if (r.sorder === 2) {
    // Each fund becomes its own line ("National Tax Allotment", "Debt Interest Payments").
    const kind = /automatic/i.test(r.deptName) ? "AUTO" : "SPF";
    const code = `${kind}-${r.agencyCode}`;
    return {
      department_code: code,
      department_name: r.agencyName,
      sector: spfSector(r.agencyName),
      agency_code: code,
      agency_name: `${r.agencyName} (${kind === "AUTO" ? "automatic appropriation" : "special purpose fund"})`,
      expense_class: cls,
    };
  }
  const { name, short } = splitName(r.deptName);
  const code = DEPT_ALIAS[short ?? ""] ?? short ?? `D${r.deptCode}`;
  return {
    department_code: code,
    department_name: name,
    sector: DEPT_SECTOR[code] ?? "general_public",
    agency_code: `${code}-${r.agencyCode}`,
    agency_name: r.agencyName,
    expense_class: cls,
  };
}

// ---- Home-province items ------------------------------------------------------

const ORDINAL = /\b(1st|2nd|3rd|4th|5th|6th|7th)\s+District Engineering Office\b/i;

// Whole word only ("Sangguniang Kabataan" contains "bataan"), and not
// "New Bataan", a town in Davao de Oro.
export function provinceMatcher(province: string) {
  const word = new RegExp(`\\b${province}\\b`, "i");
  const elsewhere = new RegExp(`\\bNew\\s+${province}\\b`, "gi");
  return (text: string) => word.test(text.replace(elsewhere, ""));
}

export function districtOf(operUnit: string): string {
  const m = operUnit.match(ORDINAL);
  return m ? `${m[1].toLowerCase()} District` : "Province-wide";
}

export function municipalityIn(text: string, municipalities: string[]): string | null {
  for (const m of municipalities) {
    if (new RegExp(`\\b${m.replace(/\s+/g, "\\s+")}\\b`, "i").test(text)) return m;
  }
  return null;
}

export function categoryOf(r: DbmRow, deptShort: string): string {
  const d = r.description;
  if (deptShort === "DPWH") {
    if (/flood|drainage|river control|revetment|dike/i.test(d)) return "Flood control";
    if (/access roads?\b|road|highway|street/i.test(d) && !/weak bridges|bridge (construction|replacement)/i.test(d)) return "Roads";
    if (/bridge/i.test(d)) return "Bridges";
    if (/building|school|facilit|multi-purpose|office/i.test(d)) return "Buildings & facilities";
    if (/water|sanitation|irrigation/i.test(d)) return "Water & sanitation";
    return "Other public works";
  }
  if (deptShort === "DEPED") return "Schools";
  if (deptShort === "DOH") return "Health facilities";
  if (deptShort === "DA") return "Agriculture & irrigation";
  if (deptShort === "SUCS") return "State universities";
  if (deptShort === "DENR") return "Environment";
  if (deptShort === "DSWD") return "Social welfare";
  if (deptShort === "DOTR") return "Transport";
  return deptShort;
}
