import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const updateSession = async (request: NextRequest) => {
  try {
    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("tu_supabase_url")) {
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

    try {
      await supabase.auth.getUser();
    } catch {}

    return supabaseResponse;
  } catch {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
