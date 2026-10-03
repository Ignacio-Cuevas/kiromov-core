import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { formatCLP } from '@/lib/utils';

export type DeudaItem = {
  tipo: 'cita' | 'plan';
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  concepto: string; // nombre del plan o motivo de cita
  deuda: number;
  fecha: string;
};

interface CobrarDeudaModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DeudaItem | null;
  onSuccess: () => void;
}

export function CobrarDeudaModal({ isOpen, onClose, item, onSuccess }: CobrarDeudaModalProps) {
  const [monto, setMonto] = useState<number>(0);
  const [metodo, setMetodo] = useState('Transferencia');
  const [boleta, setBoleta] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && item) {
      setMonto(item.deuda);
      setBoleta('');
      setObservaciones('');
      setMetodo('Transferencia');
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !item) return;
    setIsSubmitting(true);
    try {
      const finalMonto = Number(String(monto).replace(/[^0-9]/g, '')) || 0;
      
      let finalNotas = item.tipo === 'cita' ? 'Sesión Individual Kinésica' : 'Abono a Plan';
      if (boleta.trim()) finalNotas += ` | Boleta: ${boleta.trim()}`;
      if (observaciones.trim()) finalNotas += ` | Notas: ${observaciones.trim()}`;
      
      const payload: any = {
        paciente_id: item.paciente_id,
        monto: finalMonto,
        metodo_pago: metodo,
        fecha: new Date().toISOString(),
        notas: finalNotas,
        numero_boleta: boleta.trim(),
        comprobante: boleta.trim()
      };

      if (item.tipo === 'cita') payload.cita_id = item.id;
      if (item.tipo === 'plan') payload.plan_id = item.id; // Although plan_id is not in PagoPaciente type natively, we add it or just omit it, wait, the DB schema for pagos_pacientes might not have plan_id.

      // Intentamos insertar con tipo_concepto
      let ppError = null;
      const { error: err1 } = await supabase.from('pagos_pacientes').insert([{ 
        ...payload, 
        tipo_concepto: item.tipo === 'cita' ? 'sesion_individual' : 'abono_plan' 
      }]);
      
      if (err1) {
        const { error: err2 } = await supabase.from('pagos_pacientes').insert([payload]);
        ppError = err2;
      }

      if (ppError) throw ppError;
      
      if (item.tipo === 'cita') {
        await supabase.from('citas_atenciones').update({
          estado_pago: 'pagado',
          monto_cobrado: finalMonto,
          metodo_pago: metodo
        }).eq('id', item.id);
      } else {
        // Consultar el plan para actualizarlo
        const { data: planData, error: planErr } = await supabase
          .from('compras_planes')
          .select('monto_pagado, saldo_pendiente, valor_total')
          .eq('id', item.id)
          .single();
          
        if (planErr) throw planErr;
        
        const nuevoMontoPagado = (planData.monto_pagado || 0) + finalMonto;
        const nuevoSaldoPendiente = Math.max(0, (planData.valor_total || 0) - nuevoMontoPagado);
        
        await supabase.from('compras_planes').update({
          monto_pagado: nuevoMontoPagado,
          saldo_pendiente: nuevoSaldoPendiente,
          estado_pago: nuevoSaldoPendiente <= 0 ? 'pagado' : 'parcial'
        }).eq('id', item.id);
      }
      
      toast.success('Cobro registrado exitosamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Error al registrar cobro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogHeader>
          <DialogTitle>Registrar Pago de Deuda</DialogTitle>
          <DialogDescription>
            Cobro para <strong>{item.paciente_nombre}</strong> por {item.tipo === 'cita' ? 'sesión' : 'plan'}: {item.concepto}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Adeuda:</p>
                <p className="text-sm font-bold text-slate-800">{item.concepto}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Fecha origen:</p>
                <p className="text-sm font-bold text-slate-800">{item.fecha.split('T')[0]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Deuda actual:</p>
                <p className="text-sm font-bold text-rose-600">{formatCLP(item.deuda)}</p>
              </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Monto Cobrado (CLP) *</label>
                <input 
                  type="text" 
                  required
                  value={monto || ""}
                  onChange={(e) => {
                    const val = Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0;
                    setMonto(val > item.deuda ? item.deuda : val);
                  }}
                  className="w-full border rounded-xl p-2.5 font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none text-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Medio de Pago *</label>
                <select 
                  value={metodo} 
                  onChange={e => setMetodo(e.target.value)}
                  className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-[52px]"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito / Transbank">Tarjeta Débito / Crédito</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">N° Comprobante / Boleta</label>
              <input 
                type="text" 
                placeholder="Opcional"
                value={boleta}
                onChange={e => setBoleta(e.target.value)}
                className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Notas</label>
              <textarea 
                placeholder="Observaciones adicionales..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
              />
            </div>
            
            <DialogFooter>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl hover:bg-slate-50 font-semibold cursor-pointer text-sm">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex gap-2 cursor-pointer shadow-md">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Pago
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
    </Dialog>
  );
}
