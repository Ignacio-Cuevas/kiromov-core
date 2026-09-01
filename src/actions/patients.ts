'use server';

import { createClient } from '@/utils/supabase/server';
import { Patient } from '@/types/clinical';
import { validateRut, formatRut } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { initialMockPacientes } from '@/lib/mock-data';

export async function getPatients(searchQuery?: string): Promise<Patient[]> {
  const supabase = await createClient();

  if (supabase) {
    try {
      // 1. Obtener citas_atenciones asistidas para conteo exacto de asistencias
      const { data: citasData } = await supabase
        .from('citas_atenciones')
        .select('paciente_id, estado');

      const attendedCountsMap = new Map<string, number>();
      if (citasData) {
        citasData.forEach((c: any) => {
          const st = (c.estado || '').toLowerCase().trim();
          if (
            st === 'asistió' ||
            st === 'asistio' ||
            st === 'atendido' ||
            st === 'completada' ||
            st === 'completado' ||
            st === 'inasistencia (descuenta sesión)'
          ) {
            attendedCountsMap.set(
              c.paciente_id,
              (attendedCountsMap.get(c.paciente_id) || 0) + 1
            );
          }
        });
      }

      // 2. Obtener compras_planes para total de sesiones compradas y estado de pago
      const { data: planesData } = await supabase
        .from('compras_planes')
        .select('paciente_id, total_sesiones, sesiones_totales, estado_pago, estado');

      const planTotalsMap = new Map<string, number>();
      const pendingPaymentMap = new Map<string, boolean>();

      if (planesData) {
        planesData.forEach((p: any) => {
          const sessions = p.total_sesiones || p.sesiones_totales || 0;
          planTotalsMap.set(
            p.paciente_id,
            (planTotalsMap.get(p.paciente_id) || 0) + sessions
          );

          const stPago = (p.estado_pago || '').toLowerCase().trim();
          if (
            (p.estado === 'activo' || !p.estado) &&
            (stPago.includes('pendiente') || stPago === 'pending' || stPago === 'unpaid')
          ) {
            pendingPaymentMap.set(p.paciente_id, true);
          }
        });
      }

      // 3. Consultar tabla pacientes (tabla principal)
      let pacQuery = supabase.from('pacientes').select('*');
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        pacQuery = pacQuery.or(
          `nombre_completo.ilike.%${q}%,rut.ilike.%${q}%,telefono.ilike.%${q}%`
        );
      }
      const { data: dataPac, error: errPac } = await pacQuery.order('nombre_completo', {
        ascending: true,
      });

      if (!errPac && dataPac && dataPac.length > 0) {
        return dataPac.map((p: any) => {
          const realUsed = attendedCountsMap.get(p.id) || 0;
          const planTotal = planTotalsMap.get(p.id) || 0;
          const totalSessions =
            planTotal > 0
              ? planTotal
              : realUsed > 0
              ? realUsed
              : p.total_sesiones || 0;
          const remainingSessions = Math.max(0, totalSessions - realUsed);

          return {
            id: p.id,
            created_at: p.created_at,
            updated_at: p.updated_at,
            full_name: p.nombre_completo,
            rut: p.rut,
            phone: p.telefono,
            email: p.email,
            birth_date: p.fecha_nacimiento,
            health_insurance: p.prevision || p.prevision_salud || 'Particular',
            medical_notes: p.diagnostico_principal || p.diagnostico_medico || p.motivo_consulta,
            status: p.estado || 'active',
            total_sessions: totalSessions,
            used_sessions: realUsed,
            remaining_sessions: remainingSessions,
            has_pending_payment: pendingPaymentMap.get(p.id) || false,
            nombre_completo: p.nombre_completo,
            telefono: p.telefono,
            fecha_nacimiento: p.fecha_nacimiento,
            prevision_salud: p.prevision || p.prevision_salud || 'Particular',
            diagnostico_principal: p.diagnostico_principal || p.diagnostico_medico,
          };
        });
      }

      // 4. Fallback a tabla patients
      let query = supabase.from('patients').select(`
        *,
        patient_plans (
          total_sessions,
          used_sessions,
          status
        )
      `);

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        query = query.or(`full_name.ilike.%${q}%,rut.ilike.%${q}%,phone.ilike.%${q}%`);
      }

      const { data, error } = await query.order('full_name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => {
          const realUsed = attendedCountsMap.get(p.id) ?? (p.used_sessions || 0);
          const planTotal = planTotalsMap.get(p.id) ?? (p.total_sessions || 0);
          const totalSessions =
            planTotal > 0 ? planTotal : realUsed > 0 ? realUsed : 0;
          const remainingSessions = Math.max(0, totalSessions - realUsed);

          return {
            id: p.id,
            created_at: p.created_at,
            updated_at: p.updated_at,
            full_name: p.full_name,
            rut: p.rut,
            phone: p.phone,
            email: p.email,
            birth_date: p.birth_date,
            health_insurance: p.health_insurance,
            medical_notes: p.medical_notes,
            status: p.status || 'active',
            total_sessions: totalSessions,
            used_sessions: realUsed,
            remaining_sessions: remainingSessions,
            has_pending_payment: pendingPaymentMap.get(p.id) || false,
            nombre_completo: p.full_name,
            telefono: p.phone,
            fecha_nacimiento: p.birth_date,
            prevision_salud: p.health_insurance,
            diagnostico_principal: p.medical_notes,
          };
        });
      }
    } catch (err) {
      console.warn('Error en getPatients server action:', err);
    }
  }

  // Fallback local
  let list = initialMockPacientes.map((p) => ({
    id: p.id,
    full_name: p.nombre_completo,
    rut: p.rut,
    phone: p.telefono,
    email: p.email,
    birth_date: p.fecha_nacimiento,
    health_insurance: p.prevision_salud || 'Particular',
    medical_notes: p.diagnostico_principal,
    status: (p.estado || 'active') as any,
    total_sessions: (p as any).total_sesiones || 4,
    used_sessions: (p as any).sesiones_consumidas || 1,
    remaining_sessions: (p as any).sesiones_restantes || 3,
    has_pending_payment: false,
    nombre_completo: p.nombre_completo,
    telefono: p.telefono,
    fecha_nacimiento: p.fecha_nacimiento,
    prevision_salud: p.prevision_salud || 'Particular',
    diagnostico_principal: p.diagnostico_principal,
  }));

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.rut.toLowerCase().includes(q) ||
        (p.phone || '').includes(q)
    );
  }

  return list;
}

export async function createPatient(data: {
  full_name: string;
  rut: string;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  health_insurance?: string;
  medical_notes?: string | null;
  status?: string;
  motivo_consulta?: string | null;
  antecedentes_morbidos?: string | null;
  alertas_seguridad?: string | null;
}): Promise<{ success: boolean; data?: Patient; error?: string }> {
  if (!data.full_name || !data.full_name.trim()) {
    return { success: false, error: 'El nombre completo es obligatorio.' };
  }

  if (!data.rut || !data.rut.trim()) {
    return { success: false, error: 'El RUT es obligatorio.' };
  }

  if (!validateRut(data.rut)) {
    return { success: false, error: 'El RUT ingresado no es válido (revisa el dígito verificador).' };
  }

  const supabase = await createClient();
  const cleanRut = formatRut(data.rut);
  const cleanName = data.full_name.trim().toUpperCase();

  const payloadPatients = {
    full_name: cleanName,
    rut: cleanRut,
    phone: data.phone?.trim() || null,
    email: data.email?.trim().toLowerCase() || null,
    birth_date: data.birth_date || null,
    health_insurance: data.health_insurance || 'Particular',
    medical_notes: data.medical_notes?.trim() || null,
    status: data.status || 'active',
  };

  const nextCode = `KIR-${Math.floor(1000 + Math.random() * 9000)}`;

  if (supabase) {
    try {
      // 1. Insertar en tabla patients
      const { data: newPatient, error: errPatients } = await supabase
        .from('patients')
        .insert([payloadPatients])
        .select()
        .single();

      // 2. Insertar de forma estricta en tabla pacientes
      const payloadPacientes = {
        id: newPatient?.id,
        nombre_completo: cleanName,
        rut: cleanRut,
        telefono: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        fecha_nacimiento: data.birth_date || null,
        prevision: data.health_insurance || 'Particular',
        motivo_consulta: data.motivo_consulta?.trim() || data.medical_notes?.trim() || 'Consulta Kinésica Integral',
        diagnostico_principal: data.medical_notes?.trim() || null,
        antecedentes_morbidos: data.antecedentes_morbidos?.trim() || null,
        alertas_seguridad: data.alertas_seguridad?.trim() || null,
        estado: data.status || 'active',
      };

      const { error: errPacientes } = await supabase
        .from('pacientes')
        .insert([payloadPacientes]);

      if (errPacientes) {
        console.warn('Fallback: reintentando insert en pacientes con campos mínimos:', errPacientes.message);
        await supabase.from('pacientes').insert([{
          id: newPatient?.id,
          codigo_paciente: nextCode,
          nombre_completo: cleanName,
          rut: cleanRut,
          telefono: data.phone?.trim() || '',
          email: data.email?.trim().toLowerCase() || null,
          fecha_nacimiento: data.birth_date || null,
          prevision_salud: data.health_insurance || 'Particular',
          motivo_consulta: data.motivo_consulta?.trim() || 'Evaluación Kinésica',
          diagnostico_medico: data.medical_notes?.trim() || null,
          estado: data.status || 'active',
        }]);
      }

      revalidatePath('/pacientes');
      revalidatePath('/agenda');
      revalidatePath('/');

      return {
        success: true,
        data: {
          id: newPatient?.id || 'pac-' + Date.now(),
          full_name: cleanName,
          rut: cleanRut,
          phone: data.phone || '',
          email: data.email || '',
          birth_date: data.birth_date || '',
          health_insurance: data.health_insurance || 'Particular',
          medical_notes: data.medical_notes || '',
          status: 'active',
          total_sessions: 0,
          used_sessions: 0,
          remaining_sessions: 0,
          nombre_completo: cleanName,
          telefono: data.phone || '',
          fecha_nacimiento: data.birth_date || '',
          prevision_salud: data.health_insurance || 'Particular',
          diagnostico_principal: data.medical_notes || '',
        },
      };
    } catch (err: any) {
      console.warn('Error en supabase insert:', err);
    }
  }

  const localPatient: Patient = {
    id: 'pac-' + Date.now(),
    full_name: cleanName,
    rut: cleanRut,
    phone: data.phone || '',
    email: data.email || '',
    birth_date: data.birth_date || '',
    health_insurance: data.health_insurance || 'Particular',
    medical_notes: data.medical_notes || '',
    status: 'active',
    total_sessions: 0,
    used_sessions: 0,
    remaining_sessions: 0,
    nombre_completo: cleanName,
    telefono: data.phone || '',
    fecha_nacimiento: data.birth_date || '',
    prevision_salud: data.health_insurance || 'Particular',
    diagnostico_principal: data.medical_notes || '',
  };

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');

  return { success: true, data: localPatient };
}

export async function updatePatient(
  id: string,
  data: Partial<Patient>
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  const supabase = await createClient();

  const payload: any = {};
  if (data.full_name) {
    payload.full_name = data.full_name.trim().toUpperCase();
  }
  if (data.rut) {
    payload.rut = formatRut(data.rut);
  }
  if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
  if (data.email !== undefined) payload.email = data.email?.trim().toLowerCase() || null;
  if (data.birth_date !== undefined) payload.birth_date = data.birth_date || null;
  if (data.health_insurance) payload.health_insurance = data.health_insurance;
  if (data.medical_notes !== undefined) payload.medical_notes = data.medical_notes?.trim() || null;
  if (data.status) payload.status = data.status;

  if (supabase) {
    try {
      // 1. Update patients
      const { data: updated, error: errP } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      // 2. Update pacientes
      const payloadPacientes: any = {};
      if (data.full_name) payloadPacientes.nombre_completo = data.full_name.trim().toUpperCase();
      if (data.rut) payloadPacientes.rut = formatRut(data.rut);
      if (data.phone !== undefined) payloadPacientes.telefono = data.phone?.trim() || null;
      if (data.email !== undefined) payloadPacientes.email = data.email?.trim().toLowerCase() || null;
      if (data.birth_date !== undefined) payloadPacientes.fecha_nacimiento = data.birth_date || null;
      if (data.health_insurance) {
        payloadPacientes.prevision = data.health_insurance;
        payloadPacientes.prevision_salud = data.health_insurance;
      }
      if (data.medical_notes !== undefined) {
        payloadPacientes.diagnostico_principal = data.medical_notes?.trim() || null;
        payloadPacientes.diagnostico_medico = data.medical_notes?.trim() || null;
      }

      await supabase.from('pacientes').update(payloadPacientes).eq('id', id);

      revalidatePath('/pacientes');
      revalidatePath('/agenda');
      revalidatePath('/');

      return {
        success: true,
        data: updated || { id, ...data },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  revalidatePath('/pacientes');
  return { success: true, data: { id, ...data } as Patient };
}

export async function deletePatient(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (supabase) {
    try {
      await supabase.from('patients').delete().eq('id', id);
      await supabase.from('pacientes').delete().eq('id', id);
      revalidatePath('/pacientes');
      revalidatePath('/agenda');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  revalidatePath('/pacientes');
  return { success: true };
}
