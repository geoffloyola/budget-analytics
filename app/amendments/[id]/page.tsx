import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getAmendment, kindLabel, statusLabel, totals } from "@/lib/amendments";
import { peso } from "@/lib/format";
import { formatManila } from "@/lib/time";
import { NoAccess } from "@/components/Notices";
import { formOptions } from "../options";
import StatusBadge from "../StatusBadge";
import StatusForm from "./StatusForm";
import { removeAmendment } from "../actions";

export const dynamic = "force-dynamic";

export default async function AmendmentPage({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [found, { names, agencyNames }] = await Promise.all([getAmendment(id), formOptions()]);
  if (!found) notFound();
  const { amendment: a, events } = found;
  const t = totals(a);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <Link href={`/amendments?fy=${a.fiscal_year}`} className="text-sm text-ink2 hover:underline">
        ← Amendments log
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <p className="eyebrow">
            FY{a.fiscal_year} · {kindLabel(a.kind)}
            {a.home_district && " · home district"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{a.title}</h1>
          <p className="mt-1 text-sm text-ink2">Proposed by {a.proposed_by}</p>
        </div>
        <StatusBadge status={a.status} />
        <Link href={`/amendments/${a.id}/edit`} className="btn-secondary py-1.5 text-xs">
          Edit
        </Link>
      </div>

      {a.justification && (
        <section className="card mb-4 whitespace-pre-wrap p-5 text-sm text-ink2">{a.justification}</section>
      )}

      <section className="card overflow-x-auto p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="section-title mr-auto">Where the money moves</h2>
          <span className="font-mono text-xs">
            Added {peso(t.added)} · Cut {peso(t.cut)}
            {a.kind === "realignment" && (
              <span className={"ml-2 " + (Math.abs(t.net) < 0.001 ? "text-good" : "text-warn")}>
                {Math.abs(t.net) < 0.001 ? "✓ balanced" : `⚠ net ${peso(t.net)}`}
              </span>
            )}
          </span>
        </div>
        {a.lines.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No amounts: a text-only change.</p>
        ) : (
          <table className="mt-3 w-full min-w-[36rem] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 font-medium">Department / fund</th>
                <th className="py-1.5 font-medium">Agency</th>
                <th className="py-1.5 font-medium">Item</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {a.lines.map((l, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2 pr-3">
                    <Link href={`/legislation?fy=${a.fiscal_year}`} className="hover:underline">
                      {names.get(l.department_code) ?? l.department_code}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-ink2">{l.agency_code ? agencyNames.get(l.agency_code) ?? l.agency_code : "—"}</td>
                  <td className="py-2 pr-3 text-ink2">{l.item ?? "—"}</td>
                  <td className={"py-2 text-right font-mono text-xs tabular-nums " + (l.amount_thousands < 0 ? "" : "font-semibold")}>
                    <span aria-hidden className={l.amount_thousands < 0 ? "text-down" : "text-up"}>
                      {l.amount_thousands < 0 ? "▼ " : "▲ "}
                    </span>
                    {l.amount_thousands < 0 ? "−" : "+"}
                    {peso(Math.abs(l.amount_thousands), 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="section-title">Update status</h2>
          <StatusForm id={a.id} current={a.status} />
        </section>
        <section className="card p-5">
          <h2 className="section-title">History</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {events.map((e, i) => (
              <li key={i} className="border-l-2 border-border pl-3">
                <p className="font-medium">{statusLabel(e.status)}</p>
                {e.note && <p className="whitespace-pre-wrap text-ink2">{e.note}</p>}
                <p className="text-xs text-muted">
                  {e.by_name ?? "Unknown"} · {formatManila(e.created_at)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <form action={removeAmendment} className="mt-8">
        <input type="hidden" name="id" value={a.id} />
        <button className="text-xs text-muted hover:text-critical hover:underline">Delete this amendment (creator or admin only)</button>
      </form>
    </main>
  );
}
