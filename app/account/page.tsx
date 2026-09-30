import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const firstTime = !user.user_metadata?.password_changed_at;

  return (
    <main className="mx-auto max-w-[440px] px-4 py-10">
      <div className="card p-6 sm:p-7" style={{ boxShadow: "var(--shadow-lg)" }}>
        <p className="eyebrow mb-1.5">Your account</p>
        <h1 className="text-[22px] font-bold tracking-tight">
          {firstTime ? "Set your own password" : "Change password"}
        </h1>
        <p className="mt-1 text-sm text-ink2">
          {firstTime
            ? "You signed in with a temporary password. Choose your own before continuing."
            : "Signed in as "}
          {!firstTime && <span className="font-medium text-ink">{user.email}</span>}
        </p>
        <ChangePasswordForm email={user.email ?? ""} firstTime={firstTime} />
      </div>
    </main>
  );
}
