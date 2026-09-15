import { NextResponse } from 'next/server';
import { crearEventoGoogleCalendar, getLastCalendarError } from '@/utils/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const testResult = await crearEventoGoogleCalendar({
      pacienteNombre: 'PRUEBA CONEXION KIROMOV',
      pacienteTelefono: '+56 9 1234 5678',
      fecha: '2026-09-16',
      hora: '13:00',
      motivo: 'Test de Sincronización Automática'
    });

    if (!testResult) {
      const lastError = getLastCalendarError();
      return NextResponse.json({
        success: false,
        error: 'crearEventoGoogleCalendar devolvió null. Revisa las variables GOOGLE_PRIVATE_KEY y GOOGLE_SERVICE_ACCOUNT_EMAIL en Vercel.',
        detalles_error: lastError || 'No se capturaron detalles de error adicionales',
        diagnostico_variables: {
          has_service_account_email: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          service_account_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
          has_private_key: !!process.env.GOOGLE_PRIVATE_KEY,
          private_key_length: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
          calendar_id: process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com'
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mensaje: '¡Evento creado exitosamente en Google Calendar!',
      google_event_id: testResult
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || err.toString()
    }, { status: 500 });
  }
}
