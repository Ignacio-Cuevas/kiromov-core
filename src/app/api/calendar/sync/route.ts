import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGoogleCalendarClient } from '@/utils/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      throw new Error('No se pudo inicializar Supabase client');
    }

    const { calendar, calendarId } = getGoogleCalendarClient();

    // Rango: desde hace 7 días hasta los próximos 30 días
    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const gEventsRes = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const gEvents = gEventsRes.data.items || [];
    let importadas = 0;
    let exportadas = 0;

    // 1. IMPORTAR CITAS DE GOOGLE CALENDAR A SUPABASE
    for (const ge of gEvents) {
      if (!ge.start?.dateTime || ge.status === 'cancelled') continue;
      
      const gId = ge.id!;
      const fechaHora = new Date(ge.start.dateTime);
      const fechaStr = ge.start.dateTime.split('T')[0];
      const horaStr = ge.start.dateTime.split('T')[1].slice(0, 8);

      // Verificar si ya existe en Supabase
      const { data: existe } = await supabase
        .from('citas_atenciones')
        .select('id')
        .eq('google_event_id', gId)
        .maybeSingle();

      if (!existe) {
        // Extraer nombre del paciente del título
        const summary = ge.summary || '';
        let nombre = summary.replace(/^(Cita:|Kiromov\s*-\s*Chillán\s*\(?|Kiromov\s*-\s*)/i, '').replace(/\)$/, '').trim();
        if (!nombre || nombre.toLowerCase().includes('sin titulo')) continue; // Ignorar bloqueos falsos

        // Buscar o crear paciente
        let { data: pac } = await supabase
          .from('pacientes')
          .select('id')
          .ilike('nombre_completo', `%${nombre}%`)
          .maybeSingle();

        if (!pac) {
          const nextCode = `KIR-${Math.floor(10000 + Math.random() * 90000)}`;
          const { data: nuevoPac } = await supabase
            .from('pacientes')
            .insert([{ 
              nombre_completo: nombre, 
              estado: 'activo',
              codigo_paciente: nextCode 
            }])
            .select()
            .single();
          pac = nuevoPac;
        }

        if (pac) {
          await supabase.from('citas_atenciones').insert([{
            paciente_id: pac.id,
            fecha: fechaStr,
            hora: horaStr,
            estado: 'confirmada',
            motivo_consulta: 'Reserva Online Google Calendar',
            google_event_id: gId,
            profesional: 'Klgo. Ignacio Cuevas Silva',
            notas: 'Generada desde Google Calendar Sync'
          }]);
          importadas++;
        }
      }
    }

    // 2. EXPORTAR CITAS DE SUPABASE QUE NO ESTÉN EN GOOGLE
    const { data: citasSinGoogle } = await supabase
      .from('citas_atenciones')
      .select('*, pacientes(nombre_completo, telefono, prevision)')
      .is('google_event_id', null)
      .gte('fecha', timeMin.split('T')[0])
      .not('estado', 'in', '("cancelada","no_asistio")');

    if (citasSinGoogle) {
      for (const c of citasSinGoogle) {
        try {
          // Duración 45 min
          const horaLimpia = (c.hora || '09:00').slice(0, 5);
          const [hStr, mStr] = horaLimpia.split(':');
          const h = parseInt(hStr, 10) || 0;
          const m = parseInt(mStr, 10) || 0;
          const totalMinutes = h * 60 + m + 45;
          const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
          const endM = String(totalMinutes % 60).padStart(2, '0');

          const inserted = await calendar.events.insert({
            calendarId,
            requestBody: {
              summary: `Cita: ${c.pacientes?.nombre_completo || 'Paciente'}`,
              description: `Previsión: ${c.pacientes?.prevision || 'Particular'} · Tel: ${c.pacientes?.telefono || ''}`,
              start: { dateTime: `${c.fecha}T${horaLimpia}:00-03:00`, timeZone: 'America/Santiago' },
              end: { dateTime: `${c.fecha}T${endH}:${endM}:00-03:00`, timeZone: 'America/Santiago' },
            },
          });
          
          if (inserted.data.id) {
            await supabase
              .from('citas_atenciones')
              .update({ google_event_id: inserted.data.id })
              .eq('id', c.id);
            exportadas++;
          }
        } catch (e) {
          console.error('Error exportando cita ID:', c.id, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completa: ${importadas} citas importadas de Google, ${exportadas} citas enviadas a Google.`,
      importadas,
      exportadas,
    });
  } catch (error: any) {
    console.error('Error en /api/calendar/sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
