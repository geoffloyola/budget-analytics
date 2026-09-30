import Anthropic from "@anthropic-ai/sdk";
import { getViewer } from "@/lib/auth";
import {
  getAgencyTotals,
  getDepartmentTotals,
  getDistrictItems,
  getExecution,
  getLgsfProjects,
  getLocalReleases,
  HOME_DISTRICT,
  HOME_PROVINCE,
} from "@/lib/data";
import { buildCompassContext, buildDataContext } from "@/lib/analytics";
import { manilaDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const client = new Anthropic();

const PRINCIPAL =
  process.env.PRINCIPAL_TITLE ?? "a Member of the House of Representatives who is Vice Chair of the Committee on Appropriations";

// Stable instructions. Kept byte-identical between requests so the prompt
// cache (instructions + data block) is reused. Volatile bits (today's date)
// go after the cache breakpoint.
const INSTRUCTIONS = `You are the budget analyst for the office of ${PRINCIPAL}, Philippine House of Representatives. Staff and the Member use you to understand the national budget: the National Expenditure Program (NEP, the President's proposal) and the General Appropriations Act (GAA, the enacted budget).

The office's home district is ${HOME_PROVINCE}, ${HOME_DISTRICT}.

Your data is in two blocks below. <budget_data> holds allocations imported by the office for each budget version: NEP (President's proposal), HOUSE (House version of the GAB), SENATE (Senate version), BICAM (bicameral conference version) and GAA (enacted). For a fiscal year in Congress, compare each version with the one before it to show what changed. <official_execution> holds official DBM COMPASS data: budget execution by department (released, committed/obligated, paid/disbursed, unreleased) and release orders and Local Government Support Fund projects in the home province. The execution "appropriations" include continuing appropriations carried over from earlier years, so they are not the same as GAA figures; use "current_year" for new appropriations. A year whose period isn't FY is partial-year: say so. Amounts in both blocks are in THOUSAND pesos; convert when you write (e.g. 1,234,567,890 thousand = ₱1.23 trillion). Always name the edition you are citing (e.g. "FY2027 NEP").

How to answer:
- Ground every figure in the data provided. Compute totals, differences and percentages from the rows yourself and double-check the arithmetic. If the data doesn't cover what's asked (a program-level item, a year not loaded, unprogrammed appropriations), say so plainly and say what document would answer it, e.g. the GAA volume, NEP, BESF or an agency's budget brief. Never invent figures.
- If your answer uses <budget_data> and it contains SAMPLE rows (see <data_status>), open with one line warning that those figures are sample placeholders, not official. <official_execution> figures are real; cite them as "DBM COMPASS".
- Be useful to a legislator: lead with the answer, then the few numbers that matter, then what it implies. Where relevant, suggest pointed questions to raise with the agency during budget hearings or plenary debate, and note realignment options.
- Stay factual and non-partisan. Distinguish what the numbers show from interpretation.
- Write in clear English with short paragraphs, bullet points and bold for key figures. Keep routine answers under about 300 words. Briefings can be longer, with headings.`;

type ChatTurn = { role: "user" | "assistant"; content: string };

function validTurns(body: unknown): ChatTurn[] | null {
  const msgs = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  const turns = msgs.slice(-20).map((m) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: typeof m?.content === "string" ? m.content.slice(0, 8000) : "",
  })) as ChatTurn[];
  if (turns[0].role !== "user") turns.shift();
  if (turns.length === 0 || turns[turns.length - 1].role !== "user" || !turns.some((t) => t.content.trim())) return null;
  return turns;
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.member) return Response.json({ error: "Not authorized" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "AI insights aren't set up yet: add ANTHROPIC_API_KEY to the server environment." }, { status: 503 });
  }

  const turns = validTurns(await req.json().catch(() => null));
  if (!turns) return Response.json({ error: "Send { messages: [{ role, content }] } ending with a user message." }, { status: 400 });

  const [depts, agencies, district, execution, lgsf, releases] = await Promise.all([
    getDepartmentTotals(),
    getAgencyTotals(),
    getDistrictItems(),
    getExecution(),
    getLgsfProjects(),
    getLocalReleases(),
  ]);
  if (depts.length === 0) return Response.json({ error: "No budget data loaded yet." }, { status: 409 });

  const hasSample = depts.some((d) => d.has_sample) || district.some((d) => d.source === "SAMPLE");
  const dataBlock = `<budget_data>\n${buildDataContext(depts, agencies, district)}\n</budget_data>\n<data_status>${
    hasSample ? "Contains SAMPLE rows: generated placeholders, NOT official figures." : "Imported from official documents."
  }</data_status>\n<official_execution source="DBM COMPASS" synced="${execution.syncedAt ?? "never"}">\n${buildCompassContext(
    execution.totals,
    execution.rows,
    lgsf.rows,
    releases
  )}\n</official_execution>`;

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    output_config: { effort: "medium" },
    // On a safety decline, re-run on Anthropic's recommended fallback model
    // instead of returning an empty answer.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: `${INSTRUCTIONS}\n\n${dataBlock}`, cache_control: { type: "ephemeral", ttl: "1h" } },
      { type: "text", text: `Today is ${manilaDate()} (Philippine time).` },
    ],
    messages: turns,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_The model declined to answer this request. Try rephrasing the question._"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_(Answer cut off at the length limit. Ask me to continue.)_"));
        }
      } catch (err) {
        console.error("/api/ask failed:", err);
        const msg =
          err instanceof Anthropic.AuthenticationError
            ? "The AI service key is missing or invalid (ANTHROPIC_API_KEY)."
            : err instanceof Anthropic.RateLimitError
              ? "The AI service is busy. Please try again in a minute."
              : err instanceof Anthropic.APIError
                ? `AI service error (${err.status}).`
                : "Connection to the AI service failed.";
        controller.enqueue(encoder.encode(`\n\n_${msg}_`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
