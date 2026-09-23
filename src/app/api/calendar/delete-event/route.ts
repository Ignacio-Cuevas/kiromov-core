import { NextResponse } from 'next/server';
import { eliminarEventoGoogleCalendar } from '@/actions/calendar';

export async function POST(req: Request) {
  try {
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
