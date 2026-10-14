import { google } from 'googleapis';

let lastCalendarError: any = null;

export function getLastCalendarError() {
  return lastCalendarError;
}

export const getGoogleCalendarClient = () => {
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

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com';

  return { calendar: google.calendar({ version: 'v3', auth }), calendarId };
};

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'ignacio.kiromov@gmail.com';

// 1. EXTRACCIÓN ROBUSTA DE DATOS DEL EVENTO DE GOOGLE
export function extraerDatosPacienteDeGoogleEvent(gEvent: any) {
  let nombre = '';
  let email = '';
  let telefono = '';
  let motivo = 'Reserva Online Google Calendar';

  // 1. Extraer nombre desde los asistentes (attendees) o paréntesis del título
  const attendee = gEvent.attendees?.find((a: any) => !a.self);
  if (attendee?.displayName) {
    nombre = attendee.displayName.trim();
  }
  if (attendee?.email) {
    email = attendee.email.trim();
  }

  // Si no vino en attendees, extraer del título: "Kiromov - Chillán (Nombre Apellido)"
  if (!nombre && gEvent.summary) {
    const matchParentesis = gEvent.summary.match(/\(([^)]+)\)$/);
    if (matchParentesis && matchParentesis[1]) {
      const candidato = matchParentesis[1].trim();
      if (!candidato.toLowerCase().includes('motivo') && !candidato.toLowerCase().includes('consulta')) {
        nombre = candidato;
      }
    }
  }

  // 2. Extraer teléfono, email y motivo desde la descripción del formulario de Google
  const descripcion = gEvent.description || '';
  const lineas = descripcion.split('\n');

  for (const linea of lineas) {
    const l = linea.trim();
    
    // Si no teníamos nombre aún: "Reservado por: Juan Pérez" o "Nombre: Juan Pérez"
    if ((!nombre || nombre.toLowerCase().includes('motivo') || nombre.toLowerCase().includes('consulta')) &&
        (l.toLowerCase().startsWith('reservado por:') || l.toLowerCase().startsWith('nombre:') || l.toLowerCase().startsWith('paciente:'))) {
      nombre = l.split(':')[1]?.trim() || '';
    }

    // Teléfono: "Número de teléfono: +569..." o "Teléfono: ..."
    if (!telefono && (l.toLowerCase().includes('teléfono') || l.toLowerCase().includes('phone') || l.toLowerCase().includes('whatsapp'))) {
      const matchTel = l.match(/(\+?56\s?9\s?\d{4}\s?\d{4}|\d{8,9})/);
      if (matchTel) {
        telefono = matchTel[0].replace(/\s+/g, '');
      } else {
        telefono = l.split(':')[1]?.trim() || '';
      }
    }

    // Email
    if (!email && l.toLowerCase().includes('@')) {
      const matchEmail = l.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (matchEmail) {
        email = matchEmail[0].trim();
      }
    }

    // Motivo de Consulta
    if (l.toLowerCase().includes('motivo') || l.toLowerCase().includes('molestia') || l.toLowerCase().includes('dolor')) {
      const textoMotivo = l.split(':')[1]?.trim();
      if (textoMotivo && textoMotivo.length > 2) {
        motivo = textoMotivo;
      }
    }
  }

  // Si el motivo aún es genérico y el título tenía paréntesis con etiqueta de motivo
  if (motivo === 'Reserva Online Google Calendar' && gEvent.summary) {
    const matchParentesis = gEvent.summary.match(/\(([^)]+)\)$/);
    if (matchParentesis && matchParentesis[1]) {
      const candidato = matchParentesis[1].trim();
      if (candidato.toLowerCase().includes('motivo') || candidato.toLowerCase().includes('dolor') || candidato.toLowerCase().includes('molestia')) {
        motivo = candidato.replace(/^motivo(\s*de\s*consulta)?\s*[:\/-]?\s*/i, '').trim() || motivo;
      }
    }
  }

  // 3. REGLA ESTRICTA DE SEGURIDAD:
  // Si el nombre contiene palabras de etiquetas ("motivo", "consulta", "sin titulo"), descartarlo
  if (
    !nombre ||
    nombre.toLowerCase().includes('motivo de consulta') ||
    nombre.toLowerCase().includes('motivo') ||
    nombre.toLowerCase().includes('consulta') ||
    nombre.toLowerCase().includes('sin titulo') ||
    nombre.toLowerCase().includes('kiromov - chillán')
  ) {
    // Fallback: usar el email si no hay nombre
    nombre = email ? email.split('@')[0] : 'Paciente Reserva Web';
  }

  return { nombre, email, telefono, motivo };
}

// A. CREAR EVENTO EN GOOGLE CALENDAR
export async function crearEventoGoogleCalendar(params: {
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  pacientePrevision?: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss o HH:mm
  motivo?: string | null;
}): Promise<string | null> {
  try {
    lastCalendarError = null;
    const { calendar } = getGoogleCalendarClient();
    
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
      calendarId: CALENDAR_ID,
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
    const { calendar } = getGoogleCalendarClient();
    
    const horaLimpia = (params.hora || '09:00').slice(0, 5);
    const startDateTime = `${params.fecha}T${horaLimpia}:00-03:00`;
    
    const [hStr, mStr] = horaLimpia.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const totalMinutes = h * 60 + m + 45;
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const endDateTime = `${params.fecha}T${endH}:${endM}:00-03:00`;

    const patchBody: any = {
      start: { dateTime: startDateTime, timeZone: 'America/Santiago' },
      end: { dateTime: endDateTime, timeZone: 'America/Santiago' },
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
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      requestBody: patchBody,
    });

    return true;
  } catch (error) {
    console.error('[Google Calendar API] Error modificando evento:', error);
    return false;
  }
}
