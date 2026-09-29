// Writes data/sample/allocations.csv and data/sample/district_items.csv.
//
// THESE ARE NOT OFFICIAL FIGURES. The department list and rough orders of
// magnitude follow the shape of recent Philippine budgets so the dashboards
// look realistic, but every amount is generated. Every row carries
// source=SAMPLE and the app shows a warning banner while any is loaded.
// Replace with DBM's GAA/NEP tables via `npm run import`.
//
// Usage: npm run sample:generate

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type Sector = "social" | "economic" | "general_public" | "defense" | "debt_burden";
type Dept = { code: string; name: string; sector: Sector; base: number; agencies: [string, string, number][] };

// base = rough FY2024 GAA size in ₱ billions; agencies = [code, name, share]
const DEPTS: Dept[] = [
  { code: "DEPED", name: "Department of Education", sector: "social", base: 715, agencies: [["DEPED-OSEC", "Office of the Secretary", 0.97], ["DEPED-ATT", "Attached agencies", 0.03]] },
  { code: "DPWH", name: "Department of Public Works and Highways", sector: "economic", base: 990, agencies: [["DPWH-OSEC", "Office of the Secretary", 1]] },
  { code: "DOH", name: "Department of Health", sector: "social", base: 260, agencies: [["DOH-OSEC", "Office of the Secretary", 0.8], ["DOH-PHIC", "Philippine Health Insurance Corporation (subsidy)", 0.2]] },
  { code: "DILG", name: "Department of the Interior and Local Government", sector: "general_public", base: 250, agencies: [["DILG-PNP", "Philippine National Police", 0.78], ["DILG-BFP", "Bureau of Fire Protection", 0.1], ["DILG-BJMP", "Bureau of Jail Management and Penology", 0.08], ["DILG-OSEC", "Office of the Secretary", 0.04]] },
  { code: "DND", name: "Department of National Defense", sector: "defense", base: 240, agencies: [["DND-PA", "Philippine Army", 0.45], ["DND-PN", "Philippine Navy", 0.2], ["DND-PAF", "Philippine Air Force", 0.2], ["DND-GHQ", "General Headquarters & others", 0.15]] },
  { code: "DSWD", name: "Department of Social Welfare and Development", sector: "social", base: 210, agencies: [["DSWD-OSEC", "Office of the Secretary (incl. 4Ps)", 1]] },
  { code: "DOTR", name: "Department of Transportation", sector: "economic", base: 115, agencies: [["DOTR-OSEC", "Office of the Secretary (rail, aviation)", 1]] },
  { code: "DA", name: "Department of Agriculture", sector: "economic", base: 160, agencies: [["DA-OSEC", "Office of the Secretary", 0.7], ["DA-NIA", "National Irrigation Administration", 0.3]] },
  { code: "SUCS", name: "State Universities and Colleges", sector: "social", base: 115, agencies: [["SUCS-ALL", "State Universities and Colleges (all)", 1]] },
  { code: "CHED", name: "Commission on Higher Education", sector: "social", base: 32, agencies: [["CHED-OSEC", "CHED (incl. free tuition, UniFAST)", 1]] },
  { code: "DOLE", name: "Department of Labor and Employment", sector: "social", base: 45, agencies: [["DOLE-OSEC", "Office of the Secretary", 0.8], ["DOLE-TESDA", "TESDA", 0.2]] },
  { code: "DENR", name: "Department of Environment and Natural Resources", sector: "economic", base: 25, agencies: [["DENR-OSEC", "Office of the Secretary", 1]] },
  { code: "DICT", name: "Department of Information and Communications Technology", sector: "economic", base: 9, agencies: [["DICT-OSEC", "Office of the Secretary", 1]] },
  { code: "DTI", name: "Department of Trade and Industry", sector: "economic", base: 11, agencies: [["DTI-OSEC", "Office of the Secretary", 1]] },
  { code: "DOF", name: "Department of Finance", sector: "general_public", base: 38, agencies: [["DOF-BIR", "Bureau of Internal Revenue", 0.35], ["DOF-BOC", "Bureau of Customs", 0.15], ["DOF-OTHERS", "Office of the Secretary & others", 0.5]] },
  { code: "DOJ", name: "Department of Justice", sector: "general_public", base: 30, agencies: [["DOJ-OSEC", "Office of the Secretary", 1]] },
  { code: "DFA", name: "Department of Foreign Affairs", sector: "general_public", base: 25, agencies: [["DFA-OSEC", "Office of the Secretary", 1]] },
  { code: "JUD", name: "The Judiciary", sector: "general_public", base: 60, agencies: [["JUD-SC", "Supreme Court and lower courts", 1]] },
  { code: "CONG", name: "Congress of the Philippines", sector: "general_public", base: 35, agencies: [["CONG-HOR", "House of Representatives", 0.6], ["CONG-SEN", "Senate", 0.4]] },
  { code: "OP", name: "Office of the President", sector: "general_public", base: 11, agencies: [["OP-OP", "Office of the President", 1]] },
  { code: "OVP", name: "Office of the Vice President", sector: "general_public", base: 2, agencies: [["OVP-OVP", "Office of the Vice President", 1]] },
  { code: "BARMM", name: "Bangsamoro Autonomous Region (block grant)", sector: "general_public", base: 80, agencies: [["BARMM-BG", "Annual block grant", 1]] },
  { code: "LGU", name: "Allocations to Local Government Units", sector: "general_public", base: 890, agencies: [["LGU-NTA", "National Tax Allotment", 0.94], ["LGU-LGSF", "Local Government Support Fund", 0.06]] },
  { code: "SPF", name: "Other Special Purpose Funds", sector: "general_public", base: 260, agencies: [["SPF-PGF", "Pension and Gratuity Fund", 0.55], ["SPF-MPBF", "Miscellaneous Personnel Benefits Fund", 0.3], ["SPF-NDRRMF", "NDRRM Fund", 0.08], ["SPF-CF", "Contingent Fund", 0.07]] },
  { code: "DEBT", name: "Debt Service — Interest Payments", sector: "debt_burden", base: 670, agencies: [["DEBT-INT", "Interest payments", 1]] },
];

// Expense-class mix by department type.
function mix(d: Dept): Record<"PS" | "MOOE" | "CO" | "FinEx", number> {
  if (d.sector === "debt_burden") return { PS: 0, MOOE: 0, CO: 0, FinEx: 1 };
  if (d.code === "DPWH" || d.code === "DOTR") return { PS: 0.03, MOOE: 0.04, CO: 0.93, FinEx: 0 };
  if (d.code === "LGU" || d.code === "BARMM") return { PS: 0, MOOE: 1, CO: 0, FinEx: 0 };
  if (d.code === "DEPED" || d.code === "DILG" || d.code === "JUD") return { PS: 0.72, MOOE: 0.18, CO: 0.1, FinEx: 0 };
  if (d.code === "DND") return { PS: 0.6, MOOE: 0.2, CO: 0.2, FinEx: 0 };
  if (d.code === "DSWD") return { PS: 0.05, MOOE: 0.93, CO: 0.02, FinEx: 0 };
  return { PS: 0.35, MOOE: 0.45, CO: 0.2, FinEx: 0 };
}

// Deterministic PRNG so regenerating gives the same file.
let seed = 20260929;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const jitter = (spread: number) => 1 + (rand() * 2 - 1) * spread;

const YEARS = [2023, 2024, 2025, 2026, 2027];
const GROWTH: Record<number, number> = { 2023: 0.9, 2024: 1, 2025: 1.09, 2026: 1.17, 2027: 1.25 };

const lines: string[] = [
  "fiscal_year,stage,department_code,department_name,sector,agency_code,agency_name,expense_class,amount_thousands,source",
];
const q = (s: string) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

for (const d of DEPTS) {
  const deptTrend = jitter(0.06);
  for (const year of YEARS) {
    const yearly = d.base * GROWTH[year] * deptTrend ** (year - 2024) * jitter(0.03);
    // Congress reshapes the NEP: some departments gain, others are cut.
    const congressDelta = d.code === "DEBT" || d.code === "LGU" ? 1 : jitter(0.12);
    const stages: ["NEP" | "GAA", number][] =
      year === 2027 ? [["NEP", yearly]] : [["NEP", yearly], ["GAA", yearly * congressDelta]];
    for (const [stage, total] of stages) {
      for (const [ac, an, share] of d.agencies) {
        for (const [cls, w] of Object.entries(mix(d))) {
          if (w === 0) continue;
          const thousands = Math.round(total * share * w * 1e6); // ₱B → ₱ thousands
          lines.push([year, stage, d.code, q(d.name), d.sector, ac, q(an), cls, thousands, "SAMPLE"].join(","));
        }
      }
    }
  }
}

// District items: illustrative project lines for the home district.
const PROVINCE = process.env.NEXT_PUBLIC_HOME_PROVINCE ?? "Bataan";
const DISTRICT = process.env.NEXT_PUBLIC_HOME_DISTRICT ?? "2nd District";
const PLACES = ["Municipality A", "Municipality B", "Municipality C", "Municipality D"];
const PROJECTS: [string, string, string, number][] = [
  ["DPWH", "DPWH-OSEC", "Roads", 420],
  ["DPWH", "DPWH-OSEC", "Flood control", 380],
  ["DPWH", "DPWH-OSEC", "Bridges", 160],
  ["DPWH", "DPWH-OSEC", "Multi-purpose buildings", 90],
  ["DEPED", "DEPED-OSEC", "School buildings", 140],
  ["DOH", "DOH-OSEC", "Health facilities", 110],
  ["DA", "DA-NIA", "Irrigation", 70],
  ["DSWD", "DSWD-OSEC", "Social protection", 60],
];
const dl = ["fiscal_year,stage,department_code,agency_code,item,province,district,municipality,category,amount_thousands,source"];
for (const year of YEARS) {
  for (const stage of year === 2027 ? ["NEP"] : ["NEP", "GAA"]) {
    for (const [dept, agency, category, base] of PROJECTS) {
      const count = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const place = PLACES[Math.floor(rand() * PLACES.length)];
        const amt = Math.round(((base * GROWTH[year]) / count) * jitter(0.3) * 1000); // ₱M → ₱ thousands
        const item = `${category} project ${i + 1}, ${place} (sample)`;
        dl.push([year, stage, dept, agency, q(item), PROVINCE, q(DISTRICT), place, category, amt, "SAMPLE"].join(","));
      }
    }
  }
}

const out = path.join(process.cwd(), "data", "sample");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "allocations.csv"), lines.join("\n") + "\n");
writeFileSync(path.join(out, "district_items.csv"), dl.join("\n") + "\n");
console.log(`Wrote ${lines.length - 1} allocation rows and ${dl.length - 1} district rows to data/sample/ (SAMPLE — not official).`);
