// Applies supabase/migrations/*.sql to the database, in order, once each.
//
//   npm run db:migrate
//
// Needs SUPABASE_DB_URL in .env.local: Supabase → Project Settings →
// Database → Connection string → "Session pooler" (URI), with your database
// password filled in. Applied files are recorded in public._migrations.

import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

config({ path: ".env.local" });

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Set SUPABASE_DB_URL in .env.local (Supabase → Project Settings → Database → Connection string).");
    process.exit(1);
  }
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  await db.query(`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`);
  await db.query(`alter table public._migrations enable row level security`); // no policies: invisible to the API

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await db.query<{ name: string }>("select name from public._migrations");
  const done = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), "utf8");
    try {
      await db.query("begin");
      await db.query(sql);
      await db.query("insert into public._migrations (name) values ($1)", [file]);
      await db.query("commit");
      console.log(`  + ${file}`);
    } catch (e) {
      await db.query("rollback");
      console.error(`  ✗ ${file}: ${(e as Error).message}`);
      await db.end();
      process.exit(1);
    }
  }
  await db.end();
  console.log("Database is up to date.");
}

main();
