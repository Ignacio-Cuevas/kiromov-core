import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const updateSession = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico";

  try {
    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("tu_supabase_url")) {
      if (!isPublicRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set('error', 'session_error');
        return NextResponse.redirect(loginUrl);
      }
      return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          try {
            const allCookies = request.cookies.getAll();
            return allCookies.filter(
              (c) =>
                !(
                  c.name.includes("-auth-token") &&
                  (!c.value || c.value.trim() === "" || c.value === "undefined")
                )
            );
          } catch {
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    let user = null;
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      user = currentUser;
    } catch {
      user = null;
    }

    // 1. Si no está autenticado y trata de acceder a una ruta protegida -> redirigir a /login
    if (!user && !isPublicRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    // 2. Si ya está autenticado y va a /login -> redirigir a /pacientes
    if (user && request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/pacientes', request.url));
    }

    return supabaseResponse;
  } catch {
    if (!isPublicRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }
};
