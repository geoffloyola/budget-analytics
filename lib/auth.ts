import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/data";
import type { Member } from "@/lib/supabase/types";

export type Viewer = { member: Member | null; email: string | null; demo: boolean };

// Who is looking at the page. A signed-in user with no `members` row can sign
// in but sees no data (RLS); pages show them a "not yet granted" message.
export async function getViewer(): Promise<Viewer> {
  if (DEMO_MODE) {
    return {
      demo: true,
      email: null,
      member: { user_id: "demo", full_name: "Demo viewer", role: "admin", created_at: "" },
    };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { demo: false, email: null, member: null };
  const { data } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle();
  return { demo: false, email: user.email ?? null, member: data };
}
