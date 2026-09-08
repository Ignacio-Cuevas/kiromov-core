'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreditCard, Clock, Loader2 } from 'lucide-react';
import { getChileanDate } from '@/lib/utils';

interface PostSessionModalProps {
  isOpen: boolean;
  paciente: any;
  motivo: string; // 'plan_completado' | 'sin_plan'
  onClose: () => void;
  onSuccess: () => void;
}

const CATALOGO_RESPALDO = [
  { id: 'eval-tmo', nombre: 'Evaluación Inicial + TMO', sesiones: 1, precio: 28000 },
  { id: 'sesion-particular', nombre: 'Sesión Individual (Particular)', sesiones: 1, precio: 28000 },
  { id: 'sesion-convenio', nombre: 'Sesión Individual (Convenio)', sesiones: 1, precio: 25000 },
  { id: 'activa-particular', nombre: 'Plan Activa Care (4 Sesiones)', sesiones: 4, precio: 104000 },
  { id: 'activa-convenio', nombre: 'Plan Activa Care (Convenio - 4 Sesiones)', sesiones: 4, precio: 75000 },
  { id: 'pro-particular', nombre: 'Plan Pro Care (6 Sesiones)', sesiones: 6, precio: 145000 },
  { id: 'pro-convenio', nombre: 'Plan Pro Care (Convenio - 6 Sesiones)', sesiones: 6, precio: 110000 },
  { id: 'integral-particular', nombre: 'Plan Integral (10 Sesiones)', sesiones: 10, precio: 250000 },
  { id: 'integral-convenio', nombre: 'Plan Integral (Convenio - 10 Sesiones)', sesiones: 10, precio: 200000 },
  { id: 'personalizado', nombre: 'Plan Personalizado / Especial', sesiones: 1, precio: 0 }
];

export function PostSessionModal({ isOpen, paciente, motivo, onClose, onSuccess }: PostSessionModalProps) {
  const supabase = createClient();
  const [planesDisponibles, setPlanesDisponibles] = useState<any[]>(CATALOGO_RESPALDO);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [montoCustom, setMontoCustom] = useState<string>('');
  const [abonarEvaluacion, setAbonarEvaluacion] = useState(false);
  const [decision, setDecision] = useState<'pagar_ahora' | 'pendiente'>('pagar_ahora');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [numeroBoleta, setNumeroBoleta] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarCatalogo();
    }
  }, [isOpen]);

  const handleSeleccionarPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const planEncontrado = planesDisponibles.find(p => p.id === planId);
    if (planEncontrado) {
      const precioBase = planEncontrado.precio || 0;
      const valorAbono = abonarEvaluacion && planEncontrado.sesiones > 1 ? 28000 : 0;
      setMontoCustom(Math.max(0, precioBase - valorAbono).toString());
    }
  };

  const cargarCatalogo = async () => {
    if (!supabase) return;
    setLoadingPlanes(true);
    try {
      // Intentar consultar catalogo_planes (o plans/tarifario)
      const { data, error } = await supabase
        .from('catalogo_planes')
        .select('*');

      if (!error && data && data.length > 0) {
        // Normalizar nombres de columnas
        const planesNormalizados = data.map((p: any) => ({
          id: p.id,
          nombre: p.nombre || p.name || 'Plan Kinésico',
          sesiones: p.sessions_count || p.sesiones_count || 1,
          precio: p.price_clp || p.precio_clp || 28000
        }));
        setPlanesDisponibles(planesNormalizados);
      }
    } catch (err) {
      console.warn('Usando catálogo de respaldo:', err);
    } finally {
      setLoadingPlanes(false);
    }
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    if (!selectedPlanId) {
      toast.error('Selecciona un plan o servicio.');
      return;
    }
    const planElegido = planesDisponibles.find((x) => x.id === selectedPlanId);
    if (!planElegido) return;

    setSaving(true);
    try {
      const montoClp = parseInt(montoCustom.replace(/\D/g, ''), 10) || 0;

      const sesionesUsadasIniciales = abonarEvaluacion ? 2 : 1;

      const payload = {
        paciente_id: paciente.id,
        plan_id: planElegido.id,
        catalogo_plan_id: planElegido.id,
        nombre_plan: planElegido.nombre,
        sesiones_totales: planElegido.sesiones || 1,
        sesiones_usadas: sesionesUsadasIniciales,
        monto_clp: montoClp,
        estado_pago: decision === 'pagar_ahora' ? 'pagado' : 'pendiente',
        fecha_compra: getChileanDate(),
        metodo_pago: decision === 'pagar_ahora' ? metodoPago : null,
        numero_boleta: numeroBoleta || null,
        notas: abonarEvaluacion ? 'Plan contratado con abono de evaluación previa ($28.000)' : null,
        estado: 'activo'
      };

      const { error } = await supabase.from('compras_planes').insert([payload]);
      if (error) throw error;

      toast.success(decision === 'pagar_ahora' ? 'Cobro y plan registrados exitosamente' : 'Plan registrado y dejado pendiente de pago');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Ocurrió un error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>{motivo === 'plan_completado' ? 'Plan Finalizado' : 'Atención sin Plan'}</DialogTitle>
        <DialogDescription>
          El paciente <strong>{paciente?.nombre_completo}</strong> requiere un nuevo plan o cobro de sesión.
        </DialogDescription>
      </DialogHeader>
      
      <DialogBody className="space-y-6 pt-4">
        {loadingPlanes ? (
          <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
        ) : (
          <>
            {/* Paso 1 */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Paso 1: Venta / Asignación</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Plan o Servicio</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handleSeleccionarPlan(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="" disabled>Seleccione un plan o servicio...</option>
                  {planesDisponibles.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} — ${plan.precio?.toLocaleString('es-CL')} ({plan.sesiones} ses.)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Monto Final (CLP)</label>
                <Input 
                  type="number" 
                  value={montoCustom} 
                  onChange={(e) => setMontoCustom(e.target.value)} 
                  className="font-bold text-blue-700" 
                />
              </div>

              {selectedPlanId && (planesDisponibles.find((x) => x.id === selectedPlanId)?.sesiones > 1) && (
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={abonarEvaluacion}
                      onChange={(e) => {
                        const check = e.target.checked;
                        setAbonarEvaluacion(check);
                        const plan = planesDisponibles.find((x) => x.id === selectedPlanId);
                        const precioBase = plan?.precio || 0;
                        const valorAbono = check ? 28000 : 0;
                        setMontoCustom(Math.max(0, precioBase - valorAbono).toString());
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-blue-900">
                      Abonar Evaluación Inicial ya pagada (-$28.000 CLP)
                    </span>
                  </label>
                  <p className="text-[11px] text-blue-700 pl-6">
                    Resta $28.000 al total a cobrar y computa la evaluación como la 1ª sesión del tratamiento.
                  </p>
                </div>
              )}
            </div>

            {/* Paso 2 */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Paso 2: Decisión de Cobro</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecision('pagar_ahora')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    decision === 'pagar_ahora' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 mb-2 ${decision === 'pagar_ahora' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${decision === 'pagar_ahora' ? 'text-emerald-700' : 'text-slate-600'}`}>Cobrar Ahora</span>
                </button>
                <button
                  onClick={() => setDecision('pendiente')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    decision === 'pendiente' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Clock className={`w-6 h-6 mb-2 ${decision === 'pendiente' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${decision === 'pendiente' ? 'text-amber-700' : 'text-slate-600'}`}>Pendiente de Pago</span>
                </button>
              </div>

              {decision === 'pagar_ahora' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Medio de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Transbank">Transbank (Débito/Crédito)</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">N° Boleta (Opcional)</label>
                    <Input 
                      placeholder="Ej: 12345" 
                      value={numeroBoleta} 
                      onChange={(e) => setNumeroBoleta(e.target.value)}
                      className="h-9 bg-white" 
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogBody>
      
      <DialogFooter className="bg-slate-50/80 p-4 mt-2 -mx-6 -mb-6 border-t border-slate-200/60 rounded-b-lg">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={saving || loadingPlanes} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
          {saving ? 'Guardando...' : (decision === 'pagar_ahora' ? 'Confirmar y Cobrar' : 'Guardar y Dejar Pendiente')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
