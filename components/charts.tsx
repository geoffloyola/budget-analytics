"use client";

import { useMemo, useRef, useState } from "react";
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
          <span className="relative h-3">
            <span
              className="absolute inset-y-0 left-0 rounded-r bg-s1"
              style={{ width: `${Math.max((r.value / max) * 100, 0.5)}%` }}
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

// ---- Line chart over fiscal years ----------------------------------------------

export function TrendChart({
  years,
  series,
  height = 280,
  unit = "peso",
  partialLast = false,
}: {
  partialLast?: boolean; // last year is year-to-date: marked, and not compared with the prior full year
  unit?: "peso" | "pct"; // pct: values are ratios, axis runs 0–100%
  years: number[];
  // `slot` pins a series to its palette colour, so removing one line never
  // repaints the others. Defaults to the series' position.
  series: { key: string; label: string; values: (number | null)[]; slot?: number }[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 64, r: 16, t: 12, b: 28 };

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
          <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
            FY{yr}
            {partialLast && i === years.length - 1 ? "*" : ""}
          </text>
        ))}
        {hoverIdx != null && (
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeDasharray="3 3" />
        )}
        {series.map((s, si) => {
          const pts = s.values
            .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
            .filter(Boolean)
            .join(" ");
          return (
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={color(si)} strokeWidth={2} strokeLinejoin="round" />
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
            FY{years[hoverIdx]}
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
