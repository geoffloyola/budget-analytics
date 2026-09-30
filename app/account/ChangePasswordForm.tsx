"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { changePassword } from "./actions";

export default function ChangePasswordForm({ email, firstTime }: { email: string; firstTime: boolean }) {
  const [state, action] = useFormState(changePassword, null);

  if (state?.ok) {
    return (
      <div className="mt-6">
        <p role="status" className="rounded-lg bg-good/10 px-3 py-2 text-sm text-good">
          Password changed. Use your new password next time you sign in.
        </p>
        <Link href="/" className="btn-primary mt-4 w-full py-2.5">
          Continue
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {state?.error && (
        <p role="alert" className="rounded-lg border border-critical/25 bg-critical/10 px-3 py-2 text-sm text-critical">
          {state.error}
        </p>
      )}
      <PasswordField name="current" label={firstTime ? "Temporary password" : "Current password"} autoComplete="current-password" />
      <PasswordField name="next" label="New password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." />
      <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
      <Submit />
    </form>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block text-[13px] font-medium text-ink2">{label}</span>
      <input name={name} type="password" required autoComplete={autoComplete} minLength={name === "current" ? 1 : 8} className="input" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-1 w-full py-2.5">
      {pending ? "Saving…" : "Change password"}
    </button>
  );
}
