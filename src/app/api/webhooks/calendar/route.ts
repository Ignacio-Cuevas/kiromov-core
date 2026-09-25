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
  action?: 'upsert' | 'cancel';
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  fecha?: string; // 'YYYY-MM-DD'
  hora?: string;  // 'HH:mm:ss' o 'HH:mm'
  motivo_consulta?: string;
  google_event_id: string;
}

import crypto from 'crypto';

export async function POST(request: NextRequest) {
  // 1. Validación de Seguridad Criptográfica
  const rawAuth = request.headers.get('x-api-key') || request.headers.get('authorization') || '';
  const authHeader = rawAuth.replace(/^Bearer\s+/i, '').trim();
  const secretKey = (process.env.CALENDAR_WEBHOOK_SECRET || '').trim();

  if (!secretKey) {
    return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 });
  }

  try {
    const hash = (str: string) => crypto.createHash('sha256').update(str).digest();
    const authHash = hash(authHeader);
    const secretHash = hash(secretKey);

    if (!crypto.timingSafeEqual(authHash, secretHash)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json() as CalendarPayload;
    const { action, nombre_completo, email, telefono, fecha, hora, motivo_consulta, google_event_id } = body;

    if (!google_event_id) {
      return NextResponse.json({ error: 'Falta google_event_id' }, { status: 400 });
    }

    if (action === 'cancel') {
      console.log('[WEBHOOK CALENDAR] Cancelando cita:', google_event_id);
      await supabase.from('citas_atenciones').update({ estado: 'cancelada' }).eq('google_event_id', google_event_id);
      return NextResponse.json({ success: true, action: 'cancelled' });
    }

    // Paso 0 (Corte de Bucle Anti-Fantasmas):
    // 0.1 Verificar duplicados por google_event_id con limit(1)
    const { data: citasPorGoogle } = await supabase
      .from('citas_atenciones')
      .select('id')
      .eq('google_event_id', google_event_id)
      .limit(1);

    if (citasPorGoogle && citasPorGoogle.length > 0) {
      return NextResponse.json({ message: 'Evento ya registrado previamente' }, { status: 200 });
    }

    if (!nombre_completo || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const horaNormalizada = hora.length === 5 ? hora + ':00' : hora;

    // 0.2 Verificar si la cita ya existe en la misma fecha y hora (evita doble inserción por webhook)
    const { data: citasEnHorario } = await supabase
      .from('citas_atenciones')
      .select('id, google_event_id')
      .eq('fecha', fecha)
      .eq('hora', horaNormalizada)
      .neq('estado', 'cancelada')
      .limit(1);

    if (citasEnHorario && citasEnHorario.length > 0) {
      if (!citasEnHorario[0].google_event_id) {
        await supabase
          .from('citas_atenciones')
          .update({ google_event_id })
          .eq('id', citasEnHorario[0].id);
      }
      return NextResponse.json({ message: 'Cita ya agendada en este bloque, vinculada exitosamente' }, { status: 200 });
    }

    // Normalización de Datos y Limpieza Estricta de Prefijos
    let cleanName = nombre_completo
      .replace(/^Cita:\s*/i, '')
      .replace(/^Sesión:\s*/i, '')
      .replace(/^Kinesiología:\s*/i, '')
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

    // Paso A (Buscar o Vincular Paciente - Blindaje Anti-Duplicados con limit(1))
    let pacienteId: string | null = null;

    if (cleanEmail) {
      const { data: existenteEmail } = await supabase
        .from('pacientes')
        .select('id')
        .eq('email', cleanEmail)
        .limit(1);
      if (existenteEmail && existenteEmail.length > 0) pacienteId = existenteEmail[0].id;
    }

    if (!pacienteId && cleanTel) {
      const { data: existenteTel } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('telefono', `%${cleanTel.slice(-9)}%`)
        .limit(1);
      if (existenteTel && existenteTel.length > 0) pacienteId = existenteTel[0].id;
    }

    if (!pacienteId && cleanName) {
      const { data: existenteNom } = await supabase
        .from('pacientes')
        .select('id')
        .ilike('nombre_completo', cleanName)
        .limit(1);
      if (existenteNom && existenteNom.length > 0) pacienteId = existenteNom[0].id;
    }

    // REGLA ESTRICTA ANTI-FANTASMAS:
    // NUNCA autogenerar pacientes vacíos en sincronizaciones/webhooks.
    // Si no existe coincidencia, pacienteId queda como null y los datos de contacto se preservan en motivo y notas de la cita.
    const motivoFinal = motivo_consulta?.trim()
      ? motivo_consulta.trim()
      : (cleanName ? `Atención Kinésica - ${cleanName}` : 'Evaluación Kinésica Inicial (Web)');

    const notasDetalle = !pacienteId && cleanName
      ? `Paciente externo (sin ficha): ${cleanName}${cleanTel ? ` • Tel: ${cleanTel}` : ''}${cleanEmail ? ` • Email: ${cleanEmail}` : ''}`
      : null;

    // Paso B (Insertar Cita en Agenda)
    const { error: errCita } = await supabase
      .from('citas_atenciones')
      .insert([{
        paciente_id: pacienteId,
        fecha: fecha,
        hora: horaNormalizada,
        profesional: 'Klgo. Ignacio Cuevas Silva',
        motivo_consulta: motivoFinal,
        notas: notasDetalle,
        estado: 'pendiente',
        google_event_id: google_event_id
      }]);

    if (errCita) {
      console.warn('[WEBHOOK CALENDAR] Error insertando cita:', errCita);
      // Retornar 200 con detalle para cortar el bucle de reintentos automáticos de Google
      return NextResponse.json({ success: false, error: errCita.message }, { status: 200 });
    }

    // Respuesta exitosa
    return NextResponse.json({ success: true, paciente_id: pacienteId, unlinked: !pacienteId });
  } catch (error: any) {
    console.error('Error procesando webhook de calendar:', error);
    // Retornar 200 para evitar bucle de reintentos infinitos
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 200 });
  }
}
