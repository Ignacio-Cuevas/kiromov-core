const fs = require('fs');
let content = fs.readFileSync('src/actions/sales.ts', 'utf-8');

// Replace createSale logic
const createSaleReplacement = `
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
          notas: \`Pago inicial plan: \${conceptName}\`
        }]);
        
        if (pagoError) {
           console.error("Error insertando pago en pagos_pacientes:", pagoError.message);
           // We don't rollback plan, but we log the error
        }
      }

      revalidatePath('/finanzas');`;

content = content.replace(/try\s*\{\s*\/\/\s*1\.\s*Inserción Primaria[\s\S]*?revalidatePath\('\/finanzas'\);/m, createSaleReplacement);
fs.writeFileSync('src/actions/sales.ts', content);
