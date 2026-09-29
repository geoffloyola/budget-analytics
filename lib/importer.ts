import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAllocations, parseDistrictItems, UPSERT_KEYS, type CsvKind } from "@/lib/csv";

const CHUNK = 500;

export type ImportOutcome = { kind: CsvKind; imported: number; errors: string[] };

// Validates a CSV, merges rows that share an upsert key (DBM tables often
// list one agency/expense class across several program lines — those add up),
// then upserts in chunks. Needs a service-role client: tables have no write
// policies for signed-in users.
export async function importCsv(
  admin: SupabaseClient,
  kind: CsvKind,
  text: string
): Promise<ImportOutcome> {
  const parsed = kind === "allocations" ? parseAllocations(text) : parseDistrictItems(text);
  if (parsed.errors.length) return { kind, imported: 0, errors: parsed.errors };

  const keyCols = UPSERT_KEYS[kind].split(",");
  const merged = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) {
    const key = keyCols.map((c) => String((row as Record<string, unknown>)[c])).join("|");
    const prev = merged.get(key);
    if (prev) prev.amount_thousands += row.amount_thousands;
    else merged.set(key, { ...row });
  }

  const rows = [...merged.values()];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await admin
      .from(kind)
      .upsert(rows.slice(i, i + CHUNK), { onConflict: UPSERT_KEYS[kind] });
    if (error) return { kind, imported: i, errors: [error.message] };
  }
  return { kind, imported: rows.length, errors: [] };
}
