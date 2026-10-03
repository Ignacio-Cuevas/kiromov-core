const fs = require('fs');
let content = fs.readFileSync('src/components/sales/PostSessionModal.tsx', 'utf-8');

const postSessionReplacement = `
      const payload = {
        paciente_id: paciente.id,
        catalogo_plan_id: planElegido.id || null,
        nombre_plan: planElegido.nombre || 'Plan Kinésico',
        total_sesiones: Number(planElegido.sesiones) || 1,
        sesiones_usadas: sesionesUsadasIniciales,
        valor_total: montoClp,
        monto_pagado: decision === 'pagar_ahora' ? montoClp : 0,
        saldo_pendiente: decision === 'pagar_ahora' ? 0 : montoClp,
        metodo_pago: decision === 'pagar_ahora' ? metodoPago : 'Transferencia',
        estado_pago: decision === 'pagar_ahora' ? 'pagado' : 'pendiente',
        fecha_compra: getChileanDate(),
        numero_boleta: numeroBoleta || null,
        notas: abonarEvaluacion ? 'Plan contratado con abono de evaluación previa ($28.000)' : null,
        estado: 'activo',
        created_at: new Date().toISOString()
      };

      const { data: newPlan, error } = await supabase.from('compras_planes').insert([payload]).select().single();
      if (error) {
        toast.error('Error al registrar plan: ' + error.message);
        return;
      }
      
      // Si paga de inmediato, registrar en pagos_pacientes
      if (decision === 'pagar_ahora' && montoClp > 0) {
         const { error: pagoErr } = await supabase.from('pagos_pacientes').insert([{
            paciente_id: paciente.id,
            plan_id: newPlan.id,
            monto: montoClp,
            metodo_pago: metodoPago || 'Transferencia',
            numero_boleta: numeroBoleta || null,
            fecha: new Date().toISOString(),
            notas: 'Pago inicial post-sesión'
         }]);
         if (pagoErr) console.error("Error al registrar pago post-sesión", pagoErr);
      }
`;

content = content.replace(/const payload = \{[\s\S]*?if\s*\(error\)\s*\{\s*toast\.error\([^)]+\);\s*return;\s*\}/m, postSessionReplacement);
fs.writeFileSync('src/components/sales/PostSessionModal.tsx', content);
