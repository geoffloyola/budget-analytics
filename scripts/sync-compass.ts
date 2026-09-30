// Pulls budget execution and release data from DBM COMPASS.
//
//   npm run sync:compass              fetch from COMPASS, write snapshot, save to Supabase
//   npm run sync:compass:load         save the existing snapshot to Supabase (no fetching)
//
// Always writes a snapshot to data/compass/ (what DEMO_MODE reads). When
// SUPABASE_SERVICE_ROLE_KEY is set, also upserts into the database.
// Takes a few minutes: requests are deliberately spaced out.

import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchExecution, fetchLgsf, fetchLocalReleases, mergeLgsf } from "../lib/compass";

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

async function save(totals: object[], rows: object[], lgsf: object[], releases: object[]) {
  const stored =
    (await upsert("execution_totals", totals, "fiscal_year")) &&
    (await upsert("execution", rows, "fiscal_year,department,agency")) &&
    (await upsert("lgsf_projects", lgsf, "fiscal_year,program,province,municipality,barangay,project")) &&
    (await upsert("local_releases", releases, "doc_no"));
  console.log(stored ? "Saved to Supabase." : "Supabase not configured: snapshot only.");
}

async function main() {
  if (process.argv.includes("--from-snapshot")) {
    const read = (f: string) => JSON.parse(readFileSync(path.join(OUT, f), "utf8"));
    const exec = read("execution.json");
    const lgsf = read("lgsf.json");
    const rel = read("releases.json");
    console.log(`Loading snapshot from ${exec.syncedAt}: ${exec.rows.length} execution rows, ${lgsf.rows.length} LGSF projects, ${rel.rows.length} releases.`);
    await save(exec.totals, exec.rows, mergeLgsf(lgsf.rows), rel.rows);
    return;
  }

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

  await save(totals, rows, lgsf, releases);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
