// Pulls budget execution and release data from DBM COMPASS.
//
//   npm run sync:compass
//
// Always writes a snapshot to data/compass/ (what DEMO_MODE reads). When
// SUPABASE_SERVICE_ROLE_KEY is set, also upserts into the database.
// Takes a few minutes: requests are deliberately spaced out.

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchExecution, fetchLgsf, fetchLocalReleases } from "../lib/compass";

config({ path: ".env.local" });

const PROVINCE = process.env.NEXT_PUBLIC_HOME_PROVINCE ?? "Bataan";
const OUT = path.join(process.cwd(), "data", "compass");
const log = (m: string) => console.log(`  ${m}`);

async function upsert(table: string, rows: object[], onConflict: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || process.env.DEMO_MODE === "1") return false;
  const db = createClient(url, key, { auth: { persistSession: false } });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return true;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const syncedAt = new Date().toISOString();

  console.log("Budget execution (SAAODB)…");
  const { rows, totals } = await fetchExecution(log);
  const years = totals.map((t) => t.fiscal_year);

  console.log(`Local Government Support Fund projects in ${PROVINCE}…`);
  const lgsf = await fetchLgsf(PROVINCE, years, log);

  console.log(`Release orders mentioning ${PROVINCE}…`);
  const releases = await fetchLocalReleases(PROVINCE, years, log);

  const snapshot = { source: "DBM COMPASS (compass.dbm.gov.ph)", syncedAt, province: PROVINCE };
  writeFileSync(path.join(OUT, "execution.json"), JSON.stringify({ ...snapshot, totals, rows }, null, 1));
  writeFileSync(path.join(OUT, "lgsf.json"), JSON.stringify({ ...snapshot, rows: lgsf }, null, 1));
  writeFileSync(path.join(OUT, "releases.json"), JSON.stringify({ ...snapshot, rows: releases }, null, 1));
  console.log(`Snapshot written to data/compass/ (${rows.length} execution rows, ${lgsf.length} LGSF projects, ${releases.length} releases).`);

  const stored =
    (await upsert("execution_totals", totals, "fiscal_year")) &&
    (await upsert("execution", rows, "fiscal_year,department,agency")) &&
    (await upsert("lgsf_projects", lgsf, "fiscal_year,program,province,municipality,barangay,project")) &&
    (await upsert("local_releases", releases, "doc_no"));
  console.log(stored ? "Saved to Supabase." : "Supabase not configured: snapshot only.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
