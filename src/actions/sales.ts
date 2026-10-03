'use server';

import { createClient } from '@/utils/supabase/server';
import { Sale } from '@/types/clinical';
import { revalidatePath } from 'next/cache';

export async function createSale(data: {
  patient_id: string;
  plan_id?: string | null;
  concept: string;
  sessions_quantity: number;
  sesiones_usadas?: number;
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
  const sessionsQty = Number(data.sessions_quantity) || 1;
  const totalAmount = Number(data.total_amount_clp) || 0;
  const conceptName = data.concept.trim();

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

  if (supabase) {
    
    try {
      const montoPagado = data.payment_status === 'paid' ? totalAmount : 0;
      const saldoPendiente = data.payment_status === 'paid' ? 0 : totalAmount;

      // 1. Inserción Primaria en compras_planes (Persistencia Oficial)
      let insertedPlanId: string | null = null;
      const { data: newPlan, error: planError } = await supabase
        .from('compras_planes')
        .insert([
          {
            paciente_id: data.patient_id,
            catalogo_plan_id: data.plan_id || null,
            nombre_plan: conceptName,
            total_sesiones: sessionsQty,
            sesiones_usadas: data.sesiones_usadas ?? 0,
            valor_total: totalAmount,
            numero_boleta: boletaClean,
            metodo_pago: medioPagoMap[data.payment_method] || 'Transferencia',
            estado_pago: estadoPagoMap[data.payment_status] || 'Pagado',
            monto_pagado: montoPagado,
            saldo_pendiente: saldoPendiente,
            fecha_compra: todayStr,
            estado: 'activo',
            notas: data.notes?.trim() || null,
          },
        ])
        .select()
        .single();

      if (planError) {
        console.error('Error en compras_planes insert:', planError.message);
        return { success: false, error: planError.message };
      }
      
      insertedPlanId = newPlan.id;

      // 2. Insertar en pagos_pacientes SI se pagó inmediatamente
      if (data.payment_status === 'paid' && totalAmount > 0) {
        const { error: pagoError } = await supabase.from('pagos_pacientes').insert([{
          paciente_id: data.patient_id,
          plan_id: insertedPlanId,
          monto: totalAmount,
          metodo_pago: medioPagoMap[data.payment_method] || 'Transferencia',
          fecha: new Date().toISOString(),
          numero_boleta: boletaClean,
          notas: `Pago inicial plan: ${conceptName}`
        }]);
        
        if (pagoError) {
           console.error("Error insertando pago en pagos_pacientes:", pagoError.message);
           // We don't rollback plan, but we log the error
        }
      }

      revalidatePath('/finanzas');
      revalidatePath('/pacientes');
      revalidatePath('/');
      revalidatePath('/agenda');

      return {
        success: true,
        data: {
          id: insertedPlanId || 'sale-' + Date.now(),
          patient_id: data.patient_id,
          plan_id: data.plan_id || null,
          concept: conceptName,
          sessions_quantity: sessionsQty,
          total_amount_clp: totalAmount,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          receipt_number: boletaClean,
          numero_boleta: boletaClean,
          notes: data.notes || null,
          created_at: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      console.error('Error general en createSale:', err);
      return { success: false, error: err.message };
    }
  }

  const localNew: Sale = {
    id: 'sale-' + Date.now(),
    patient_id: data.patient_id,
    plan_id: data.plan_id || null,
    concept: conceptName,
    sessions_quantity: sessionsQty,
    total_amount_clp: totalAmount,
    payment_method: data.payment_method,
    payment_status: data.payment_status,
    receipt_number: boletaClean,
    numero_boleta: boletaClean,
    notes: data.notes || null,
    created_at: new Date().toISOString(),
  };

  revalidatePath('/finanzas');
  revalidatePath('/pacientes');
  revalidatePath('/');
  return { success: true, data: localNew };
}

export async function settlePendingPlan(data: {
  plan_id: string;
  payment_method: string;
  numero_boleta?: string | null;
  valor_total?: number;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (!data.plan_id) {
    return { success: false, error: 'ID de plan no proporcionado.' };
  }

  const medioPagoMap: Record<string, string> = {
    transferencia: 'Transferencia',
    tarjeta: 'Débito / Transbank',
    efectivo: 'Efectivo',
    convenio: 'Convenio',
  };

  const cleanBoleta = data.numero_boleta?.trim() || null;
  const labelMedio = medioPagoMap[data.payment_method] || data.payment_method || 'Transferencia';

  if (supabase) {
    try {
      const updatePayload: any = {
        estado_pago: 'Pagado',
        metodo_pago: labelMedio,
        numero_boleta: cleanBoleta,
        updated_at: new Date().toISOString(),
      };

      if (data.valor_total && data.valor_total > 0) {
        updatePayload.valor_total = data.valor_total;
        updatePayload.valor_total = data.valor_total;
        updatePayload.valor_total = data.valor_total;
      }

      if (data.notes) {
        updatePayload.notas = data.notes;
      }

      const { error } = await supabase
        .from('compras_planes')
        .update(updatePayload)
        .eq('id', data.plan_id);

      if (error) throw error;

      revalidatePath('/pacientes');
      revalidatePath('/finanzas');
      revalidatePath('/');

      return { success: true };
    } catch (err: any) {
      console.error('Error settling pending plan:', err);
      return { success: false, error: err.message };
    }
  }

  revalidatePath('/pacientes');
  return { success: true };
}

