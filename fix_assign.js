const fs = require('fs');
let content = fs.readFileSync('src/components/sales/AssignTreatmentModal.tsx', 'utf-8');

const assignReplacement = `
      const payload = {
        paciente_id: paciente.id,
        catalogo_plan_id: planElegido.id !== 'personalizado' ? planElegido.id : null,
        nombre_plan: planElegido.id === 'personalizado' ? 'Plan Personalizado / Especial' : (planElegido.nombre || 'Plan Kinésico'),
        total_sesiones: Number(sesionesCustom) || 1,
        sesiones_usadas: 0,
        valor_total: montoClp,
        saldo_pendiente: montoClp,
        monto_pagado: 0,
        metodo_pago: 'Transferencia',
        estado_pago: 'pendiente',
        fecha_compra: getChileanDate(),
        numero_boleta: numeroBoleta.trim(),
        estado: 'activo',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('compras_planes').insert([payload]);
      if (error) {
          toast.error('Error al asignar plan: ' + error.message);
          return;
      }
`;
content = content.replace(/const payload = \{[\s\S]*?if\s*\(retry\.error\)\s*\{\s*toast\.error\([^)]+\);\s*return;\s*\}\s*\}/m, assignReplacement);
fs.writeFileSync('src/components/sales/AssignTreatmentModal.tsx', content);
