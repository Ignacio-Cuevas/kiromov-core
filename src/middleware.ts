import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Ejecutar el guard estricto de sesión de Supabase para todas las rutas
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Error de autenticación o sesión inválida' },
        { status: 401 }
      );
    }
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
