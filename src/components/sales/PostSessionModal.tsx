'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreditCard, Clock, Loader2 } from 'lucide-react';

interface PostSessionModalProps {
  isOpen: boolean;
  paciente: any;
  motivo: string; // 'plan_completado' | 'sin_plan'
  onClose: () => void;
  onSuccess: () => void;
}

export function PostSessionModal({ isOpen, paciente, motivo, onClose, onSuccess }: PostSessionModalProps) {
  const supabase = createClient();
  const [planesList, setPlanesList] = useState<any[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [montoCustom, setMontoCustom] = useState<string>('');
  const [decision, setDecision] = useState<'pagar_ahora' | 'pendiente'>('pagar_ahora');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [numeroBoleta, setNumeroBoleta] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPlanes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPlanId) {
      const p = planesList.find((x) => x.id === selectedPlanId);
      if (p) {
        setMontoCustom(p.precio.toString());
      }
    }
  }, [selectedPlanId, planesList]);

  const loadPlanes = async () => {
    if (!supabase) return;
    setLoadingPlanes(true);
    try {
      const { data, error } = await supabase.from('tarifario').select('*').order('nombre');
      if (error) throw error;
      setPlanesList(data || []);
      if (data && data.length > 0) {
        setSelectedPlanId(data[0].id);
      }
    } catch (err: any) {
      toast.error('Error al cargar tarifario: ' + err.message);
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
    const planElegido = planesList.find((x) => x.id === selectedPlanId);
    if (!planElegido) return;

    setSaving(true);
    try {
      const montoClp = parseInt(montoCustom.replace(/\D/g, ''), 10) || 0;

      const payload = {
        paciente_id: paciente.id,
        plan_id_ref: planElegido.id,
        nombre_plan: planElegido.nombre,
        sesiones_totales: planElegido.sesiones || 1,
        sesiones_usadas: 0,
        monto_clp: montoClp,
        estado_pago: decision === 'pagar_ahora' ? 'pagado' : 'pendiente',
        fecha_compra: new Date().toISOString().split('T')[0],
        metodo_pago: decision === 'pagar_ahora' ? metodoPago : null,
        numero_boleta: numeroBoleta || null,
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
                <label className="text-xs font-bold text-slate-700">Plan o Servicio</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm outline-none"
                >
                  <option value="" disabled>Seleccione un plan...</option>
                  {planesList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.sesiones} sesiones) - ${p.precio.toLocaleString('es-CL')}
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
