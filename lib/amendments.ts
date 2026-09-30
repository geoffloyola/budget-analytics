import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/data";

// Amendments log (supabase/migrations/0004_amendments.sql). In DEMO_MODE
// (dev only) it's kept in a local JSON file instead, so the pages can be
// tried without signing in.

export const STATUSES = [
  { key: "proposed", label: "Proposed", open: true },
  { key: "committee", label: "Adopted in committee", open: true },
  { key: "plenary", label: "Approved in House plenary", open: true },
  { key: "senate", label: "In Senate version", open: true },
  { key: "bicam", label: "In bicameral version", open: true },
  { key: "enacted", label: "Enacted in GAA", open: false },
  { key: "rejected", label: "Rejected", open: false },
  { key: "withdrawn", label: "Withdrawn", open: false },
  { key: "vetoed", label: "Vetoed", open: false },
] as const;
export type Status = (typeof STATUSES)[number]["key"];
export const statusLabel = (s: string) => STATUSES.find((x) => x.key === s)?.label ?? s;
export const isOpen = (s: string) => STATUSES.find((x) => x.key === s)?.open ?? false;

export const KINDS = [
  { key: "realignment", label: "Realignment (move funds)" },
  { key: "increase", label: "Increase" },
  { key: "decrease", label: "Cut" },
  { key: "new_item", label: "New item / project" },
  { key: "provision", label: "Special provision (text)" },
] as const;
export type Kind = (typeof KINDS)[number]["key"];
export const kindLabel = (k: string) => KINDS.find((x) => x.key === k)?.label ?? k;

export type AmendmentLine = {
  department_code: string;
  agency_code: string | null;
  item: string | null;
  amount_thousands: number; // + added, − cut
};

export type Amendment = {
  id: number;
  fiscal_year: number;
  title: string;
  kind: Kind;
  proposed_by: string;
  justification: string | null;
  status: Status;
  home_district: boolean;
  created_at: string;
  updated_at: string;
  lines: AmendmentLine[];
};

export type AmendmentEvent = { status: string; note: string | null; created_at: string; by_name: string | null };

export type AmendmentInput = Omit<Amendment, "id" | "created_at" | "updated_at" | "status">;

// ---- Demo store ---------------------------------------------------------------

type DemoDb = { next: number; amendments: Amendment[]; events: (AmendmentEvent & { amendment_id: number })[] };
const demoFile = () => path.join(process.env.DEMO_DATA_DIR ?? path.join(process.cwd(), "data", "demo"), "amendments.json");
async function demoLoad(): Promise<DemoDb> {
  try {
    return JSON.parse(await readFile(demoFile(), "utf8"));
  } catch {
    return { next: 1, amendments: [], events: [] };
  }
}
async function demoSave(db: DemoDb) {
  await mkdir(path.dirname(demoFile()), { recursive: true });
  await writeFile(demoFile(), JSON.stringify(db, null, 1));
}

// ---- Reads ------------------------------------------------------------------------

const toNum = (l: AmendmentLine) => ({ ...l, amount_thousands: Number(l.amount_thousands) });

export async function listAmendments(fiscalYear?: number): Promise<Amendment[]> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    return db.amendments.filter((a) => !fiscalYear || a.fiscal_year === fiscalYear).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  let q = createClient()
    .from("amendments")
    .select("*, lines:amendment_lines(department_code, agency_code, item, amount_thousands)")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (fiscalYear) q = q.eq("fiscal_year", fiscalYear);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as unknown as Amendment[]).map((a) => ({ ...a, lines: a.lines.map(toNum) }));
}

export async function getAmendment(id: number): Promise<{ amendment: Amendment; events: AmendmentEvent[] } | null> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    const amendment = db.amendments.find((a) => a.id === id);
    return amendment ? { amendment, events: db.events.filter((e) => e.amendment_id === id).reverse() } : null;
  }
  const supabase = createClient();
  const [{ data: a }, { data: ev }] = await Promise.all([
    supabase.from("amendments").select("*, lines:amendment_lines(department_code, agency_code, item, amount_thousands)").eq("id", id).maybeSingle(),
    supabase.from("amendment_events_named").select("status, note, created_at, by_name").eq("amendment_id", id).order("created_at", { ascending: false }),
  ]);
  if (!a) return null;
  const amendment = a as unknown as Amendment;
  return { amendment: { ...amendment, lines: amendment.lines.map(toNum) }, events: (ev ?? []) as AmendmentEvent[] };
}

// ---- Writes (called from server actions after validation) ----------------------

export async function createAmendment(input: AmendmentInput, byName: string): Promise<number> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    const now = new Date().toISOString();
    const id = db.next++;
    db.amendments.push({ ...input, id, status: "proposed", created_at: now, updated_at: now });
    db.events.push({ amendment_id: id, status: "proposed", note: "Created", created_at: now, by_name: byName });
    await demoSave(db);
    return id;
  }
  const supabase = createClient();
  const { lines, ...fields } = input;
  const { data, error } = await supabase.from("amendments").insert(fields).select("id").single();
  if (error) throw new Error(error.message);
  const id = data.id as number;
  if (lines.length) {
    const { error: le } = await supabase.from("amendment_lines").insert(lines.map((l) => ({ ...l, amendment_id: id })));
    if (le) throw new Error(le.message);
  }
  await supabase.from("amendment_events").insert({ amendment_id: id, status: "proposed", note: "Created" });
  return id;
}

export async function updateAmendment(id: number, input: AmendmentInput): Promise<void> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    const a = db.amendments.find((x) => x.id === id);
    if (!a) throw new Error("Not found");
    Object.assign(a, input, { updated_at: new Date().toISOString() });
    db.events.push({ amendment_id: id, status: a.status, note: "Details edited", created_at: new Date().toISOString(), by_name: "Demo viewer" });
    await demoSave(db);
    return;
  }
  const supabase = createClient();
  const { lines, ...fields } = input;
  const { error } = await supabase.from("amendments").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  // Replace the lines wholesale: simpler and the history note records the edit.
  const del = await supabase.from("amendment_lines").delete().eq("amendment_id", id);
  if (del.error) throw new Error(del.error.message);
  if (lines.length) {
    const { error: le } = await supabase.from("amendment_lines").insert(lines.map((l) => ({ ...l, amendment_id: id })));
    if (le) throw new Error(le.message);
  }
  const { data: cur } = await supabase.from("amendments").select("status").eq("id", id).single();
  await supabase.from("amendment_events").insert({ amendment_id: id, status: cur?.status ?? "proposed", note: "Details edited" });
}

export async function setStatus(id: number, status: Status, note: string | null, byName: string): Promise<void> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    const a = db.amendments.find((x) => x.id === id);
    if (!a) throw new Error("Not found");
    a.status = status;
    a.updated_at = new Date().toISOString();
    db.events.push({ amendment_id: id, status, note, created_at: a.updated_at, by_name: byName });
    await demoSave(db);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("amendments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  const { error: ee } = await supabase.from("amendment_events").insert({ amendment_id: id, status, note });
  if (ee) throw new Error(ee.message);
}

export async function deleteAmendment(id: number): Promise<void> {
  if (DEMO_MODE) {
    const db = await demoLoad();
    db.amendments = db.amendments.filter((a) => a.id !== id);
    db.events = db.events.filter((e) => e.amendment_id !== id);
    await demoSave(db);
    return;
  }
  const { error, count } = await createClient().from("amendments").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Only the person who created an amendment, or an admin, can delete it.");
}

// ---- Summaries -----------------------------------------------------------------------

export function totals(a: Amendment) {
  const added = a.lines.filter((l) => l.amount_thousands > 0).reduce((s, l) => s + l.amount_thousands, 0);
  const cut = -a.lines.filter((l) => l.amount_thousands < 0).reduce((s, l) => s + l.amount_thousands, 0);
  return { added, cut, net: added - cut };
}
