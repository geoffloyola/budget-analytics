import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session and requires sign-in for every page:
// budget analysis for the Congressman's office is internal. Membership (who
// may read data at all) is enforced in the database by row-level security.
// In DEMO_MODE (dev only) the app serves sample CSVs from disk and skips sign-in.
// /help is open so people who can't sign in can read the troubleshooting guide.
const PUBLIC_PATHS = ["/login", "/help"];

export async function middleware(request: NextRequest) {
  // Demo mode (sample data, no sign-in) only under `next dev`; see lib/data.ts.
  if (process.env.DEMO_MODE === "1" && process.env.NODE_ENV !== "production") return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Accounts are created with a temporary password; until the person sets
  // their own (app/account/actions.ts records password_changed_at), send them
  // to the change-password page first.
  if (user && !user.user_metadata?.password_changed_at && pathname !== "/account") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Set your own password first." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpe?g|svg|ico|webp)$).*)"],
};
