import type { ReactNode } from "react";

// A small Markdown renderer for the app's own help text (content/*.md):
// headings, paragraphs, bullet and numbered lists (sub-items indented 4
// spaces), pipe tables, **bold**, *italic*, `code`, [links](url), and
// [[diagram:name]] placeholders. Output is React elements only, never raw
// HTML.

export type Heading = { id: string; text: string };

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part))
      return (
        <code key={i} className="rounded bg-surface2 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const external = /^https?:/.test(link[2]);
      return (
        <a key={i} href={link[2]} className="text-accent underline underline-offset-2" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
          {link[1]}
        </a>
      );
    }
    if (/^\*[^*\s][^*]*\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

type ListItem = { text: string; children: { ordered: boolean; items: string[] } | null };

export function headingsOf(md: string): Heading[] {
  return md
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => ({ id: slug(l.slice(3)), text: l.slice(3).trim() }));
}

export function Markdown({ source, diagrams = {} }: { source: string; diagrams?: Record<string, ReactNode> }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  const key = () => out.length;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const text = h[2].trim();
      if (h[1] === "#") out.push(<h1 key={key()} className="text-2xl font-semibold tracking-tight">{inline(text)}</h1>);
      else if (h[1] === "##")
        out.push(
          <h2 key={key()} id={slug(text)} className="scroll-mt-20 border-t border-border pt-8 text-xl font-semibold tracking-tight">
            {inline(text)}
          </h2>
        );
      else out.push(<h3 key={key()} className="text-base font-semibold">{inline(text)}</h3>);
      i++;
      continue;
    }

    const diagram = line.trim().match(/^\[\[diagram:([a-z0-9-]+)\]\]$/);
    if (diagram) {
      out.push(<div key={key()}>{diagrams[diagram[1]] ?? null}</div>);
      i++;
      continue;
    }

    // Pipe table: header row, separator row, body rows.
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().match(/^\|[\s:|-]+\|$/)) {
      const cells = (l: string) =>
        l
          .trim()
          .replace(/^\||\|$/g, "")
          .split(/(?<!\\)\|/)
          .map((c) => c.trim());
      const head = cells(line);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
      out.push(
        <div key={key()} className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left">
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="px-3 py-2 font-semibold">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k} className="border-t border-border align-top">
                  {r.map((c, j) => (
                    <td key={j} className={"px-3 py-2 " + (j === 0 ? "font-medium" : "text-ink2")}>
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Lists, with one level of sub-items indented by 4 spaces.
    const itemRe = /^(\d+\.|[-*])\s+(.*)$/;
    const top = line.match(itemRe);
    if (top) {
      const ordered = /\d/.test(top[1]);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(itemRe);
        const sub = l.match(/^ {2,}(\d+\.|[-*])\s+(.*)$/);
        if (m && /\d/.test(m[1]) === ordered) items.push({ text: m[2], children: null });
        else if (sub && items.length) {
          const last = items[items.length - 1];
          last.children ??= { ordered: /\d/.test(sub[1]), items: [] };
          last.children.items.push(sub[2]);
        } else break;
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={key()} className={(ordered ? "list-decimal" : "list-disc") + " space-y-1.5 pl-6 marker:text-muted"}>
          {items.map((it, k) => (
            <li key={k}>
              {inline(it.text)}
              {it.children && (
                <ul className="mt-1 list-[circle] space-y-1 pl-5">
                  {it.children.items.map((c, n) => (
                    <li key={n}>{inline(c)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Tag>
      );
      continue;
    }

    // Paragraph: consecutive plain lines.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,3}\s|\||\d+\.\s|[-*]\s|\[\[)/)) para.push(lines[i++].trim());
    out.push(
      <p key={key()} className="text-ink2">
        {inline(para.join(" "))}
      </p>
    );
  }

  return <div className="space-y-4 leading-relaxed">{out}</div>;
}
