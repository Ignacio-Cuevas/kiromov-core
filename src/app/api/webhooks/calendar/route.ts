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

interface CalendarPayload {
  nombre_completo: string;
  email?: string;
  telefono?: string;
  fecha: string; // 'YYYY-MM-DD'
  hora: string;  // 'HH:mm:ss' o 'HH:mm'
  motivo_consulta?: string;
  google_event_id: string;
}

export async function POST(request: NextRequest) {
  // 1. Validación de Seguridad
  const authHeader = request.headers.get('x-api-key') || request.headers.get('authorization');
  const secretKey = process.env.CALENDAR_WEBHOOK_SECRET;

  if (!secretKey || authHeader !== secretKey) {
    return NextResponse.json({ error: 'No autorizado: Token de webhook inválido o ausente' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json() as CalendarPayload;
    const { nombre_completo, email, telefono, fecha, hora, motivo_consulta, google_event_id } = body;

    if (!nombre_completo || !fecha || !hora || !google_event_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const horaNormalizada = hora.length === 5 ? hora + ':00' : hora;

    // Normalización de Datos
    let cleanName = nombre_completo
      .replace(/^Cita Kiromov\s*[-–—:]\s*/i, '')
      .replace(/^Kiromov\s*[-–—:]\s*/i, '')
      .replace(/^Cita con\s*/i, '')
      .replace(/\([^)]*\)/g, '') // Remueve paréntesis
      .trim();

    let cleanTel: string | null = null;
    if (telefono) {
      const digits = telefono.replace(/\D/g, '');
      if (digits.length >= 9) {
        cleanTel = `+56${digits.slice(-9)}`;
      }
    }

    let cleanEmail: string | null = null;
    if (email) {
      cleanEmail = email.split(',')[0].trim().toLowerCase();
    }

    // Paso A (Buscar o Crear Paciente - Anti-Duplicados)
    let pacienteId: string | null = null;

    if (cleanEmail) {
      const { data: existente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (existente) pacienteId = existente.id;
    }

    if (!pacienteId && cleanTel) {
      const { data: existenteTel } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('telefono', `%${cleanTel.slice(-9)}%`)
        .maybeSingle();
      if (existenteTel) pacienteId = existenteTel.id;
    }

    if (!pacienteId && cleanName) {
      const { data: existenteNom } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('nombre_completo', `%${cleanName}%`)
        .maybeSingle();
      if (existenteNom) pacienteId = existenteNom.id;
    }

    // Si no existe, crear la ficha del paciente nuevo:
    if (!pacienteId) {
      const { data: nuevo, error: errNuevo } = await supabase
        .from('pacientes')
        .insert([{
          nombre_completo: cleanName,
          email: cleanEmail,
          telefono: cleanTel,
          motivo_consulta: motivo_consulta?.trim() || 'Reserva desde web kiromov.cl',
          estado: 'activo'
        }])
        .select('id')
        .single();

      if (errNuevo) throw errNuevo;
      pacienteId = nuevo.id;
    }

    // Paso B (Evitar Duplicados e Insertar Cita)
    const { data: citaExistente } = await supabase
      .from('citas_atenciones')
      .select('id')
      .eq('google_event_id', google_event_id)
      .maybeSingle();

    if (citaExistente) {
      return NextResponse.json({ message: 'Cita ya registrada previamente' }, { status: 200 });
    }

    // Insertar en la agenda:
    const { error: errCita } = await supabase
      .from('citas_atenciones')
      .insert([{
        paciente_id: pacienteId,
        fecha: fecha,
        hora: horaNormalizada,
        profesional: 'Klgo. Ignacio Cuevas Silva',
        motivo_consulta: motivo_consulta?.trim() || 'Evaluación Kinésica Inicial (Web)',
        estado: 'pendiente',
        google_event_id: google_event_id
      }]);

    if (errCita) throw errCita;

    // Respuesta
    return NextResponse.json({ success: true, paciente_id: pacienteId });
  } catch (error: any) {
    console.error('Error procesando webhook de calendar:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
