import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, editionLabel, editionsOf, getDepartmentTotals, HOME_DISTRICT, HOME_PROVINCE } from "@/lib/data";
import { EmptyState, NoAccess, PageHeader, SampleBanner } from "@/components/Notices";
import Chat from "./Chat";
import type { Briefing } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function Insights() {
  const viewer = await getViewer();
  if (!viewer.member) return <NoAccess viewer={viewer} />;

  const depts = await getDepartmentTotals();
  const editions = editionsOf(depts);
  if (editions.length === 0) return <EmptyState />;
  const latest = editionLabel(editions[0]);

  let saved: Briefing[] = [];
  if (!DEMO_MODE) {
    const { data } = await createClient().from("briefings").select("*").order("created_at", { ascending: false }).limit(20);
    saved = data ?? [];
  }

  const presets = [
    `Give me a one-page executive briefing on the ${latest}: size, priorities, biggest changes, and the issues I should raise as Vice Chair.`,
    `Which departments grew fastest in the ${latest}, and which increases look hardest to justify?`,
    `What did Congress change between the NEP and the GAA last year? Which agencies gained or lost the most?`,
    `Summarize what ${HOME_PROVINCE} ${HOME_DISTRICT} gets in the ${latest} and how it compares with last year.`,
    `Draft 8 sharp questions for the DPWH budget hearing based on these numbers.`,
    `Explain how debt interest payments are squeezing the rest of the budget, in plain language for a press briefing.`,
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        eyebrow="AI insights"
        title="Ask the budget analyst"
        subtitle="Answers are computed from the budget data loaded in this app. Check key figures against the source documents before using them publicly."
      />
      <SampleBanner show={depts.some((d) => d.has_sample)} />
      <Chat presets={presets} canSave={!DEMO_MODE} saved={saved} />
    </main>
  );
}
