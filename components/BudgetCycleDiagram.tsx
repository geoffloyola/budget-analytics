// The budget cycle's four stages (DBM, "The Budget Cycle") and the app pages
// used at each. Colours are the app's theme tokens, so it follows dark mode.
const W = 160;
const Y0 = 60;
const H = 136;
const x = (i: number) => 24 + i * (W + 24);

const STAGES = [
  { name: "1. Preparation", when: "Jan–Aug, year before", pages: ["Overview", "Compare"], href: ["/", "/compare"] },
  { name: "2. Legislation", when: "Aug–Dec, year before", pages: ["In Congress", "Amendments log", "Compare"], href: ["/legislation", "/amendments", "/compare"] },
  { name: "3. Execution", when: "Jan–Dec of the year", pages: ["Spending", "District lens"], href: ["/spending", "/district"] },
  { name: "4. Accountability", when: "The year and after", pages: [], href: [] },
];

export default function BudgetCycleDiagram({ current = 1 }: { current?: number }) {
  return (
    <figure>
      <svg viewBox="0 0 760 296" role="img" aria-label="Each stage of the budget cycle has a page in the app" className="h-auto w-full" fontSize="13">
        <defs>
          <marker id="cycle-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
          </marker>
        </defs>
        <text x="24" y="34" fontSize="15" fontWeight="600" fill="var(--ink)">
          Each stage of the budget cycle has a page in the app
        </text>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${x(i) + W} ${Y0 + 20}H${x(i + 1)}`} stroke="var(--muted)" strokeWidth="1.25" fill="none" markerEnd="url(#cycle-arrow)" />
        ))}
        {STAGES.map((s, i) => {
          const on = i === current;
          return (
            <g key={s.name}>
              <rect
                x={x(i)}
                y={Y0}
                width={W}
                height={H}
                rx="8"
                fill={on ? "var(--accent)" : "none"}
                fillOpacity={on ? 0.1 : 1}
                stroke={on ? "var(--accent)" : "var(--border)"}
                strokeWidth={on ? 2 : 1.25}
              />
              <line x1={x(i) + 16} y1={Y0 + 54} x2={x(i) + W - 16} y2={Y0 + 54} stroke="var(--border)" />
              <text x={x(i) + 16} y={Y0 + 24} fontWeight="600" fill="var(--ink)">
                {s.name}
              </text>
              <text x={x(i) + 16} y={Y0 + 42} fontSize="11.5" fill="var(--muted)">
                {s.when}
              </text>
              {s.pages.map((p, k) => (
                <a key={p} href={s.href[k]}>
                  <text x={x(i) + 16} y={Y0 + 76 + 20 * k} fill="var(--accent)" textDecoration="underline">
                    {p}
                  </text>
                </a>
              ))}
              {s.pages.length === 0 && (
                <>
                  <text x={x(i) + 16} y={Y0 + 76} fontSize="11.5" fill="var(--muted)">
                    Not yet in the app:
                  </text>
                  <text x={x(i) + 16} y={Y0 + 96} fontSize="11.5" fill="var(--muted)">
                    COA audit reports
                  </text>
                </>
              )}
            </g>
          );
        })}
        <text x={x(current) + W / 2} y={Y0 + H + 20} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--ink)">
          FY2027 budget is here now
        </text>
        <rect x="24" y="232" width="712" height="40" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.25" />
        <a href="/insights">
          <text x="380" y="257" textAnchor="middle" fill="var(--ink)">
            AI insights: ask questions at any stage
          </text>
        </a>
      </svg>
    </figure>
  );
}
