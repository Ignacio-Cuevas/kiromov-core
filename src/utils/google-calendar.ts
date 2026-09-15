import { google } from 'googleapis';

let lastCalendarError: any = null;

export function getLastCalendarError() {
  return lastCalendarError;
}

const getCalendarClient = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('Faltan credenciales de Google Service Account: GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY no están configuradas.');
  }

  // Quitar comillas simples o dobles envolventes si las tiene
  rawKey = rawKey.trim();
  if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
    rawKey = rawKey.slice(1, -1);
  }

  // Reemplazar saltos de línea escapados si vienen como string (\n)
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });

  return google.calendar({ version: 'v3', auth });
};

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com';

// A. CREAR EVENTO EN GOOGLE CALENDAR
export async function crearEventoGoogleCalendar(params: {
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss o HH:mm
  motivo?: string | null;
}): Promise<string | null> {
  try {
    lastCalendarError = null;
    const calendar = getCalendarClient();
    
    // Construir fechas ISO con zona horaria de Chile (-03:00)
    const horaLimpia = (params.hora || '09:00').slice(0, 5);
    const startDateTime = `${params.fecha}T${horaLimpia}:00-03:00`;
    
    // Duración de 45 minutos por defecto (cálculo aritmético robusto sin dependencia de la zona horaria del servidor Node)
    const [hStr, mStr] = horaLimpia.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const totalMinutes = h * 60 + m + 45;
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const endDateTime = `${params.fecha}T${endH}:${endM}:00-03:00`;

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `Cita: ${params.pacienteNombre}`,
        description: `Paciente: ${params.pacienteNombre}\nTeléfono: ${params.pacienteTelefono || 'Sin registro'}\nMotivo: ${params.motivo || 'Atención Kinésica TMO'}\nRegistrado desde Kiromov Core`,
        start: { dateTime: startDateTime, timeZone: 'America/Santiago' },
        end: { dateTime: endDateTime, timeZone: 'America/Santiago' },
      },
    });

    console.log('[Google Calendar] Evento creado con ID:', res.data.id);
    return res.data.id || null;
  } catch (error: any) {
    lastCalendarError = error?.message || error?.toString() || error;
    console.error('[Google Calendar API] Error creando evento:', error);
    return null; // Fallback defensivo: no bloquea el guardado en Supabase
  }
}

// B. ELIMINAR O CANCELAR EVENTO
export async function eliminarEventoGoogleCalendar(googleEventId: string): Promise<boolean> {
  try {
    if (!googleEventId) return false;
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
    console.log('[Google Calendar] Evento eliminado:', googleEventId);
    return true;
  } catch (error) {
    console.error('[Google Calendar API] Error eliminando evento:', error);
    return false;
  }
}
