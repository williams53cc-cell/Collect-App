import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes a signed-out visitor is allowed to see without being bounced to
 * /login: the public marketing page at the root ("/"), plus the /login and
 * /auth flows themselves (the sign-in form and the auth callback route).
 * Every other route requires a session. Exported and tested on its own
 * (middleware.test.ts) since the real middleware below needs a mocked
 * Supabase client and NextRequest to exercise directly — this is the part
 * most likely to silently regress when a new public page is added. */
export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth")
  );
}

/** Whether a signed-in-but-not-yet-onboarded visitor should be bounced to
 * /onboarding instead of the page they asked for. A completed profile
 * always wins (nothing to gate); otherwise anything already public
 * (isPublicRoute) or the onboarding flow itself stays reachable — the
 * flow obviously can't require itself to be finished to load, and someone
 * mid-wizard still needs to be able to sign out via /login. */
export function needsOnboardingRedirect(
  pathname: string,
  onboardingCompleted: boolean
): boolean {
  if (onboardingCompleted) return false;
  if (isPublicRoute(pathname)) return false;
  if (pathname.startsWith("/onboarding")) return false;
  return true;
}

/** The reverse case: someone who has already finished onboarding
 * shouldn't be able to re-enter the wizard (e.g. an old bookmark) — send
 * them to the dashboard instead. Editing business info afterwards is
 * what Settings is for. */
export function shouldLeaveOnboarding(
  pathname: string,
  onboardingCompleted: boolean
): boolean {
  return onboardingCompleted && pathname.startsWith("/onboarding");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
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

  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("onboarding_completed")
      .maybeSingle();
    const onboardingCompleted = profile?.onboarding_completed ?? false;

    if (needsOnboardingRedirect(request.nextUrl.pathname, onboardingCompleted)) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (shouldLeaveOnboarding(request.nextUrl.pathname, onboardingCompleted)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
