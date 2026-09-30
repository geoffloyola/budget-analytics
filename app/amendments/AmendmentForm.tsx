"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveAmendment } from "./actions";
import { peso } from "@/lib/format";

type DeptOption = { code: string; name: string; agencies: { code: string; name: string }[] };
type Line = { department_code: string; agency_code: string; item: string; direction: "add" | "cut"; amount: string };

const KINDS = [
  ["realignment", "Realignment (move funds)"],
  ["increase", "Increase"],
  ["decrease", "Cut"],
  ["new_item", "New item / project"],
  ["provision", "Special provision (text)"],
] as const;

// Mirrors parsePesos in actions.ts, for the live totals only.
function pesos(raw: string): number {
  const s = raw.trim().replace(/[₱,\s]/g, "").toUpperCase();
  const m = s.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!m) return 0;
  return Number(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2] as "K" | "M" | "B"] ?? 1);
}

const blank = (direction: "add" | "cut" = "add"): Line => ({ department_code: "", agency_code: "", item: "", direction, amount: "" });

export default function AmendmentForm({
  depts,
  years,
  initial,
}: {
  depts: DeptOption[];
  years: number[];
  initial?: {
    id: number;
    fiscal_year: number;
    title: string;
    kind: string;
    proposed_by: string;
    justification: string | null;
    home_district: boolean;
    lines: { department_code: string; agency_code: string | null; item: string | null; amount_thousands: number }[];
  };
}) {
  const [state, action] = useFormState(saveAmendment, null);
  const [kind, setKind] = useState(initial?.kind ?? "realignment");
  const [lines, setLines] = useState<Line[]>(
    initial?.lines.length
      ? initial.lines.map((l) => ({
          department_code: l.department_code,
          agency_code: l.agency_code ?? "",
          item: l.item ?? "",
          direction: l.amount_thousands < 0 ? "cut" : "add",
          amount: Math.abs(l.amount_thousands * 1000).toLocaleString("en-PH"),
        }))
      : [blank("cut"), blank("add")]
  );
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const { added, cut } = useMemo(() => {
    let a = 0,
      c = 0;
    for (const l of lines) (l.direction === "add" ? (a += pesos(l.amount)) : (c += pesos(l.amount)));
    return { added: a, cut: c };
  }, [lines]);
  const balanced = kind !== "realignment" || Math.abs(added - cut) < 0.5;

  return (
    <form action={action} className="space-y-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {state?.error && (
        <p role="alert" className="rounded-lg border border-critical/25 bg-critical/10 px-3 py-2 text-sm text-critical">
          {state.error}
        </p>
      )}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Title
          <input name="title" required minLength={3} maxLength={300} defaultValue={initial?.title} className="input mt-1" placeholder="e.g. Realign ₱500M from DPWH central office to Bataan 2nd DEO flood control" />
        </label>
        <label className="text-sm font-medium">
          Type
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input mt-1">
            {KINDS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Fiscal year
          <select name="fiscal_year" defaultValue={initial?.fiscal_year ?? years[0]} className="input mt-1">
            {years.map((y) => (
              <option key={y} value={y}>
                FY{y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Proposed by
          <input name="proposed_by" required maxLength={200} defaultValue={initial?.proposed_by} className="input mt-1" placeholder="e.g. Rep. …, Committee on Appropriations, Senate" />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="home_district" defaultChecked={initial?.home_district} className="h-4 w-4" />
          Affects the home district
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Justification / notes
          <textarea name="justification" rows={3} maxLength={10000} defaultValue={initial?.justification ?? ""} className="input mt-1" placeholder="Why, sources, conditions, special provision text…" />
        </label>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="section-title mr-auto">Where the money moves</h2>
          <span className="text-xs text-muted">Amounts in pesos; 50M, 1.2B and 750k work too.</span>
        </div>
        <div className="space-y-3">
          {lines.map((l, i) => {
            const dept = depts.find((d) => d.code === l.department_code);
            return (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_9rem_auto]">
                <select aria-label="Add or cut" value={l.direction} onChange={(e) => set(i, { direction: e.target.value as "add" | "cut" })} className="input">
                  <option value="add">＋ Add</option>
                  <option value="cut">− Cut</option>
                </select>
                <select aria-label="Department or fund" value={l.department_code} onChange={(e) => set(i, { department_code: e.target.value, agency_code: "" })} className="input">
                  <option value="">Department / fund…</option>
                  {depts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select aria-label="Agency" value={l.agency_code} onChange={(e) => set(i, { agency_code: e.target.value })} className="input" disabled={!dept || dept.agencies.length < 2}>
                  <option value="">{dept && dept.agencies.length < 2 ? dept.agencies[0]?.name ?? "—" : "Agency (optional)…"}</option>
                  {dept && dept.agencies.length > 1 && dept.agencies.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input aria-label="Item" value={l.item} onChange={(e) => set(i, { item: e.target.value })} maxLength={1000} className="input" placeholder="Program / project (optional)" />
                <input aria-label="Amount in pesos" value={l.amount} onChange={(e) => set(i, { amount: e.target.value })} inputMode="decimal" className="input text-right font-mono" placeholder="₱ amount" />
                <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="btn-ghost px-2" aria-label={`Remove line ${i + 1}`}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLines([...lines, blank("add")])} className="btn-secondary py-1.5 text-xs">
            ＋ Add a line
          </button>
          <span className="ml-auto font-mono text-xs">
            Added {peso(added / 1000)} · Cut {peso(cut / 1000)}
            {kind === "realignment" && (
              <span className={"ml-2 " + (balanced ? "text-good" : "text-warn")}>{balanced ? "✓ balanced" : `⚠ off by ${peso(Math.abs(added - cut) / 1000)}`}</span>
            )}
          </span>
        </div>
      </div>

      <Submit label={initial ? "Save changes" : "Log amendment"} />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}
