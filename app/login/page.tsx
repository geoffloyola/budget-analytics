import { signIn } from "./actions";

export const metadata = { title: "Sign in · Budget Analytics" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <p className="eyebrow">Office of the Representative</p>
      <h1 className="mt-1 text-2xl font-semibold">National Budget Analytics</h1>
      <p className="mt-2 text-sm text-ink2">
        For the Congressman and authorized staff only. Accounts are issued by the office.
      </p>
      <form action={signIn} className="card mt-6 space-y-4 p-5">
        <input type="hidden" name="next" value={searchParams.next ?? "/"} />
        <label className="block text-sm font-medium">
          Email
          <input className="input mt-1" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input className="input mt-1" type="password" name="password" autoComplete="current-password" required />
        </label>
        {searchParams.error && (
          <p role="alert" className="text-sm text-critical">
            {searchParams.error}
          </p>
        )}
        <button className="btn-primary w-full" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
