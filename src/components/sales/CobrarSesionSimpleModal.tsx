import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { getArancel } from '@/lib/pricing';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CobrarSesionSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  categoriaTarifa: string | null;
  citaId?: string;
  onSuccess: () => void;
}

export function CobrarSesionSimpleModal({ isOpen, onClose, pacienteId, categoriaTarifa, citaId, onSuccess }: CobrarSesionSimpleModalProps) {
  const [monto, setMonto] = useState<number>(0);
  const [metodo, setMetodo] = useState('Transferencia');
  const [boleta, setBoleta] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      const arancel = getArancel(categoriaTarifa);
      setMonto(arancel.sesion_individual);
      setBoleta('');
      setObservaciones('');
    }
  }, [isOpen, categoriaTarifa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!boleta.trim()) {
      toast.error('El N° de Boleta es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalMonto = Number(String(monto).replace(/[^0-9]/g, '')) || 0;
      
      let finalNotas = 'Sesión Individual Kinésica';
      if (observaciones.trim()) finalNotas += ` | Notas: ${observaciones.trim()}`;
      
      const payload: any = {
        paciente_id: pacienteId,
        cita_id: citaId || null,
        monto: finalMonto,
        metodo_pago: metodo,
        fecha: new Date().toISOString(),
        notas: finalNotas,
        numero_boleta: boleta.trim()
      };

      // Intentamos insertar con tipo_concepto si existe, si falla caemos a payload base
      let ppError = null;
      const { error: err1 } = await supabase.from('pagos_pacientes').insert([{ ...payload, tipo_concepto: 'sesion_individual' }]);
      if (err1) {
        const { error: err2 } = await supabase.from('pagos_pacientes').insert([payload]);
        ppError = err2;
      }

      if (ppError) throw ppError;
      
      if (citaId) {
        await supabase.from('citas_atenciones').update({
          estado_pago: 'pagado',
          monto_cobrado: finalMonto,
          estado: 'asistio' // Marcar como asistió como dice el requerimiento
        }).eq('id', citaId);
      }
      
      toast.success('Sesión cobrada exitosamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Error al registrar cobro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogHeader>
          <DialogTitle>Cobrar Sesión Individual</DialogTitle>
          <DialogDescription>Registra el pago para una única atención sin activar un plan.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Monto (CLP)</label>
                <input 
                  type="text" 
                  required
                  value={monto || ""}
                  onChange={(e) => setMonto(Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0)}
                  className="w-full border rounded-xl p-2.5 font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Medio de Pago</label>
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
              <label className="text-xs font-semibold text-slate-700">N° de Boleta Electrónica *</label>
              <input 
                type="text" 
                placeholder="Ej: 12345"
                value={boleta}
                onChange={e => setBoleta(e.target.value)}
                className="w-full mt-1 p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Observaciones (Opcional)</label>
              <textarea 
                placeholder="Algún detalle sobre el pago..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
              />
            </div>
            
            <DialogFooter>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl hover:bg-slate-50 font-semibold cursor-pointer">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex gap-2 cursor-pointer">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Cobro
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
    </Dialog>
  );
}
