import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lista Blanca Estricta (Allowlist) de rutas públicas que no requieren autenticación.
 * Cualquier ruta que no coincida exactamente con estos criterios se considera PRIVADA (Fail-Closed).
 */
export function isPublicRoute(pathname: string): boolean {
  // 1. Portal público de agendamiento para pacientes
  if (pathname === '/agendar' || pathname.startsWith('/agendar/')) return true;

  // 2. Portal de acceso / login
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;

  // 3. Endpoints de autenticación y callbacks de Supabase
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return true;

  // 4. Endpoints de API pública (slots, book)
  if (pathname === '/api/public' || pathname.startsWith('/api/public/')) return true;

  // 5. Webhooks de terceros autenticados criptográficamente con secret key
  if (pathname.startsWith('/api/webhooks/')) return true;

  // 6. Assets estáticos del bundle de Next.js
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png'
  ) {
    return true;
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isPublic = isPublicRoute(pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Si no hay configuración de base de datos activa, bloquear todo lo privado
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("tu_supabase_url")) {
    if (!isPublic) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'No autorizado: configuración de servidor incompleta' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          })
        );
      },
    },
  });

  // 1. Verificación criptográfica estricta con Supabase Auth (getUser valida el token contra Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === '/login' || pathname.startsWith('/login/');

  // 2. Si el usuario ya está autenticado e intenta ir a /login -> redirigir a /pacientes
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/pacientes', request.url));
  }

  // 3. FAIL-CLOSED: Si no hay usuario autenticado y la ruta NO es pública
  if (!user && !isPublic) {
    // Si es un endpoint de API interna (/api/calendar/*, /api/ai/*, etc.), responder con 401 JSON estricto
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado: se requiere sesión activa de profesional' },
        { status: 401 }
      );
    }

    // Para cualquier ruta de página (/agenda, /pacientes, /finanzas, /planes, etc.), redirigir de inmediato a /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
