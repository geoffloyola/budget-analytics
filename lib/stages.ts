import type { Stage } from "@/lib/supabase/types";

// Versions of a fiscal year's budget as it moves through the budget cycle,
// in order. Months follow DBM's "The Budget Cycle" (typical schedule; actual
// dates vary year to year). For the FY Y budget, "prior year" = Y − 1.
export const STAGES: {
  key: Stage;
  label: string;
  short: string;
  // When this version is typically produced/under way, as [month, yearOffset]
  // pairs relative to the fiscal year (−1 = prior year).
  from: [number, number];
  to: [number, number];
  what: string;
}[] = [
  {
    key: "NEP",
    label: "President's Budget (NEP)",
    short: "NEP",
    from: [7, -1],
    to: [8, -1],
    what: "Submitted to Congress within 30 days of the opening of the regular session.",
  },
  {
    key: "HOUSE",
    label: "House version (GAB)",
    short: "House",
    from: [8, -1],
    to: [10, -1],
    what: "Committee on Appropriations hearings, committee report, then plenary approval and amendments.",
  },
  {
    key: "SENATE",
    label: "Senate version",
    short: "Senate",
    from: [9, -1],
    to: [11, -1],
    what: "Committee on Finance hearings and plenary approval of the Senate's version.",
  },
  {
    key: "BICAM",
    label: "Bicameral version",
    short: "Bicam",
    from: [11, -1],
    to: [12, -1],
    what: "The Bicameral Conference Committee harmonizes both versions; both Houses ratify and enrol it.",
  },
  {
    key: "GAA",
    label: "Enacted (GAA)",
    short: "GAA",
    from: [12, -1],
    to: [12, -1],
    what: "Signed by the President, net of any line-item vetoes.",
  },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageIndex = (s: Stage) => STAGE_KEYS.indexOf(s);
export const stageInfo = (s: Stage) => STAGES[stageIndex(s)];
export const isStage = (s: string): s is Stage => (STAGE_KEYS as string[]).includes(s);

// Where a version stands on a given date, by the typical calendar.
export function calendarStatus(fiscalYear: number, stage: Stage, today: string): "done" | "now" | "upcoming" {
  const info = stageInfo(stage);
  const ym = (m: number, off: number) => (fiscalYear + off) * 12 + (m - 1);
  const [y, m] = today.split("-").map(Number);
  const t = y * 12 + (m - 1);
  if (t > ym(...info.to)) return "done";
  if (t >= ym(...info.from)) return "now";
  return "upcoming";
}

export function monthRange(fiscalYear: number, stage: Stage): string {
  const info = stageInfo(stage);
  const name = (m: number) => new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "short" });
  const [fm, fo] = info.from;
  const [tm] = info.to;
  return `${name(fm)}${tm !== fm ? `–${name(tm)}` : ""} ${fiscalYear + fo}`;
}
