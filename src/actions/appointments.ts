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
