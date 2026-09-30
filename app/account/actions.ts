"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { newPasswordProblem } from "@/lib/password";

export interface PasswordResult {
  ok: boolean;
  error?: string;
}

export async function changePassword(_prev: PasswordResult | null, formData: FormData): Promise<PasswordResult> {
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next) return { ok: false, error: "Fill in your current and new password." };
  const problem = newPasswordProblem(next, confirm);
  if (problem) return { ok: false, error: problem };
  if (next === current) return { ok: false, error: "Choose a password different from your current one." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Your session has expired. Sign in again." };

  // Check the current password with a throwaway client, so a signed-in
  // computer left unattended can't be used to take over the account. It
  // doesn't touch this browser's session cookies.
  const checker = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await checker.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { ok: false, error: "Your current password is incorrect." };
  await checker.auth.signOut({ scope: "local" });

  // password_changed_at also clears the first-sign-in prompt (middleware.ts).
  const { error } = await supabase.auth.updateUser({
    password: next,
    data: { password_changed_at: new Date().toISOString() },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
