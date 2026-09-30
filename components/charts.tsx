"use client";

import { useId, useMemo, useRef, useState } from "react";
import { peso, pct, pctDelta } from "@/lib/format";

// Small hand-built charts. Conventions (see the data-viz palette in
// globals.css): one y-axis, thin marks with rounded data-ends, 2px gaps
// between fills, text in ink colours (series colour only on marks), a hover
// tooltip on every mark, and a legend whenever there's more than one series.
// All values are in thousand pesos.

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

function Tooltip({ x, y, children }: { x: number | string; y: number; children: React.ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y - 8, boxShadow: "var(--shadow-lg)" }}
    >
      {children}
    </div>
  );
}

// ---- Horizontal bar list: ranking of one measure ------------------------------

export function BarList({
  rows,
  total,
  max: maxRows = 12,
}: {
  rows: { key: string; label: string; value: number; note?: string }[];
  total?: number; // for "share of total" in the tooltip
  max?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = rows.slice(0, maxRows);
  const max = Math.max(...shown.map((r) => r.value), 1);
  return (
    <ul className="space-y-1.5">
      {shown.map((r) => (
        <li
          key={r.key}
          className="relative grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-surface2"
          onMouseEnter={() => setHover(r.key)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-ink2" title={r.label}>
            {r.label}
          </span>
          <span className="relative h-2.5 rounded-full bg-surface2">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-s1"
              style={{ width: `${Math.max((r.value / max) * 100, 1)}%` }}
            />
          </span>
          <span className="w-20 text-right font-mono text-xs tabular-nums">{peso(r.value)}</span>
          {hover === r.key && (
            <Tooltip x="60%" y={0}>
              <p className="font-semibold text-ink">{r.label}</p>
              <p className="mt-0.5 font-mono text-ink">{peso(r.value, 2)}</p>
              {total ? <p className="text-muted">{pct(r.value / total)} of total</p> : null}
              {r.note && <p className="text-muted">{r.note}</p>}
            </Tooltip>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---- Stacked part-to-whole bar (sectors, expense classes) ------------------------

export function StackBar({ segments }: { segments: { key: string; label: string; value: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded">
        {segments.map((s, i) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className="h-full transition-opacity"
              style={{
                width: `${(s.value / total) * 100}%`,
                background: SERIES[i % SERIES.length],
                opacity: hover && hover !== s.key ? 0.35 : 1,
              }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              title={`${s.label}: ${peso(s.value)} (${pct(s.value / total)})`}
            />
          ) : null
        )}
      </div>
      {/* Legend doubles as the value table (identity never relies on colour alone). */}
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {segments.map((s, i) => (
          <li
            key={s.key}
            className={"flex items-center gap-2 rounded px-1 " + (hover === s.key ? "bg-surface2" : "")}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="text-ink2">{s.label}</span>
            <span className="ml-auto font-mono text-xs tabular-nums">{peso(s.value)}</span>
            <span className="w-12 text-right font-mono text-xs tabular-nums text-muted">{pct(s.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Diverging change bar (inside comparison tables) ------------------------

export function DeltaBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const w = maxAbs ? Math.min(Math.abs(value) / maxAbs, 1) * 50 : 0;
  return (
    <div className="relative h-3 w-full min-w-24" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      <div
        className={"absolute inset-y-0 " + (value >= 0 ? "rounded-r bg-up" : "rounded-l bg-down")}
        style={value >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
      />
    </div>
  );
}

// Smooth line through points without overshooting (monotone cubic,
// Fritsch–Carlson), so a curve never dips below a value it didn't have.
export function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const m = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const t = pts.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = dx[i] / 3;
    d += `C${x0 + h} ${y0 + h * t[i]} ${x1 - h} ${y1 - h * t[i + 1]} ${x1} ${y1}`;
  }
  return d;
}

// ---- Line chart over fiscal years (or budget versions) --------------------------

export function TrendChart({
  years,
  series,
  height = 280,
  unit = "peso",
  partialLast = false,
  labels,
  area,
}: {
  labels?: string[]; // x-axis words instead of "FY<year>" (e.g. "FY2026 NEP")
  area?: boolean; // shaded area under the line; default when there is one series
  partialLast?: boolean; // last year is year-to-date: marked, and not compared with the prior full year
  unit?: "peso" | "pct"; // pct: values are ratios, axis runs 0–100%
  years: number[];
  // `slot` pins a series to its palette colour, so removing one line never
  // repaints the others. Defaults to the series' position.
  series: { key: string; label: string; values: (number | null)[]; slot?: number }[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/:/g, "");
  const shade = area ?? series.length === 1;
  const xLabel = (i: number) => labels?.[i] ?? `FY${years[i]}`;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 64, r: labels ? 44 : 24, t: 12, b: 28 };

  const fmt = (v: number | null, digits?: number) => (unit === "pct" ? pct(v, digits ?? 1) : peso(v, digits));

  const { max, ticks } = useMemo(() => {
    if (unit === "pct") return { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
    const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
    const raw = Math.max(...all, 1);
    // round the axis to a clean step
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => raw / s <= 5) ?? mag * 10;
    const top = Math.ceil(raw / step) * step;
    return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
  }, [series, unit]);

  const x = (i: number) => pad.l + (years.length === 1 ? 0.5 : i / (years.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    years.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHoverIdx(best);
  }

  const color = (si: number) => SERIES[(series[si].slot ?? si) % SERIES.length];

  const tipLeft =
    hoverIdx == null || !ref.current ? 0 : (x(hoverIdx) / W) * ref.current.getBoundingClientRect().width;

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Trend of ${series.map((s) => s.label).join(", ")} across fiscal years ${years[0]}–${years[years.length - 1]}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
              {fmt(t, 0)}
            </text>
          </g>
        ))}
        {years.map((yr, i) => (
          <text key={`${yr}-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {xLabel(i)}
            {partialLast && i === years.length - 1 ? "*" : ""}
          </text>
        ))}
        {hoverIdx != null && (
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeDasharray="3 3" />
        )}
        {shade && (
          <defs>
            {series.map((s, si) => (
              <linearGradient key={s.key} id={`${gid}-${si}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color(si)} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color(si)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
        )}
        {series.map((s, si) => {
          // Consecutive non-empty points form one smooth run; a gap breaks it.
          const runs: [number, number][][] = [];
          s.values.forEach((v, i) => {
            if (v == null) return void runs.push([]);
            if (!runs.length) runs.push([]);
            runs[runs.length - 1].push([x(i), y(v)]);
          });
          const base = y(0);
          return (
            <g key={s.key}>
              {runs
                .filter((r) => r.length > 0)
                .map((r, ri) => (
                  <g key={ri}>
                    {shade && r.length > 1 && (
                      <path d={`${smoothPath(r)}L${r[r.length - 1][0]} ${base}L${r[0][0]} ${base}Z`} fill={`url(#${gid}-${si})`} />
                    )}
                    <path d={smoothPath(r)} fill="none" stroke={color(si)} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                ))}
              {s.values.map((v, i) =>
                v == null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={hoverIdx === i ? 5 : 4}
                    fill={color(si)}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                )
              )}
            </g>
          );
        })}
      </svg>
      {hoverIdx != null && (
        <Tooltip x={tipLeft} y={20}>
          <p className="mb-1 font-semibold text-ink">
            {xLabel(hoverIdx)}
            {partialLast && hoverIdx === years.length - 1 ? " (year to date)" : ""}
          </p>
          {series.map((s, si) => {
            const v = s.values[hoverIdx];
            const comparable = hoverIdx > 0 && !(partialLast && hoverIdx === years.length - 1);
            const prev = comparable ? s.values[hoverIdx - 1] : null;
            return (
              <p key={s.key} className="flex items-center gap-2 text-ink2">
                <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: color(si) }} />
                <span className="max-w-40 truncate">{s.label}</span>
                <span className="ml-auto font-mono text-ink">{fmt(v)}</span>
                {v != null && prev ? (
                  <span className="font-mono text-muted">
                    {unit === "pct" ? `${v >= prev ? "+" : "−"}${Math.abs((v - prev) * 100).toFixed(1)} pts` : pctDelta((v - prev) / prev)}
                  </span>
                ) : null}
              </p>
            );
          })}
        </Tooltip>
      )}
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2">
          {series.map((s, si) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: color(si) }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Donut: part-to-whole with a total in the middle -----------------------------

export function Donut({
  segments,
  centerLabel = "Total",
}: {
  segments: { key: string; label: string; value: number }[];
  centerLabel?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((sum, x) => sum + x.value, 0) || 1;
  const R = 70;
  const r = 50; // inner radius: ring thickness 20
  const C = 90; // centre
  const arc = (a0: number, a1: number) => {
    // Rounded so the server and the browser draw byte-identical paths.
    const p = (a: number, rad: number) => [+(C + rad * Math.sin(a)).toFixed(2), +(C - rad * Math.cos(a)).toFixed(2)];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = p(a0, R);
    const [x1, y1] = p(a1, R);
    const [x2, y2] = p(a1, r);
    const [x3, y3] = p(a0, r);
    return `M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${large} 0 ${x3} ${y3}Z`;
  };
  let acc = 0;
  const shown = hover ? segments.find((x) => x.key === hover) : null;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label={segments.map((x) => `${x.label} ${pct(x.value / total)}`).join(", ")}>
        {segments.map((x, i) => {
          const a0 = (acc / total) * 2 * Math.PI;
          acc += x.value;
          const a1 = (acc / total) * 2 * Math.PI;
          if (x.value <= 0) return null;
          return (
            <path
              key={x.key}
              d={arc(a0, Math.max(a1 - 0.0001, a0))}
              fill={SERIES[i % SERIES.length]}
              stroke="var(--surface)"
              strokeWidth={2}
              opacity={hover && hover !== x.key ? 0.35 : 1}
              onMouseEnter={() => setHover(x.key)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${x.label}: ${peso(x.value)} (${pct(x.value / total)})`}</title>
            </path>
          );
        })}
        <text x={C} y={C - 6} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
          {shown ? shown.label.split(" ")[0] : centerLabel}
        </text>
        <text x={C} y={C + 13} textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--ink)">
          {shown ? pct(shown.value / total, 0) : peso(total)}
        </text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {segments.map((x, i) => (
          <li
            key={x.key}
            className={"flex items-center gap-2 rounded-md px-1.5 py-0.5 " + (hover === x.key ? "bg-surface2" : "")}
            onMouseEnter={() => setHover(x.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink2">{x.label}</span>
            <span className="font-mono text-xs tabular-nums">{peso(x.value)}</span>
            <span className="w-11 text-right font-mono text-xs tabular-nums text-muted">{pct(x.value / total, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Sparkline: the shape of a series, for a stat tile ---------------------------

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const gid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const W = 120;
  const H = 36;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts: [number, number][] = values.map((v, i) => [2 + (i / (values.length - 1)) * (W - 4), 4 + (1 - (hi === lo ? 0.5 : (v - lo) / (hi - lo))) * (H - 8)]);
  const d = smoothPath(pts);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-28" role="img" aria-label={label}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--s1)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--s1)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d}L${last[0]} ${H}L${pts[0][0]} ${H}Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--s1)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}
