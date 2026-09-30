// A small emblem in the colours of the Philippine flag: blue over red, the
// white hoist triangle with the golden sun and three stars. Drawn for this
// app; it is not an official seal.
const BLUE = "#0038A8";
const RED = "#CE1126";
const GOLD = "#FCD116";

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={GOLD} />;
}

export default function FlagEmblem({ size = 44 }: { size?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    const x1 = 15 + 5.2 * Math.cos(a);
    const y1 = 24 + 5.2 * Math.sin(a);
    const x2 = 15 + 8.2 * Math.cos(a);
    const y2 = 24 + 8.2 * Math.sin(a);
    return <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <clipPath id="emblem-clip">
          <rect width="48" height="48" rx="10" />
        </clipPath>
      </defs>
      <g clipPath="url(#emblem-clip)">
        <rect width="48" height="24" fill={BLUE} />
        <rect y="24" width="48" height="24" fill={RED} />
        <polygon points="0,0 36,24 0,48" fill="#FFFFFF" />
        <circle cx="15" cy="24" r="4" fill={GOLD} />
        {rays}
        <Star cx={4.5} cy={6.5} r={3} />
        <Star cx={4.5} cy={41.5} r={3} />
        <Star cx={29} cy={24} r={3} />
      </g>
    </svg>
  );
}

export const PH = { BLUE, RED, GOLD };
