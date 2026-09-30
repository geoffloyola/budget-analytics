// Grants someone access to the app.
//
//   npm run member:add -- <email> "<Full name>" <principal|staff|admin>
//
// First create their sign-in in Supabase → Authentication → Users → Add user
// (tick "Auto Confirm User", give them a temporary password). They'll be asked
// to choose their own password the first time they sign in.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const ROLES = ["principal", "staff", "admin"] as const;

async function main() {
  const [email, fullName, role = "staff"] = process.argv.slice(2);
  if (!email || !fullName || !ROLES.includes(role as (typeof ROLES)[number])) {
    console.error('Usage: npm run member:add -- <email> "<Full name>" <principal|staff|admin>');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Find the auth user by email (paged: listUsers returns 50 at a time).
  let userId: string | undefined;
  for (let page = 1; !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error(`No sign-in exists for ${email}. Create it first in Supabase → Authentication → Users → Add user.`);
    process.exit(1);
  }

  const { error } = await admin.from("members").upsert({ user_id: userId, full_name: fullName, role }, { onConflict: "user_id" });
  if (error) throw error;
  console.log(`${fullName} <${email}> can now use the app as ${role}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
