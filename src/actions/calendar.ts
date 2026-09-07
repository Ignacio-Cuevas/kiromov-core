'use server';

export async function syncEventToGoogleCalendar(payload: {
  action: 'create_event' | 'update_event' | 'cancel_event';
  cita_id: string; // Supabase ID
  google_event_id?: string;
  fecha?: string;
  hora?: string;
  paciente_nombre?: string;
  motivo_consulta?: string;
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  
  if (!url) {
    console.warn('Falta GOOGLE_APPS_SCRIPT_URL en .env.local. Saltando sincronización a Calendar.');
    return { success: false, error: 'Falta GOOGLE_APPS_SCRIPT_URL' };
  }

  try {
    console.log('[SYNC CALENDAR] Enviando payload a Apps Script:', payload);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[SYNC CALENDAR] Respuesta de Apps Script:', data);
    return data; 
  } catch (error: any) {
    console.error('[SYNC CALENDAR] Error al sincronizar con Google Calendar via Apps Script:', error);
    return { success: false, error: error.message };
  }
}
