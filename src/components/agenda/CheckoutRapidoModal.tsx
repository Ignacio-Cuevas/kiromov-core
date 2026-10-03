import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CheckoutRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: any;
  onSuccess: () => void;
}

export function CheckoutRapidoModal({ isOpen, onClose, cita, onSuccess }: CheckoutRapidoModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const paciente = cita?.pacientes;
  const tienePlanActivo = paciente?.plan_id && (paciente?.sesiones_restantes || 0) > 0;
  const nombrePlan = paciente?.nombre_plan || 'Plan';
  const usadas = paciente?.sesiones_usadas || 0;
  const totales = paciente?.sesiones_totales || 0;

  // Tarifa por defecto para la vista de sesión individual
  const [monto, setMonto] = useState<number>(paciente?.categoria_tarifa === 'tarifa_antigua' ? 20000 : 28000);
  const [medioPago, setMedioPago] = useState<string>('transferencia');

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

  const handleConfirmarSesionSimple = async (estadoPagoCita: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const finalMonto = estadoPagoCita === 'pagado' ? monto : (Number(cita?.monto_cobrado) || monto);
      
      // 1. Actualizar cita
      const { error: errCita } = await supabase.from('citas_atenciones').update({
        estado: 'asistio',
        estado_pago: estadoPagoCita,
        monto_cobrado: finalMonto,
        metodo_pago: estadoPagoCita === 'pagado' ? medioPago : null
      }).eq('id', cita.id);
      if (errCita) throw errCita;

      // 2. Si no es fiado, registrar pago en pagos_pacientes
      if (estadoPagoCita === 'pagado') {
        const { error: errPago } = await supabase.from('pagos_pacientes').insert({
          paciente_id: cita.paciente_id,
          cita_id: cita.id,
          monto: finalMonto,
          metodo_pago: medioPago,
          fecha: new Date().toISOString(),
          notas: 'Sesión Individual Kinésica',
          tipo_concepto: 'sesion_individual'
        });
        // Permitimos que pase si falla el tipo_concepto pero intentamos sin él (retrocompatibilidad)
        if (errPago) {
           await supabase.from('pagos_pacientes').insert({
             paciente_id: cita.paciente_id,
             cita_id: cita.id,
             monto: finalMonto,
             metodo_pago: medioPago,
             fecha: new Date().toISOString(),
             notas: 'Sesión Individual Kinésica'
           });
        }
      }

      toast.success(`Atención registrada como ${estadoPagoCita === 'pagado' ? 'Pagada' : 'Pendiente de cobro'}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la atención');
    } finally {
      setLoading(false);
    }
  };

  if (!cita) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="max-w-md min-h-[380px] p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
      {tienePlanActivo ? (
        <div className="space-y-4 flex flex-col h-full justify-between">
          <div>
            <div className="border-b pb-3 mb-4">
              <h3 className="font-semibold text-base text-slate-900">Registrar Atención de Plan</h3>
              <p className="text-xs text-slate-500">{paciente?.nombre_completo} • Tratamiento</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-900 mb-1">Plan Activo: {nombrePlan}</h4>
              <p className="text-sm text-emerald-800">Se consumirá 1 sesión ({usadas + 1} de {totales}).</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
             <button type="button" onClick={onClose} disabled={loading} className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
               Cancelar
             </button>
             <button type="button" onClick={handleCheckoutPlan} disabled={loading} className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-2 cursor-pointer">
               {loading && <Loader2 className="w-3 h-3 animate-spin" />}
               Descontar Sesión del Plan
             </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex flex-col h-full justify-between">
          <div>
            <div className="border-b pb-3 mb-4">
              <h3 className="font-semibold text-base text-slate-900">Registrar Atención y Cobro</h3>
              <p className="text-xs text-slate-500">{paciente?.nombre_completo} • Sesión Individual</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Monto de la Atención (CLP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="text" 
                    value={monto || ""} 
                    onChange={(e) => {
                      const val = Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0;
                      setMonto(val);
                    }}
                    className="w-full pl-8 p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Medio de Pago</label>
                <select 
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta_debito">Tarjeta Débito / Crédito</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-5 border-t mt-auto">
            <button type="button" onClick={() => handleConfirmarSesionSimple('pendiente_pago')} disabled={loading} className="px-3 py-2.5 text-xs text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg font-semibold shadow-2xs w-full sm:w-auto cursor-pointer flex justify-center items-center">
               Solo Marcar Atendida (Fiado)
            </button>
            <button type="button" onClick={() => handleConfirmarSesionSimple('pagado')} disabled={loading} className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm w-full sm:w-auto cursor-pointer flex justify-center items-center gap-2">
               {loading && <Loader2 className="w-3 h-3 animate-spin" />}
               Confirmar Atención y Cobro
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
