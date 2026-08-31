import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { nombre_completo, email, telefono, fecha, hora, motivo, google_event_id } = body;

    if (!nombre_completo || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    // Limpiar nombre
    const cleanName = nombre_completo.replace(/CITA\s+KIROMOV\s*/gi, '').trim().toUpperCase();
    const horaNormalizada = hora.length === 5 ? hora + ':00' : hora;

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Mock webhook sync (Supabase offline/unconfigured)',
        cita: {
          id: 'cita-mock-' + Date.now(),
          paciente_id: 'paciente-mock',
          fecha,
          hora: horaNormalizada,
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'Pendiente',
          motivo_consulta: motivo || 'Agendamiento Online (kiromov.cl)',
          google_event_id: google_event_id || null,
        },
      });
    }

    // 1. Buscar si el paciente ya existe (por Email, Teléfono o Nombre Completo)
    let pacienteId: string | null = null;

    if (email) {
      const { data: pEmail } = await supabase
        .from('pacientes')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (pEmail) pacienteId = pEmail.id;
    }

    if (!pacienteId && telefono) {
      const cleanPhone = telefono.replace(/\D/g, '').slice(-8); // últimos 8 dígitos
      const { data: pTel } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('telefono', `%${cleanPhone}%`)
        .maybeSingle();
      if (pTel) pacienteId = pTel.id;
    }

    if (!pacienteId) {
      const { data: pName } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('nombre_completo', `%${cleanName}%`)
        .maybeSingle();
      if (pName) pacienteId = pName.id;
    }

    // 2. Si no existe, crearlo
    if (!pacienteId) {
      const { data: newPatient, error: pErr } = await supabase
        .from('pacientes')
        .insert({
          nombre_completo: cleanName,
          email: email?.trim().toLowerCase() || null,
          telefono: telefono?.trim() || null,
        })
        .select('id')
        .single();
      if (pErr) throw pErr;
      pacienteId = newPatient.id;
    }

    // 3. Evitar duplicar cita si ya existe para ese paciente en esa fecha y hora
    const { data: existingCita } = await supabase
      .from('citas_atenciones')
      .select('id')
      .eq('paciente_id', pacienteId)
      .eq('fecha', fecha)
      .eq('hora', horaNormalizada)
      .maybeSingle();

    if (existingCita) {
      await supabase
        .from('citas_atenciones')
        .update({ google_event_id: google_event_id || null, motivo_consulta: motivo })
        .eq('id', existingCita.id);
      return NextResponse.json({ success: true, message: 'Cita vinculada y actualizada' });
    }

    // Si no existe, insertar nueva cita
    const { data: nuevaCita, error: cErr } = await supabase
      .from('citas_atenciones')
      .insert({
        paciente_id: pacienteId,
        fecha,
        hora: horaNormalizada,
        profesional: 'Klgo. Ignacio Cuevas Silva',
        estado: 'Pendiente',
        motivo_consulta: motivo,
        google_event_id: google_event_id || null,
      })
      .select()
      .single();

    if (cErr) throw cErr;
    return NextResponse.json({ success: true, cita: nuevaCita });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
