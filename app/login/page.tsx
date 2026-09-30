import Image from "next/image";
import { signIn } from "./actions";
import FlagEmblem, { PH } from "@/components/FlagEmblem";
import batasan from "@/public/images/batasan.jpg";

export const metadata = { title: "Sign in · Budget Analytics" };

// Philippine time for the date line, like the rest of the app.
const monthYear = () =>
  new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", year: "numeric" });

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* The flag's colours as a thin band across the top. */}
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1" style={{ background: PH.BLUE }} />
        <span className="flex-1" style={{ background: PH.RED }} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-10 pt-8 lg:px-10 lg:pt-12">
        <div className="relative flex flex-col lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
          {/* Left: emblem, then the form below the title panel's band */}
          <div className="max-lg:contents lg:flex lg:flex-col">
            <div className="order-1 flex items-center gap-3 lg:order-none">
              <FlagEmblem size={46} />
              <div className="font-display leading-tight text-accent">
                <p className="text-[17px] font-semibold tracking-wide">Office of the Representative</p>
                <p className="text-[13px] tracking-wide opacity-80">House of Representatives · Philippines</p>
              </div>
            </div>

            {/* Room for the title panel on large screens */}
            <div aria-hidden className="hidden h-[19rem] lg:block" />

            <form action={signIn} className="order-4 mt-8 space-y-4 lg:order-none lg:mt-10">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-wide text-ink">Sign in</h2>
                <p className="mt-1 text-sm text-ink2">For the Congressman and authorized staff. Accounts are issued by the office.</p>
              </div>
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
                <p role="alert" className="rounded-lg border border-critical/25 bg-critical/10 px-3 py-2 text-sm text-critical">
                  {searchParams.error}
                </p>
              )}
              <button className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:brightness-110" style={{ background: PH.BLUE }} type="submit">
                Sign in
              </button>
              <p className="text-center text-sm text-ink2">
                Trouble signing in?{" "}
                <a href="/help#troubleshooting" className="text-accent underline underline-offset-2">
                  Read the help guide
                </a>
              </p>
            </form>
          </div>

          {/* Right: the Batasang Pambansa, tinted blue */}
          <div className="relative order-2 mt-6 h-56 overflow-hidden sm:h-72 lg:order-none lg:mt-0 lg:h-[38rem]">
            <Image
              src={batasan}
              alt="The Batasang Pambansa, home of the House of Representatives, in Quezon City"
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover object-[60%_45%] contrast-[1.08] grayscale"
            />
            <div aria-hidden className="absolute inset-0 mix-blend-multiply" style={{ background: "rgba(0, 56, 168, 0.55)" }} />
            <div aria-hidden className="absolute inset-0 mix-blend-screen" style={{ background: "rgba(90, 130, 210, 0.22)" }} />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          </div>

          {/* The title panel overlapping the photo, as in a report cover */}
          <div
            className="relative order-3 -mt-16 ml-4 mr-10 p-7 text-white shadow-xl sm:mr-24 lg:order-none lg:absolute lg:left-0 lg:top-[8.5rem] lg:m-0 lg:w-[36rem] lg:p-10"
            style={{ background: PH.BLUE }}
          >
            <h1 className="font-display leading-[1.05] tracking-wide">
              <span className="block text-4xl font-semibold sm:text-5xl">National Budget</span>
              <span className="block text-3xl font-light sm:text-[2.6rem]">Analytics</span>
            </h1>
            <span aria-hidden className="mt-6 block h-1 w-12" style={{ background: PH.GOLD }} />
            <p className="mt-5 font-display text-lg tracking-wide">
              Committee on Appropriations <span className="opacity-70">· {monthYear()}</span>
            </p>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 lg:px-10">
        <div className="border-t-2 pt-5" style={{ borderColor: "rgba(0, 56, 168, 0.18)" }}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-display font-semibold tracking-wide text-ink">Office</dt>
              <dd className="text-ink2">Office of the Representative</dd>
            </div>
            <div>
              <dt className="font-display font-semibold tracking-wide text-ink">Committee</dt>
              <dd className="text-ink2">Vice Chair, Committee on Appropriations</dd>
            </div>
            <div>
              <dt className="font-display font-semibold tracking-wide text-ink">Help</dt>
              <dd>
                <a href="/help" className="text-accent underline underline-offset-2">
                  User guide
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-display font-semibold tracking-wide text-ink">Photo</dt>
              <dd className="text-ink2">
                <a href="https://en.wikipedia.org/wiki/File:Batasan_front_qc.jpg" className="underline underline-offset-2" target="_blank" rel="noreferrer">
                  Batasang Pambansa
                </a>{" "}
                by Patrickroque01,{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline underline-offset-2" target="_blank" rel="noreferrer">
                  CC BY-SA 4.0
                </a>
                , tinted
              </dd>
            </div>
          </dl>
        </div>
      </footer>
    </div>
  );
}
