import { getViewer } from "@/lib/auth";
import { headingsOf, Markdown } from "@/lib/markdown";
import BudgetCycleDiagram from "@/components/BudgetCycleDiagram";
import PrintButton from "@/components/PrintButton";
import manual from "@/content/user-manual.md";
import adminManual from "@/content/user-manual-admin.md";

export const metadata = { title: "Help · Budget Analytics" };
export const dynamic = "force-dynamic";

// The user manual. Open to everyone (it's reachable from the sign-in page,
// for people who can't sign in); the admin section shows only to admins.
// Edit the text in content/user-manual.md and content/user-manual-admin.md.
export default async function Help() {
  const viewer = await getViewer();
  const isAdmin = viewer.member?.role === "admin";
  const source = isAdmin ? `${manual.trimEnd()}\n\n${adminManual}` : manual;
  // Troubleshooting reads best last; keep it after the admin section.
  const ordered = isAdmin ? moveSectionToEnd(source, "Troubleshooting") : source;
  const toc = headingsOf(ordered);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Contents" className="no-print lg:sticky lg:top-6 lg:self-start">
          <p className="eyebrow mb-2">Contents</p>
          <ol className="space-y-1 text-sm">
            {toc.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="block rounded px-2 py-1 text-ink2 hover:bg-surface2 hover:text-ink">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
          <PrintButton className="btn-secondary mt-4 w-full py-1.5 text-xs" />
        </nav>
        <article className="max-w-3xl">
          <Markdown source={ordered} diagrams={{ "budget-cycle": <BudgetCycleDiagram /> }} />
        </article>
      </div>
    </main>
  );
}

function moveSectionToEnd(md: string, heading: string): string {
  const start = md.indexOf(`\n## ${heading}\n`);
  if (start < 0) return md;
  const next = md.indexOf("\n## ", start + 4);
  const section = next < 0 ? md.slice(start) : md.slice(start, next);
  return (md.slice(0, start) + (next < 0 ? "" : md.slice(next))).trimEnd() + "\n" + section;
}
