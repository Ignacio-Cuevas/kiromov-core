'use server';

import { createClient } from '@/utils/supabase/server';
import { Plan } from '@/types/clinical';
import { revalidatePath } from 'next/cache';
import { initialMockCatalogoPlanes } from '@/lib/mock-data';

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Plan[];
      }

      // Fallback a catalogo_planes
      const { data: catData } = await supabase
        .from('catalogo_planes')
        .select('*')
        .order('nombre_plan', { ascending: true });

      if (catData && catData.length > 0) {
        return catData.map((c: any) => ({
          id: c.id,
          name: c.nombre_plan,
          type: (c.tipo || (c.total_sesiones === 1 ? 'single_session' : 'plan')) as any,
          sessions_count: c.total_sesiones,
          price_clp: Number(c.precio_clp),
          description: c.descripcion,
          is_active: c.activo,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Error en getPlans server action:', err);
    }
  }

  // Fallback local
  return initialMockCatalogoPlanes.map((c) => ({
    id: c.id,
    name: c.nombre_plan,
    type: (c.total_sesiones === 1 ? 'single_session' : 'plan') as any,
    sessions_count: c.total_sesiones,
    price_clp: c.precio_clp,
    description: c.descripcion,
    is_active: c.activo,
  }));
}

export async function createPlan(data: {
  name: string;
  type: 'single_session' | 'evaluation' | 'plan';
  sessions_count: number;
  price_clp: number;
  description?: string | null;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: Plan; error?: string }> {
  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'El nombre de la tarifa o plan es obligatorio.' };
  }

  if (data.sessions_count <= 0) {
    return { success: false, error: 'La cantidad de sesiones debe ser al menos 1.' };
  }

  if (data.price_clp < 0) {
    return { success: false, error: 'El precio no puede ser negativo.' };
  }

  const supabase = await createClient();
  const payload = {
    name: data.name.trim(),
    type: data.type || 'plan',
    sessions_count: data.sessions_count,
    price_clp: data.price_clp,
    description: data.description?.trim() || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
  };

  if (supabase) {
    try {
      // 1. Insertar en tabla plans
      const { data: newPlan, error } = await supabase
        .from('plans')
        .insert([payload])
        .select()
        .single();

      // 2. Insertar en tabla catalogo_planes (para compatibilidad dual)
      await supabase.from('catalogo_planes').insert([
        {
          id: newPlan?.id,
          nombre_plan: payload.name,
          categoria: payload.type === 'evaluation' ? 'Promoción' : 'General',
          tipo: payload.type,
          total_sesiones: payload.sessions_count,
          precio_clp: payload.price_clp,
          activo: payload.is_active,
          descripcion: payload.description,
        },
      ]);

      if (!error && newPlan) {
        revalidatePath('/planes');
        revalidatePath('/');
        revalidatePath('/finanzas');
        return { success: true, data: newPlan as Plan };
      }
      if (error) return { success: false, error: error.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  const localNew: Plan = {
    ...payload,
    id: 'plan-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  revalidatePath('/planes');
  revalidatePath('/');
  return { success: true, data: localNew };
}

export async function updatePlan(
  id: string,
  data: Partial<Plan>
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const updates = { ...data, updated_at: new Date().toISOString() };
      const { data: updated, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      // Sincronizar con catalogo_planes
      await supabase
        .from('catalogo_planes')
        .update({
          nombre_plan: updates.name,
          total_sesiones: updates.sessions_count,
          precio_clp: updates.price_clp,
          activo: updates.is_active,
          descripcion: updates.description,
          tipo: updates.type,
        })
        .eq('id', id);

      if (!error && updated) {
        revalidatePath('/planes');
        revalidatePath('/');
        revalidatePath('/finanzas');
        return { success: true, data: updated as Plan };
      }
      if (error) return { success: false, error: error.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  revalidatePath('/planes');
  revalidatePath('/');
  return { success: true };
}

export async function togglePlanStatus(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  return updatePlan(id, { is_active });
}
