import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { crearEventoGoogleCalendar } from '@/utils/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Cliente de base de datos no disponible' }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado: se requiere sesión activa' }, { status: 401 });
  }

  const hoyStr = new Date().toISOString().split('T')[0];

  // Buscar citas futuras sin sincronizar con Google Calendar
  const { data: citas, error } = await supabase
    .from('citas_atenciones')
    .select('id, fecha, hora, motivo_consulta, paciente_id, pacientes:paciente_id(nombre_completo, telefono)')
    .gte('fecha', hoyStr)
    .in('estado', ['pendiente', 'confirmada'])
    .is('google_event_id', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sincronizadas = 0;

  for (const cita of (citas || [])) {
    const rawPaciente = (cita as any).pacientes;
    let paciente = Array.isArray(rawPaciente) ? rawPaciente[0] : rawPaciente;

    if (!paciente && cita.paciente_id) {
      const { data: pacData } = await supabase
        .from('pacientes')
        .select('nombre_completo, telefono')
        .eq('id', cita.paciente_id)
        .maybeSingle();
      if (pacData) paciente = pacData;
    }

    if (!paciente) continue;

    const eventId = await crearEventoGoogleCalendar({
      pacienteNombre: paciente.nombre_completo,
      pacienteTelefono: paciente.telefono,
      fecha: cita.fecha,
      hora: cita.hora,
      motivo: cita.motivo_consulta
    });

    if (eventId) {
      await supabase
        .from('citas_atenciones')
        .update({ google_event_id: eventId })
        .eq('id', cita.id);
      sincronizadas++;
    }
  }

  return NextResponse.json({ success: true, totalSincronizadas: sincronizadas });
}
