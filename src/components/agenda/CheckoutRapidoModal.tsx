import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface CheckoutRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: any;
  onSuccess: () => void;
}

export function CheckoutRapidoModal({ isOpen, onClose, cita, onSuccess }: CheckoutRapidoModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [montoSugerido, setMontoSugerido] = useState<number>(25000);

  const paciente = cita?.pacientes;
  const tienePlanActivo = paciente?.plan_id && (paciente?.sesiones_restantes || 0) > 0;
  const nombrePlan = paciente?.nombre_plan || 'Plan';
  const usadas = paciente?.sesiones_usadas || 0;
  const totales = paciente?.sesiones_totales || 0;

  const handleCheckoutPlan = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Actualizar cita
      const { error: errCita } = await supabase.from('citas_atenciones').update({
        estado: 'asistio',
        estado_pago: 'cubierto_por_plan'
      }).eq('id', cita.id);
      if (errCita) throw errCita;

      // 2. Descontar plan
      const nuevasUsadas = usadas + 1;
      const estadoPlan = nuevasUsadas >= totales ? 'finalizado' : 'activo';
      const { error: errPlan } = await supabase.from('compras_planes').update({
        sesiones_usadas: nuevasUsadas,
        estado: estadoPlan
      }).eq('id', paciente.plan_id);
      if (errPlan) throw errPlan;

      toast.success('Atención registrada y descontada del plan.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el plan');
    } finally {
      setLoading(false);
    }
  };

  const handlePago = async (metodo: string, estadoPagoCita: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Actualizar cita
      const { error: errCita } = await supabase.from('citas_atenciones').update({
        estado: 'asistio',
        estado_pago: estadoPagoCita,
        monto_cobrado: montoSugerido
      }).eq('id', cita.id);
      if (errCita) throw errCita;

      // 2. Si no es fiado, registrar pago
      if (estadoPagoCita === 'pagado') {
        const { error: errPago } = await supabase.from('pagos_pacientes').insert({
          paciente_id: cita.paciente_id,
          cita_id: cita.id,
          monto: montoSugerido,
          metodo_pago: metodo,
          estado: 'completado',
        });
        if (errPago) throw errPago;
      }

      toast.success(`Atención registrada como ${estadoPagoCita === 'pagado' ? 'Pagada' : 'Pendiente'}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  if (!cita) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
          <DialogHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <DialogTitle className="text-xl font-bold text-slate-800">Checkout Rápido</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {paciente?.nombre_completo} - {cita.hora?.slice(0, 5)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-6">
            {tienePlanActivo ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-1">Plan Activo: {nombrePlan}</h4>
                  <p className="text-sm text-emerald-800">Se consumirá 1 sesión ({usadas + 1} de {totales}).</p>
                </div>
                <Button 
                  onClick={handleCheckoutPlan} 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg cursor-pointer"
                >
                  {loading ? 'Procesando...' : 'Descontar del Plan y Marcar Atendida'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Monto a Cobrar</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <Input 
                      type="number" 
                      value={montoSugerido} 
                      onChange={(e) => setMontoSugerido(Number(e.target.value) || 0)}
                      className="pl-8 text-lg font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handlePago('transferencia', 'pagado')} 
                    disabled={loading}
                    className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    🏦 Transferencia
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handlePago('tarjeta', 'pagado')} 
                    disabled={loading}
                    className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    💳 Tarjeta / Débito
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handlePago('efectivo', 'pagado')} 
                    disabled={loading}
                    className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    💵 Efectivo
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handlePago('pendiente', 'pendiente_pago')} 
                    disabled={loading}
                    className="h-12 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold bg-rose-50/50 cursor-pointer"
                  >
                    ⏳ Queda Debiendo
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="bg-slate-50 border-t border-slate-100 px-6 py-4">
            <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto cursor-pointer">
              Cancelar
            </Button>
          </DialogFooter>
        </div>
      </div>
    </Dialog>
  );
}
