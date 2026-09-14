import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // EN LOCALHOST (Desarrollo): Permitir navegación directa sin bloqueos de cookies HTTP
  if (process.env.NODE_ENV === 'development') {
    // Si entra a la raíz o a login estando en dev, permitir ir directo a /pacientes
    if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login') {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // EN PRODUCCIÓN (Vercel / HTTPS): Ejecutar el guard estricto de Supabase
  try {
    return await updateSession(request);
  } catch {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set('error', 'session_error');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|branding|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
