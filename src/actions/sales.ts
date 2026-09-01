'use server';

import { createClient } from '@/utils/supabase/server';
import { Sale } from '@/types/clinical';
import { revalidatePath } from 'next/cache';

export async function createSale(data: {
  patient_id: string;
  plan_id?: string | null;
  concept: string;
  sessions_quantity: number;
  total_amount_clp: number;
  payment_method: 'transfer' | 'card' | 'cash' | 'agreement';
  payment_status: 'paid' | 'pending' | 'partial';
  receipt_number?: string | null;
  numero_boleta?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; data?: Sale; error?: string }> {
  if (!data.patient_id) {
    return { success: false, error: 'Se requiere un paciente válido.' };
  }

  if (!data.concept || !data.concept.trim()) {
    return { success: false, error: 'El concepto o nombre del servicio es obligatorio.' };
  }

  if (data.total_amount_clp < 0) {
    return { success: false, error: 'El monto total no puede ser negativo.' };
  }

  const supabase = await createClient();
  const boletaClean = data.numero_boleta?.trim() || data.receipt_number?.trim() || null;

  const salePayload = {
    patient_id: data.patient_id,
    plan_id: data.plan_id || null,
    concept: data.concept.trim(),
    sessions_quantity: Number(data.sessions_quantity) || 1,
    total_amount_clp: Number(data.total_amount_clp) || 0,
    payment_method: data.payment_method || 'transfer',
    payment_status: data.payment_status || 'paid',
    receipt_number: boletaClean,
    notes: data.notes?.trim() || null,
  };

  if (supabase) {
    try {
      // 1. Insertar en tabla sales
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([salePayload])
        .select()
        .single();

      // 2. Si tiene sesiones, insertar automáticamente en patient_plans
      if (salePayload.sessions_quantity > 0) {
        await supabase.from('patient_plans').insert([
          {
            patient_id: salePayload.patient_id,
            sale_id: newSale?.id || null,
            plan_name: salePayload.concept,
            total_sessions: salePayload.sessions_quantity,
            used_sessions: 0,
            receipt_number: boletaClean,
            status: 'active',
          },
        ]);
      }

      // 3. Sincronizar con tabla compras_planes (compatibilidad dual)
      const medioPagoMap: Record<string, string> = {
        transfer: 'Transferencia',
        card: 'Débito / Transbank',
        cash: 'Efectivo',
        agreement: 'Convenio',
      };
      const estadoPagoMap: Record<string, string> = {
        paid: 'Pagado',
        pending: 'Pendiente de Pago',
        partial: 'Parcial / Cuotas',
      };

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      await supabase.from('compras_planes').insert([
        {
          id: newSale?.id,
          paciente_id: salePayload.patient_id,
          plan_id: salePayload.plan_id,
          catalogo_plan_id: salePayload.plan_id,
          nombre_plan: salePayload.concept,
          total_sesiones: salePayload.sessions_quantity,
          sesiones_totales: salePayload.sessions_quantity,
          sesiones_usadas: 0,
          precio_base: salePayload.total_amount_clp,
          valor_total: salePayload.total_amount_clp,
          total_final_clp: salePayload.total_amount_clp,
          monto_clp: salePayload.total_amount_clp,
          numero_boleta: boletaClean,
          medio_pago: medioPagoMap[salePayload.payment_method] || 'Transferencia',
          metodo_pago: medioPagoMap[salePayload.payment_method] || 'Transferencia',
          estado_pago: estadoPagoMap[salePayload.payment_status] || 'Pagado',
          fecha_compra: todayStr,
          estado: 'activo',
          notas: salePayload.notes,
        },
      ]);

      if (!saleError && newSale) {
        revalidatePath('/finanzas');
        revalidatePath('/pacientes');
        revalidatePath('/');
        revalidatePath('/agenda');
        return { success: true, data: newSale as Sale };
      }
      if (saleError) return { success: false, error: saleError.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  const localNew: Sale = {
    ...salePayload,
    id: 'sale-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  revalidatePath('/finanzas');
  revalidatePath('/pacientes');
  revalidatePath('/');
  return { success: true, data: localNew };
}

export async function getSales(): Promise<Sale[]> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          patients:patient_id (
            id,
            full_name,
            rut,
            phone
          ),
          plans:plan_id (
            id,
            name,
            price_clp,
            sessions_count
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Sale[];
      }
    } catch (err) {
      console.warn('Error en getSales server action:', err);
    }
  }

  return [];
}
