"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBriefing(question: string, answer: string): Promise<{ error?: string }> {
  const { error } = await createClient()
    .from("briefings")
    .insert({ question: question.slice(0, 4000), answer: answer.slice(0, 100_000) });
  if (error) return { error: error.message };
  revalidatePath("/insights");
  return {};
}
