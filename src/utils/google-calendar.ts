import { google } from 'googleapis';

let lastCalendarError: any = null;

export function getLastCalendarError() {
  return lastCalendarError;
}

export const getGoogleCalendarClient = (calendarIdOverride?: string) => {
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

  const calendarId = calendarIdOverride || process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com';

  return { calendar: google.calendar({ version: 'v3', auth }), calendarId };
};

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com';

// 1. EXTRACCIÓN INFALIBLE DE DATOS DEL EVENTO DE GOOGLE (ATTENDEES FIRST)
export function obtenerDatosReservaGoogle(gEvent: any) {
  let nombre = '';
  let email = '';
  let telefono = '';
  let motivo = 'Reserva Online Google Calendar';

  // 1. PRIORIDAD ABSOLUTA: Extraer del objeto attendees de Google (El que reserva)
  const asistente = gEvent.attendees?.find((a: any) => !a.self);
  if (asistente) {
    if (asistente.displayName && asistente.displayName.trim().length > 0) {
      nombre = asistente.displayName.trim();
    }
    if (asistente.email && asistente.email.includes('@')) {
      email = asistente.email.trim();
    }
  }

  // 2. Si no vino en attendees, extraer de los paréntesis del título: "Kiromov - Chillán (Nombre Apellido)"
  if (!nombre && gEvent.summary) {
    const matchParentesis = gEvent.summary.match(/\(([^)]+)\)$/);
    if (matchParentesis && matchParentesis[1]) {
      const posibleNombre = matchParentesis[1].trim();
      if (!posibleNombre.toLowerCase().includes('motivo') && !posibleNombre.toLowerCase().includes('kiromov')) {
        nombre = posibleNombre;
      }
    }
  }

  // 3. Extraer teléfono y motivo desde la descripción del evento
  const descripcion = gEvent.description || '';
  const lineas = descripcion.split('\n');

  for (const l of lineas) {
    const linea = l.trim();
    
    // Teléfono
    if (!telefono && (linea.toLowerCase().includes('teléfono') || linea.toLowerCase().includes('phone') || linea.toLowerCase().includes('whatsapp'))) {
      const match = linea.match(/(\+?56\s?9\s?\d{4}\s?\d{4}|\d{8,9})/);
      if (match) telefono = match[0].replace(/\s+/g, '');
    }

    // Motivo de Consulta real (guardarlo en MOTIVO, NUNCA en el nombre)
    if (linea.toLowerCase().includes('motivo') || linea.toLowerCase().includes('molestia') || linea.toLowerCase().includes('dolor')) {
      const partes = linea.split(':');
      if (partes.length > 1 && partes[1].trim().length > 1) {
        motivo = partes.slice(1).join(':').trim();
      }
    }
  }

  // 4. FILTRO DE SEGURIDAD ABSOLUTO:
  // Si por cualquier motivo el nombre contiene "motivo", "consulta" o "chillán", DESCARTARLO
  if (
    !nombre ||
    nombre.toLowerCase().includes('motivo de consulta') ||
    nombre.toLowerCase().includes('kiromov - chillán') ||
    nombre.toLowerCase().includes('sin titulo')
  ) {
    // Si tenemos email, usar la parte antes del @ como nombre temporal
    nombre = email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Paciente Reserva Web';
  }

  return { nombre, email, telefono, motivo };
}

export function extraerDatosPacienteDeGoogleEvent(gEvent: any) {
  return obtenerDatosReservaGoogle(gEvent);
}

// A. CREAR EVENTO EN GOOGLE CALENDAR
export async function crearEventoGoogleCalendar(params: {
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  pacientePrevision?: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss o HH:mm
  motivo?: string | null;
  calendarId?: string;
}): Promise<string | null> {
  try {
    lastCalendarError = null;
    const { calendar, calendarId } = getGoogleCalendarClient(params.calendarId);
    
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

    const isBloqueo = params.pacienteNombre.includes('BLOQUEO');
    const nombreLimpio = params.pacienteNombre.replace(/^(Cita:\s*|Kiromov\s*-\s*)/i, '').trim();

    const summary = isBloqueo
      ? params.pacienteNombre
      : `${nombreLimpio} · Kinesiología TMO`;

    const description = isBloqueo
      ? (params.motivo || 'Bloqueo de horario clínico')
      : `Paciente: ${nombreLimpio}\nTeléfono: ${params.pacienteTelefono || 'Sin teléfono'}\nPrevisión: ${params.pacientePrevision || 'Particular'}\nMotivo: ${params.motivo || 'Atención Kinésica TMO'}`;

    const res = await calendar.events.insert({
      calendarId: calendarId || CALENDAR_ID,
      requestBody: {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'America/Santiago' },
        end: { dateTime: endDateTime, timeZone: 'America/Santiago' },
      },
    });

    // Event created successfully
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
    const { calendar } = getGoogleCalendarClient();
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
    // Event deleted successfully
    return true;
  } catch (error) {
    console.error('[Google Calendar API] Error eliminando evento:', error);
    return false;
  }
}

// C. MODIFICAR EVENTO
export async function modificarEventoGoogleCalendar(googleEventId: string, params: {
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss o HH:mm
  pacienteNombre?: string;
  pacienteTelefono?: string | null;
  pacientePrevision?: string | null;
  motivo?: string | null;
}): Promise<boolean> {
  try {
    if (!googleEventId) return false;
    const { calendar, calendarId } = getGoogleCalendarClient();
    
    const horaLimpia = (params.hora || '09:00').slice(0, 5);
    const [hStr, mStr] = horaLimpia.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const duracionMin = (params.motivo || '').toLowerCase().includes('60 min') ? 60 : 45;
    const totalMinutes = h * 60 + m + duracionMin;
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const nuevaHoraFin = `${endH}:${endM}`;

    const patchBody: any = {
      start: { dateTime: `${params.fecha}T${horaLimpia}:00`, timeZone: 'America/Santiago' },
      end: { dateTime: `${params.fecha}T${nuevaHoraFin}:00`, timeZone: 'America/Santiago' },
    };

    if (params.pacienteNombre) {
      const isBloqueo = params.pacienteNombre.includes('BLOQUEO');
      const nombreLimpio = params.pacienteNombre.replace(/^(Cita:\s*|Kiromov\s*-\s*)/i, '').trim();
      patchBody.summary = isBloqueo
        ? params.pacienteNombre
        : `${nombreLimpio} · Kinesiología TMO`;
      patchBody.description = isBloqueo
        ? (params.motivo || 'Bloqueo de horario clínico')
        : `Paciente: ${nombreLimpio}\nTeléfono: ${params.pacienteTelefono || 'Sin teléfono'}\nPrevisión: ${params.pacientePrevision || 'Particular'}\nMotivo: ${params.motivo || 'Atención Kinésica TMO'}`;
    }

    await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: patchBody,
    });

    return true;
  } catch (error) {
    console.error('[Google Calendar API] Error modificando evento:', error);
    return false;
  }
}
