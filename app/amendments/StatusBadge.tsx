import { statusLabel } from "@/lib/amendments";

// Status colours are reserved for state (good / warning / critical) and
// always come with the text label, never colour alone.
const TONE: Record<string, string> = {
  proposed: "bg-surface2 text-ink2",
  committee: "bg-accent/10 text-accent",
  plenary: "bg-accent/10 text-accent",
  senate: "bg-accent/10 text-accent",
  bicam: "bg-accent/10 text-accent",
  enacted: "bg-good/15 text-good",
  rejected: "bg-critical/10 text-critical",
  withdrawn: "bg-surface2 text-muted",
  vetoed: "bg-critical/10 text-critical",
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={"badge whitespace-nowrap " + (TONE[status] ?? "bg-surface2 text-ink2")}>{statusLabel(status)}</span>;
}
