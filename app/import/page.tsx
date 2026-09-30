import { getViewer } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/data";
import { ALLOCATION_COLUMNS, DISTRICT_COLUMNS } from "@/lib/csv";
import { NoAccess, PageHeader } from "@/components/Notices";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;
  if (viewer.member.role !== "admin") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-ink2">Ask the office administrator to import new budget data.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <PageHeader
        eyebrow="Import data"
        title="Load GAA / NEP figures"
        subtitle="Upload a CSV in one of the formats below. Re-importing the same year and stage updates existing rows, so corrections are safe."
      />

      {DEMO_MODE ? (
        <div className="card p-5 text-sm text-ink2">Importing is disabled in demo mode. Connect Supabase first (see README).</div>
      ) : (
        <ImportForm />
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Format
          title="Allocations (department / agency)"
          cols={ALLOCATION_COLUMNS}
          notes={[
            "stage: NEP or GAA",
            "sector: social, economic, general_public, defense, debt_burden",
            "expense_class: PS, MOOE, CO or FinEx",
            "amount_thousands: in ₱ thousands, as printed by DBM (commas OK)",
            "source: where the figure came from, e.g. “GAA FY2026 Vol. I p. 412”",
          ]}
          template="data/templates/allocations_template.csv"
        />
        <Format
          title="District items (projects)"
          cols={DISTRICT_COLUMNS}
          notes={[
            "province / district must match the app's home district setting",
            "category: free text, e.g. Roads, Flood control, School buildings",
            "municipality may be blank",
          ]}
          template="data/templates/district_items_template.csv"
        />
      </section>

      <section className="card mt-6 p-5 text-sm text-ink2">
        <h2 className="section-title">Where to get the figures</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>DBM website: the GAA (by year), the NEP, and the Budget of Expenditures and Sources of Financing (BESF).</li>
          <li>The Committee on Appropriations secretariat and the Congressional Policy and Budget Research Department (CPBRD).</li>
          <li>DPWH and other agencies&apos; itemized lists for district-level projects.</li>
        </ul>
        <p className="mt-3">
          DBM publishes these mostly as PDF and Excel. Copy the tables into the template columns in a spreadsheet, then save as CSV.
        </p>
      </section>
    </main>
  );
}

function Format({ title, cols, notes, template }: { title: string; cols: readonly string[]; notes: string[]; template: string }) {
  return (
    <div className="card p-5 text-sm">
      <h2 className="section-title">{title}</h2>
      <p className="mt-2 break-words font-mono text-xs text-ink2">{cols.join(", ")}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink2">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Template: <code className="font-mono">{template}</code>
      </p>
    </div>
  );
}
