// Imports a budget CSV into Supabase.
//
//   npm run import -- data/gaa-2026.csv
//   npm run import -- data/sample/allocations.csv data/sample/district_items.csv
//
// The file type (allocations vs district items) is detected from its header.
// Templates: data/templates/. Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { detectKind } from "../lib/csv";
import { importCsv } from "../lib/importer";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: npm run import -- <file.csv> [more.csv ...]");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  let failed = false;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const kind = detectKind(text);
    if (!kind) {
      console.error(`${file}: can't tell the file type from its header — see data/templates/.`);
      failed = true;
      continue;
    }
    const result = await importCsv(admin, kind, text);
    if (result.errors.length) {
      failed = true;
      console.error(`${file}: ${result.errors.length} problem(s); ${result.imported ? `rows after ${result.imported} not imported` : "nothing imported"}:`);
      result.errors.slice(0, 20).forEach((e) => console.error("  " + e));
    } else {
      console.log(`${file}: imported ${result.imported} ${kind} rows.`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
