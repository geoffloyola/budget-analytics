"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Only same-site paths, so ?next= can't bounce a user to another site.
function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function signIn(formData: FormData) {
  const supabase = createClient();
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Wrong email or password.")}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
