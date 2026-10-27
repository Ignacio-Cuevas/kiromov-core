import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGoogleCalendarClient } from '@/utils/google-calendar';
import { formatRut } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Error de conexión con la base de datos' }, { status: 500 });
    }

    const body = await req.json();
    const { nombre, rut, telefono, email, prevision, motivo, fecha, hora } = body;
    const sede = body.sede || 'chillan';
    const profesionalNombre = sede === 'concepcion' ? 'Klgo. Michael Pinto M.' : 'Klgo. Ignacio Cuevas Silva';
    const profesionalEmail = sede === 'concepcion' ? 'michael@kiromov.cl' : 'ignacio@kiromov.cl';

    if (!nombre || !telefono || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const cleanRut = rut ? formatRut(rut) : null;
    let cleanTel = String(telefono).replace(/[^\d+]/g, '');
    if (!cleanTel.startsWith('+')) {
      const digits = cleanTel.replace(/\D/g, '');
      if (digits.length === 8) {
        cleanTel = `+569${digits}`;
      } else if (digits.length === 9) {
        cleanTel = `+56${digits}`;
      } else if (digits.length > 9 && digits.startsWith('56')) {
        cleanTel = `+${digits}`;
      } else {
        cleanTel = `+56${digits}`;
      }
    }

    // 1. Buscar o Crear Paciente en public.pacientes
    let pacienteId: string;
    let pacExistente = null;

    if (cleanRut) {
      const { data: pRut } = await supabase
        .from('pacientes')
        .select('id, nombre_completo')
        .eq('rut', cleanRut)
        .maybeSingle();
      if (pRut) pacExistente = pRut;
    }

    if (!pacExistente && email) {
      const { data: pEmail } = await supabase
        .from('pacientes')
        .select('id, nombre_completo')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (pEmail) pacExistente = pEmail;
    }

    if (!pacExistente) {
      const { data: pNom } = await supabase
        .from('pacientes')
        .select('id, nombre_completo')
        .ilike('nombre_completo', `%${nombre.trim()}%`)
        .maybeSingle();
      if (pNom) pacExistente = pNom;
    }

    if (pacExistente) {
      pacienteId = pacExistente.id;
      // Actualizar teléfono y previsión si cambiaron
      await supabase
        .from('pacientes')
        .update({
          telefono: cleanTel,
          ...(email ? { email: email.trim().toLowerCase() } : {}),
          ...(prevision ? { prevision } : {}),
        })
        .eq('id', pacienteId);
    } else {
      const nextCode = `KIR-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: nuevoPac, error: errPac } = await supabase
        .from('pacientes')
        .insert([{
          codigo_paciente: nextCode,
          nombre_completo: nombre.trim(),
          rut: cleanRut,
          telefono: cleanTel,
          email: email?.trim().toLowerCase() || null,
          prevision: prevision || 'Particular',
          motivo_consulta: motivo || 'Evaluación Inicial TMO (60 min)',
          estado: 'activo',
          sede: sede,
        }])
        .select()
        .single();

      if (errPac || !nuevoPac) {
        throw new Error(errPac?.message || 'Error al registrar paciente');
      }
      pacienteId = nuevoPac.id;
    }

    // 2. Insertar Cita en public.citas_atenciones
    const horaLimpia = hora.slice(0, 5);
    const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;

    const { data: nuevaCita, error: errCita } = await supabase
      .from('citas_atenciones')
      .insert([{
        paciente_id: pacienteId,
        fecha,
        hora: horaNormalizada,
        estado: 'confirmada',
        motivo_consulta: motivo || 'Evaluación Inicial TMO (60 min)',
        profesional: profesionalNombre,
        profesional_email: profesionalEmail,
        sede: sede,
        notas: `Reserva Online Portal Nativo (/agendar) - Sede ${sede === 'concepcion' ? 'Concepción' : 'Chillán'}`,
      }])
      .select()
      .single();

    if (errCita) {
      // Capturar colisión de hora (Unique Index)
      if (errCita.code === '23505') {
        return NextResponse.json(
          { error: 'El horario seleccionado acaba de ser ocupado. Por favor elige otro horario.' },
          { status: 409 }
        );
      }
      throw errCita;
    }

    // 3. Enviar copia a Google Calendar en segundo plano (Espejo pasivo)
    try {
      const { calendar, calendarId } = getGoogleCalendarClient();
      
      const [hStr, mStr] = horaLimpia.split(':');
      const h = parseInt(hStr, 10) || 0;
      const m = parseInt(mStr, 10) || 0;
      const duracionMin = (motivo || '').toLowerCase().includes('60 min') ? 60 : 45;
      const totalMinutes = h * 60 + m + duracionMin;
      const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
      const endM = String(totalMinutes % 60).padStart(2, '0');
      const horaFin = `${endH}:${endM}`;

      const gEvent = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: `${nombre.trim()} · Kinesiología TMO`,
          description: `Previsión: ${prevision || 'Particular'}\nTeléfono: ${cleanTel}\nRUT: ${cleanRut || 'Sin RUT'}\nMotivo: ${motivo || 'Evaluación TMO'}`,
          start: { dateTime: `${fecha}T${horaLimpia}:00`, timeZone: 'America/Santiago' },
          end: { dateTime: `${fecha}T${horaFin}:00`, timeZone: 'America/Santiago' },
        },
      });

      if (gEvent.data.id) {
        await supabase
          .from('citas_atenciones')
          .update({ google_event_id: gEvent.data.id })
          .eq('id', nuevaCita.id);
      }
    } catch (gErr) {
      console.warn('No se pudo enviar copia a Google Calendar (la cita quedó guardada en la app):', gErr);
    }

    return NextResponse.json({ success: true, cita_id: nuevaCita.id });
  } catch (err: any) {
    console.error('Error al agendar online:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
