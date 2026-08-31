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
    const { nombre_completo, email, telefono, fecha, hora, motivo, google_event_id } = body;

    if (!nombre_completo || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!supabase) {
      // Mock response for offline/local development without active Supabase credentials
      return NextResponse.json({
        success: true,
        message: 'Mock webhook sync (Supabase offline/unconfigured)',
        cita: {
          id: 'cita-mock-' + Date.now(),
          paciente_id: 'paciente-mock',
          fecha,
          hora: hora.length === 5 ? hora + ':00' : hora,
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'Pendiente',
          motivo_consulta: motivo || 'Agendamiento Online (kiromov.cl)',
          google_event_id: google_event_id || null,
        },
      });
    }

    // 1. Buscar si el paciente ya existe por email o teléfono
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
      const cleanPhone = telefono.replace(/\D/g, '');
      const { data: pTel } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('telefono', `%${cleanPhone}%`)
        .maybeSingle();
      if (pTel) pacienteId = pTel.id;
    }

    // 2. Si no existe, crear el nuevo paciente automáticamente
    if (!pacienteId) {
      const { data: newPatient, error: pErr } = await supabase
        .from('pacientes')
        .insert({
          nombre_completo: nombre_completo.toUpperCase().trim(),
          email: email?.trim().toLowerCase() || null,
          telefono: telefono?.trim() || null,
        })
        .select('id')
        .single();

      if (pErr) throw pErr;
      pacienteId = newPatient.id;
    }

    // 3. Insertar o actualizar la cita vinculada al google_event_id
    const upsertPayload: Record<string, any> = {
      paciente_id: pacienteId,
      fecha,
      hora: hora.length === 5 ? hora + ':00' : hora,
      profesional: 'Klgo. Ignacio Cuevas Silva',
      estado: 'Pendiente',
      motivo_consulta: motivo || 'Agendamiento Online (kiromov.cl)',
      google_event_id: google_event_id || null,
    };

    const { data: cita, error: cErr } = await supabase
      .from('citas_atenciones')
      .upsert(
        upsertPayload,
        google_event_id ? { onConflict: 'google_event_id' } : undefined
      )
      .select()
      .single();

    if (cErr) throw cErr;

    return NextResponse.json({ success: true, cita });
  } catch (error: any) {
    console.error('Error sincronizando cita de Google Calendar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
