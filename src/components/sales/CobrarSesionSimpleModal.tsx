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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      const arancel = getArancel(categoriaTarifa);
      setMonto(arancel.sesion_individual);
    }
  }, [isOpen, categoriaTarifa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);
    try {
      const finalMonto = Number(String(monto).replace(/[^0-9]/g, '')) || 0;
      
      const { error: ppError } = await supabase.from('pagos_pacientes').insert([{
        paciente_id: pacienteId,
        cita_id: citaId || null,
        monto: finalMonto,
        metodo_pago: metodo,
        fecha: new Date().toISOString(),
        notas: 'Sesión Individual Kinésica'
      }]);
      
      if (ppError) throw ppError;
      
      if (citaId) {
        await supabase.from('citas_atenciones').update({
          estado_pago: 'pagado',
          monto_cobrado: finalMonto
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
                className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Débito / Transbank">Tarjeta Débito / Crédito</option>
              </select>
            </div>
            <DialogFooter>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Cobro
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
    </Dialog>
  );
}
