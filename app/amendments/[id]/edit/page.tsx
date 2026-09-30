import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getAmendment } from "@/lib/amendments";
import { NoAccess, PageHeader } from "@/components/Notices";
import AmendmentForm from "../../AmendmentForm";
import { formOptions } from "../../options";

export const dynamic = "force-dynamic";

export default async function EditAmendment({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;
  const [found, { depts, years }] = await Promise.all([getAmendment(Number(params.id)), formOptions()]);
  if (!found) notFound();
  const a = found.amendment;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <Link href={`/amendments/${a.id}`} className="text-sm text-ink2 hover:underline">
        ← Back
      </Link>
      <PageHeader eyebrow="Amendments log" title="Edit amendment" subtitle="Status changes go through “Update status” so they're recorded in the history." />
      <AmendmentForm depts={depts} years={years.includes(a.fiscal_year) ? years : [a.fiscal_year, ...years]} initial={a} />
    </main>
  );
}
