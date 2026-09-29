"use client";

import { useRef, useState } from "react";
import { saveBriefing } from "./actions";
import { formatManila } from "@/lib/time";
import type { Briefing } from "@/lib/supabase/types";

type Turn = { role: "user" | "assistant"; content: string };

export default function Chat({ presets, canSave, saved }: { presets: string[]; canSave: boolean; saved: Briefing[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Turn[] = [...turns, { role: "user", content: q }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
        throw new Error(err.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: text }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setTurns([...history, { role: "assistant", content: `⚠ ${(e as Error).message}` }]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-6">
      {turns.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {presets.map((p) => (
            <button key={p} onClick={() => ask(p)} className="card p-3 text-left text-sm text-ink2 transition hover:border-accent hover:text-ink">
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4" aria-live="polite">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-xl bg-accent px-4 py-2.5 text-sm text-onaccent">
              {t.content}
            </div>
          ) : (
            <div key={i} className="card p-5">
              {t.content ? (
                <Markdown text={t.content} />
              ) : (
                <p className="animate-pulse text-sm text-muted">Analyzing the budget data…</p>
              )}
              {t.content && !(busy && i === turns.length - 1) && (
                <div className="no-print mt-4 flex gap-2 border-t border-border pt-3">
                  <button className="btn-ghost py-1 text-xs" onClick={() => navigator.clipboard.writeText(t.content)}>
                    Copy
                  </button>
                  {canSave && (
                    <button
                      className="btn-ghost py-1 text-xs"
                      disabled={savedIdx.has(i)}
                      onClick={async () => {
                        const r = await saveBriefing(turns[i - 1]?.content ?? "", t.content);
                        if (!r.error) setSavedIdx(new Set(savedIdx).add(i));
                        else alert(r.error);
                      }}
                    >
                      {savedIdx.has(i) ? "Saved" : "Save briefing"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      <form
        className="no-print sticky bottom-4 flex gap-2 rounded-xl border border-border bg-surface p-2"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="q" className="sr-only">
          Ask about the budget
        </label>
        <textarea
          id="q"
          rows={1}
          className="input min-h-[2.5rem] resize-y border-0 focus:shadow-none"
          placeholder="Ask about the budget, e.g. “How much goes to flood control?”"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
        />
        {busy ? (
          <button type="button" className="btn-secondary" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button className="btn-primary" disabled={!input.trim()}>
            Ask
          </button>
        )}
        {turns.length > 0 && !busy && (
          <button type="button" className="btn-ghost" onClick={() => setTurns([])}>
            New
          </button>
        )}
      </form>

      {saved.length > 0 && (
        <section>
          <h2 className="section-title">Saved briefings</h2>
          <ul className="mt-3 space-y-2">
            {saved.map((b) => (
              <li key={b.id}>
                <details className="card p-4">
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium">{b.question}</span>{" "}
                    <span className="text-xs text-muted">· {formatManila(b.created_at)}</span>
                  </summary>
                  <div className="mt-3 border-t border-border pt-3">
                    <Markdown text={b.answer} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Minimal Markdown: headings, bullet/numbered lists, bold, italics, paragraphs.
// Rendered as React elements (no raw HTML), so model output can't inject markup.
function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={(list.ordered ? "list-decimal" : "list-disc") + " space-y-1 pl-5"}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (heading) {
      blocks.push(
        <h3 key={blocks.length} className={heading[1].length <= 2 ? "text-base font-semibold" : "text-sm font-semibold"}>
          {inline(heading[2])}
        </h3>
      );
    } else if (line.trim() === "---") {
      blocks.push(<hr key={blocks.length} className="border-border" />);
    } else if (line.trim()) {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-3 text-sm leading-relaxed text-ink">{blocks}</div>;
}

function inline(s: string): React.ReactNode[] {
  // _italic_ only at word edges, so identifiers like ANTHROPIC_API_KEY stay intact.
  return s.split(/(\*\*[^*]+\*\*|(?<![\w])_[^_]+_(?![\w])|\*[^*]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^(_[^_]+_|\*[^*]+\*)$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
