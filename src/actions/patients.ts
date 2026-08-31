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
          const activePlans = p.patient_plans || [];
          const totalSessions = activePlans.reduce(
            (acc: number, curr: any) => acc + (curr.total_sessions || 0),
            0
          );
          const usedSessions = activePlans.reduce(
            (acc: number, curr: any) => acc + (curr.used_sessions || 0),
            0
          );
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
            used_sessions: usedSessions,
            remaining_sessions: Math.max(0, totalSessions - usedSessions),
          };
        });
      }

      // Fallback a tabla en español si patients está vacía
      const { data: dataPac } = await supabase.from('pacientes').select('*');
      if (dataPac && dataPac.length > 0) {
        return dataPac.map((p: any) => ({
          id: p.id,
          created_at: p.created_at,
          updated_at: p.updated_at,
          full_name: p.nombre_completo,
          rut: p.rut,
          phone: p.telefono,
          email: p.email,
          birth_date: p.fecha_nacimiento,
          health_insurance: p.prevision_salud || 'Particular',
          medical_notes: p.diagnostico_medico || p.diagnostico_principal,
          status: p.estado || 'active',
          total_sessions: 4,
          used_sessions: 1,
          remaining_sessions: 3,
        }));
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
    total_sessions: 4,
    used_sessions: 1,
    remaining_sessions: 3,
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

  const payload = {
    full_name: cleanName,
    rut: cleanRut,
    phone: data.phone?.trim() || null,
    email: data.email?.trim().toLowerCase() || null,
    birth_date: data.birth_date || null,
    health_insurance: data.health_insurance || 'Particular',
    medical_notes: data.medical_notes?.trim() || null,
    status: data.status || 'active',
  };

  if (supabase) {
    try {
      // 1. Insertar en tabla patients
      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert([payload])
        .select()
        .single();

      // 2. Insertar en tabla pacientes (para compatibilidad dual)
      const nextCode = `KIR-${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from('pacientes').insert([
        {
          id: newPatient?.id,
          codigo_paciente: nextCode,
          nombre_completo: cleanName,
          rut: cleanRut,
          telefono: payload.phone || '',
          email: payload.email,
          fecha_nacimiento: payload.birth_date,
          prevision_salud: payload.health_insurance,
          diagnostico_medico: payload.medical_notes,
          diagnostico_principal: payload.medical_notes,
          estado: payload.status,
        },
      ]);

      if (!error && newPatient) {
        revalidatePath('/pacientes');
        revalidatePath('/');
        revalidatePath('/agenda');
        return { success: true, data: newPatient as Patient };
      }
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al conectar con la base de datos' };
    }
  }

  const localNew: Patient = {
    ...payload,
    id: 'pat-' + Date.now(),
    created_at: new Date().toISOString(),
    status: payload.status as any,
    total_sessions: 0,
    used_sessions: 0,
    remaining_sessions: 0,
  };

  revalidatePath('/pacientes');
  revalidatePath('/');
  return { success: true, data: localNew };
}

export async function updatePatient(
  id: string,
  data: Partial<Patient>
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  const supabase = await createClient();

  if (data.rut && !validateRut(data.rut)) {
    return { success: false, error: 'El RUT ingresado no es válido.' };
  }

  if (supabase) {
    try {
      const updates: any = { ...data, updated_at: new Date().toISOString() };
      if (updates.full_name) updates.full_name = updates.full_name.trim().toUpperCase();
      if (updates.rut) updates.rut = formatRut(updates.rut);

      const { data: updated, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      // Compatibilidad con tabla pacientes
      await supabase
        .from('pacientes')
        .update({
          nombre_completo: updates.full_name,
          rut: updates.rut,
          telefono: updates.phone,
          email: updates.email,
          fecha_nacimiento: updates.birth_date,
          prevision_salud: updates.health_insurance,
          diagnostico_medico: updates.medical_notes,
        })
        .eq('id', id);

      if (!error && updated) {
        revalidatePath('/pacientes');
        revalidatePath('/');
        return { success: true, data: updated as Patient };
      }
      if (error) return { success: false, error: error.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  revalidatePath('/pacientes');
  revalidatePath('/');
  return { success: true };
}
