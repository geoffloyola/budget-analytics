import type { Sector, Stage } from "@/lib/supabase/types";

// Amounts arrive in thousand pesos (DBM's unit). These helpers turn them into
// the ₱T / ₱B / ₱M figures people actually say out loud.
export function peso(thousands: number | null | undefined, digits = 1): string {
  if (thousands == null || Number.isNaN(thousands)) return "—";
  const pesos = thousands * 1000;
  const abs = Math.abs(pesos);
  const sign = pesos < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}₱${(abs / 1e12).toFixed(digits + 1)}T`;
  if (abs >= 1e9) return `${sign}₱${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}₱${(abs / 1e6).toFixed(digits)}M`;
  return `${sign}₱${abs.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

// A signed change, e.g. "+₱12.4B".
export function pesoDelta(thousands: number): string {
  if (thousands === 0) return "₱0";
  return (thousands > 0 ? "+" : "") + peso(thousands);
}

export function pct(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function pctDelta(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "new";
  const s = (ratio * 100).toFixed(digits);
  return ratio > 0 ? `+${s}%` : `${s.replace("-", "−")}%`;
}

export function change(from: number | undefined, to: number | undefined) {
  const a = from ?? 0;
  const b = to ?? 0;
  return { abs: b - a, rel: a === 0 ? null : (b - a) / a };
}

// DBM's sectoral classification of expenditures.
export const SECTORS: { key: Sector; label: string }[] = [
  { key: "social", label: "Social services" },
  { key: "economic", label: "Economic services" },
  { key: "general_public", label: "General public services" },
  { key: "defense", label: "Defense" },
  { key: "debt_burden", label: "Debt burden" },
];
export const sectorLabel = (s: Sector) => SECTORS.find((x) => x.key === s)?.label ?? s;

export const STAGE_LABEL: Record<Stage, string> = {
  NEP: "NEP (proposed)",
  GAA: "GAA (enacted)",
};

export const EXPENSE_CLASS_LABEL = {
  PS: "Personnel services",
  MOOE: "Maintenance & other operating expenses",
  CO: "Capital outlays",
  FinEx: "Financial expenses",
} as const;
