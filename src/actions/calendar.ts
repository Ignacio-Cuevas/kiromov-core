'use server';

import { 
  crearEventoGoogleCalendar as crearEventoGoogleCalendarUtil, 
  eliminarEventoGoogleCalendar as eliminarEventoGoogleCalendarUtil,
  modificarEventoGoogleCalendar as modificarEventoGoogleCalendarUtil
} from '@/utils/google-calendar';

export async function crearEventoGoogleCalendar(params: {
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  fecha: string;
  hora: string;
  motivo?: string | null;
}) {
  return await crearEventoGoogleCalendarUtil(params);
}

export async function eliminarEventoGoogleCalendar(googleEventId: string) {
  return await eliminarEventoGoogleCalendarUtil(googleEventId);
}

export async function modificarEventoGoogleCalendar(googleEventId: string, params: { fecha: string; hora: string; }) {
  return await modificarEventoGoogleCalendarUtil(googleEventId, params);
}

export async function syncEventToGoogleCalendar(payload: {
  action: 'create_event' | 'update_event' | 'cancel_event';
  cita_id: string; // Supabase ID
  google_event_id?: string;
  fecha?: string;
  hora?: string;
  paciente_nombre?: string;
  paciente_telefono?: string | null;
  motivo_consulta?: string;
}) {
  try {
    if (payload.action === 'create_event') {
      if (!payload.fecha || !payload.hora) {
        return { success: false, error: 'Falta fecha u hora para crear evento en Google Calendar' };
      }

      const eventId = await crearEventoGoogleCalendarUtil({
        pacienteNombre: payload.paciente_nombre || 'Paciente Kiromov',
        pacienteTelefono: payload.paciente_telefono,
        fecha: payload.fecha,
        hora: payload.hora,
        motivo: payload.motivo_consulta,
      });

      if (eventId) {
        return { success: true, google_event_id: eventId };
      }
      return { success: false, error: 'No se pudo generar el ID del evento en Google Calendar' };
    }

    if (payload.action === 'cancel_event') {
      if (!payload.google_event_id) {
        return { success: false, error: 'Falta google_event_id para cancelar evento' };
      }

      const eliminado = await eliminarEventoGoogleCalendarUtil(payload.google_event_id);
      return { success: eliminado };
    }

    if (payload.action === 'update_event') {
      if (payload.google_event_id && payload.fecha && payload.hora) {
        const modificado = await modificarEventoGoogleCalendarUtil(payload.google_event_id, {
          fecha: payload.fecha,
          hora: payload.hora
        });
        if (modificado) {
          return { success: true, google_event_id: payload.google_event_id };
        }
      } else if (payload.fecha && payload.hora) {
        // Si no tiene google_event_id, crearlo
        const nuevoEventId = await crearEventoGoogleCalendarUtil({
          pacienteNombre: payload.paciente_nombre || 'Paciente Kiromov',
          pacienteTelefono: payload.paciente_telefono,
          fecha: payload.fecha,
          hora: payload.hora,
          motivo: payload.motivo_consulta,
        });
        if (nuevoEventId) {
          return { success: true, google_event_id: nuevoEventId };
        }
      }
      return { success: true };
    }

    return { success: false, error: 'Acción no soportada' };
  } catch (error: any) {
    console.error('[SYNC CALENDAR] Error en syncEventToGoogleCalendar:', error);
    return { success: false, error: error.message };
  }
}
