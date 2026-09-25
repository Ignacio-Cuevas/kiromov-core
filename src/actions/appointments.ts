'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markAppointmentAttended(citaId: string, pacienteId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'No database client' };

  try {
    // 1. Marcar la cita como asistio
    const { error: citaError } = await supabase
      .from('citas_atenciones')
      .update({ estado: 'asistio' })
      .eq('id', citaId);

    if (citaError) {
      console.error('Error al actualizar la cita:', citaError);
      return { success: false, error: 'No se pudo actualizar el estado de la cita' };
    }

    // 2. Buscar si hay plan activo
    const { data: planes, error: planesError } = await supabase
      .from('compras_planes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha_compra', { ascending: false });

    if (planesError) {
      console.error('Error al buscar planes del paciente:', planesError);
      // No devolvemos error hard porque la cita ya se marcó
      return { success: true, message: 'Asistencia registrada, pero hubo error buscando planes.' };
    }

    // Buscar plan que tenga saldo (sesiones_usadas < total_sesiones)
    const planActivo = planes?.find(p => (p.sesiones_usadas || 0) < (p.total_sesiones || 1));

    if (planActivo) {
      const nuevasUsadas = (planActivo.sesiones_usadas || 0) + 1;
      const { error: updatePlanError } = await supabase
        .from('compras_planes')
        .update({ sesiones_usadas: nuevasUsadas })
        .eq('id', planActivo.id);
      
      if (updatePlanError) {
        console.error('Error descontando sesión del plan:', updatePlanError);
        return { success: true, message: 'Asistencia registrada, pero no se pudo descontar la sesión.' };
      }

      const planCompleted = nuevasUsadas >= (planActivo.total_sesiones || 1);

      revalidatePath('/agenda');
      revalidatePath('/pacientes');
      return { success: true, discountedPlan: true, planCompleted, message: 'Asistencia registrada. 1 sesión descontada del plan.' };
    }

    revalidatePath('/agenda');
    revalidatePath('/pacientes');
    return { success: true, discountedPlan: false, message: 'Asistencia registrada (Sin plan activo con saldo).' };
  } catch (error: any) {
    console.error('Error inesperado en markAppointmentAttended:', error);
    return { success: false, error: 'Error inesperado al registrar la asistencia.' };
  }
}

export async function markAppointmentNoShow(citaId: string, pacienteId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'No database client' };

  try {
    // 1. Marcar la cita como no_asistio
    const { error: citaError } = await supabase
      .from('citas_atenciones')
      .update({ estado: 'no_asistio' })
      .eq('id', citaId);

    if (citaError) {
      console.error('Error al actualizar la cita:', citaError);
      return { success: false, error: 'No se pudo actualizar el estado de la cita' };
    }

    // 2. Buscar si hay plan activo
    const { data: planes, error: planesError } = await supabase
      .from('compras_planes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha_compra', { ascending: false });

    if (planesError) {
      console.error('Error al buscar planes del paciente:', planesError);
      return { success: true, message: 'Inasistencia registrada, pero hubo error buscando planes.' };
    }

    // Buscar plan que tenga saldo
    const planActivo = planes?.find(p => (p.sesiones_usadas || 0) < (p.total_sesiones || 1));

    if (planActivo) {
      // 3. Descontar 1 sesión
      const { error: updatePlanError } = await supabase
        .from('compras_planes')
        .update({ sesiones_usadas: (planActivo.sesiones_usadas || 0) + 1 })
        .eq('id', planActivo.id);
      
      if (updatePlanError) {
        console.error('Error descontando sesión del plan:', updatePlanError);
        return { success: true, message: 'Inasistencia registrada, pero no se pudo descontar la sesión.' };
      }

      revalidatePath('/agenda');
      revalidatePath('/pacientes');
      return { success: true, discountedPlan: true, message: 'Inasistencia registrada. 1 sesión descontada del plan según política clínica.' };
    }

    revalidatePath('/agenda');
    revalidatePath('/pacientes');
    return { success: true, discountedPlan: false, message: 'Inasistencia registrada (Sin plan activo para descontar).' };
  } catch (error: any) {
    console.error('Error inesperado en markAppointmentNoShow:', error);
    return { success: false, error: 'Error inesperado al registrar la inasistencia.' };
  }
}

// ====================================================================
// SERVER ACTION: AGENDAMIENTO RÁPIDO CON ALTA "AL VUELO" (ATÓMICO)
// ====================================================================
import { scheduleAppointmentSchema, ScheduleAppointmentFormValues, ScheduleAppointmentResult } from '@/types/schedule';
import { formatRut } from '@/lib/utils';
import { crearEventoGoogleCalendar } from '@/actions/calendar';

export async function createScheduleAppointmentAction(
  values: ScheduleAppointmentFormValues
): Promise<ScheduleAppointmentResult> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'No se pudo inicializar la base de datos' };

  // 1. Validar esquema con Zod
  const validation = scheduleAppointmentSchema.safeParse(values);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return { success: false, error: firstIssue?.message || 'Datos del agendamiento inválidos' };
  }

  const data = validation.data;

  try {
    // 2. Verificar colisión horaria
    const horaNormalizada = data.hora.length === 5 ? `${data.hora}:00` : data.hora;
    const { data: conflictoCita, error: errCheck } = await supabase
      .from('citas_atenciones')
      .select('id, hora, pacientes(nombre_completo)')
      .eq('fecha', data.fecha)
      .eq('hora', horaNormalizada)
      .neq('estado', 'cancelada')
      .maybeSingle();

    if (errCheck) {
      console.warn('Advertencia comprobando conflicto de citas:', errCheck.message);
    }

    if (conflictoCita) {
      return {
        success: false,
        error: `El bloque de las ${data.hora.slice(0, 5)} ya se encuentra reservado en esa fecha. Por favor selecciona otro horario.`,
      };
    }

    let targetPacienteId = '';
    let pacienteNombre = '';
    let pacienteTelefono: string | null = null;
    let newlyCreatedPatientId: string | null = null;

    // 3. Crear paciente si es "Quick Create" (Alta rápida)
    if (data.isNewPatient) {
      const cleanName = (data.nombre_completo || '').trim();
      const cleanRut = data.sin_rut ? null : formatRut(data.rut || '');

      let rawPhone = (data.telefono || '').replace(/[^\d+]/g, '');
      if (!rawPhone.startsWith('+')) {
        const digits = rawPhone.replace(/\D/g, '');
        if (digits.length === 9) {
          rawPhone = `+56${digits}`;
        } else if (digits.length === 11 && digits.startsWith('56')) {
          rawPhone = `+${digits}`;
        } else {
          rawPhone = `+56${digits}`;
        }
      }

      const nextCode = `KIR-${Math.floor(10000 + Math.random() * 90000)}`;

      const { data: nuevoPaciente, error: errInsertPaciente } = await supabase
        .from('pacientes')
        .insert([{
          codigo_paciente: nextCode,
          nombre_completo: cleanName,
          rut: cleanRut,
          telefono: rawPhone,
          email: data.email?.trim().toLowerCase() || null,
          motivo_consulta: data.motivo_consulta || 'Evaluación Inicial TMO (60 min)',
          estado: 'activo',
        }])
        .select('id, nombre_completo, telefono')
        .single();

      if (errInsertPaciente || !nuevoPaciente) {
        return {
          success: false,
          error: `Error al crear nuevo paciente: ${errInsertPaciente?.message || 'Error desconocido'}`,
        };
      }

      targetPacienteId = nuevoPaciente.id;
      newlyCreatedPatientId = nuevoPaciente.id;
      pacienteNombre = nuevoPaciente.nombre_completo;
      pacienteTelefono = nuevoPaciente.telefono;
    } else {
      targetPacienteId = data.pacienteId || '';

      const { data: pExistente } = await supabase
        .from('pacientes')
        .select('id, nombre_completo, telefono')
        .eq('id', targetPacienteId)
        .maybeSingle();

      if (pExistente) {
        pacienteNombre = pExistente.nombre_completo;
        pacienteTelefono = pExistente.telefono;
      }
    }

    // 4. Insertar cita en citas_atenciones
    const { data: nuevaCita, error: errCita } = await supabase
      .from('citas_atenciones')
      .insert([{
        paciente_id: targetPacienteId,
        fecha: data.fecha,
        hora: horaNormalizada,
        profesional: data.profesional || 'Klgo. Ignacio Cuevas Silva',
        motivo_consulta: data.motivo_consulta,
        notas: `Box: ${data.box || 'Bulnes 470, Of. 75'}`,
        estado: 'pendiente',
      }])
      .select('id')
      .single();

    if (errCita || !nuevaCita) {
      // Revertir creación de paciente en caso de fallo para no dejar registros huérfanos
      if (newlyCreatedPatientId) {
        await supabase.from('pacientes').delete().eq('id', newlyCreatedPatientId);
      }
      return {
        success: false,
        error: `Error al registrar la cita: ${errCita?.message || 'No se pudo crear la cita'}`,
      };
    }

    // 5. Sincronización asíncrona hacia Google Calendar (No-PII en producción)
    try {
      const googleEventId = await crearEventoGoogleCalendar({
        pacienteNombre: pacienteNombre || 'Paciente Kiromov',
        pacienteTelefono: pacienteTelefono,
        fecha: data.fecha,
        hora: data.hora.slice(0, 5),
        motivo: `${data.motivo_consulta} [${data.box || 'Bulnes 470'}]`,
      });

      if (googleEventId) {
        await supabase
          .from('citas_atenciones')
          .update({ google_event_id: googleEventId })
          .eq('id', nuevaCita.id);
      }
    } catch (calErr) {
      // Política No-PII: Solo identificadores técnicos en logs
      console.warn('[Calendar Sync] Advertencia sincronizando cita ID:', nuevaCita.id);
    }

    revalidatePath('/agenda');
    revalidatePath('/pacientes');
    revalidatePath('/');

    return {
      success: true,
      citaId: nuevaCita.id,
      pacienteId: targetPacienteId,
    };
  } catch (error: any) {
    console.error('Error procesando agendamiento rápido:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Error inesperado al procesar el agendamiento.',
    };
  }
}
