'use server';

import { crearEventoGoogleCalendar, eliminarEventoGoogleCalendar } from '@/utils/google-calendar';

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

      const eventId = await crearEventoGoogleCalendar({
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

      const eliminado = await eliminarEventoGoogleCalendar(payload.google_event_id);
      return { success: eliminado };
    }

    if (payload.action === 'update_event') {
      if (payload.google_event_id) {
        await eliminarEventoGoogleCalendar(payload.google_event_id);
      }
      if (payload.fecha && payload.hora) {
        const nuevoEventId = await crearEventoGoogleCalendar({
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
