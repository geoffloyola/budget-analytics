import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { NoAccess, PageHeader } from "@/components/Notices";
import AmendmentForm from "../AmendmentForm";
import { formOptions } from "../options";

export const dynamic = "force-dynamic";

export default async function NewAmendment() {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;
  const { depts, years } = await formOptions();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/amendments" className="text-sm text-ink2 hover:underline">
        ← Amendments log
      </Link>
      <PageHeader eyebrow="Amendments log" title="Log an amendment" />
      <AmendmentForm depts={depts} years={years} />
    </main>
  );
}
