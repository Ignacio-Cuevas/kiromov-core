import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { eliminarEventoGoogleCalendar } from '@/actions/calendar';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Servicio de base de datos no disponible' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado: se requiere sesión activa' }, { status: 401 });
    }

    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Falta eventId' }, { status: 400 });
    }
    const res = await eliminarEventoGoogleCalendar(eventId);
    return NextResponse.json({ success: res });
  } catch (err: any) {
    console.error('Error en /api/calendar/delete-event:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
