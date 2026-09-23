'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getChileanDate } from '@/lib/utils';

interface AssignTreatmentModalProps {
  isOpen: boolean;
  paciente: any;
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

export function AssignTreatmentModal({ isOpen, paciente, onClose, onSuccess }: AssignTreatmentModalProps) {
  const supabase = createClient();
  const [planesDisponibles, setPlanesDisponibles] = useState<any[]>(CATALOGO_RESPALDO);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [montoCustom, setMontoCustom] = useState<string>('');
  const [sesionesCustom, setSesionesCustom] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      cargarCatalogo();
    }
  }, [isOpen]);

  const handleSeleccionarPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const planEncontrado = planesDisponibles.find(p => p.id === planId);
    if (planEncontrado) {
      if (planEncontrado.id === 'personalizado') {
        setMontoCustom(''); // Limpiar para obligar a ingresar el monto acordado
      } else {
        setMontoCustom(planEncontrado.precio ? planEncontrado.precio.toString() : '');
      }
      setSesionesCustom(planEncontrado.sesiones || 1);
    }
  };

  const cargarCatalogo = async () => {
    if (!supabase) return;
    setLoadingPlanes(true);
    try {
      // Intentar consultar catalogo_planes
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

    const montoClp = parseInt(String(montoCustom).replace(/\D/g, ''), 10) || 0;
    if (montoClp <= 0) {
      toast.error('Por favor ingresa un monto final acordado válido (mayor a $0).');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        paciente_id: paciente.id,
        plan_id: planElegido.id || null,
        plan_id_ref: planElegido.id || null,
        catalogo_plan_id: planElegido.id || null,
        nombre_plan: planElegido.id === 'personalizado' ? 'Plan Personalizado / Especial' : (planElegido.nombre || 'Plan Kinésico'),
        plan_nombre: planElegido.id === 'personalizado' ? 'Plan Personalizado / Especial' : (planElegido.nombre || 'Plan Kinésico'),
        sesiones_totales: Number(sesionesCustom) || 1,
        total_sesiones: Number(sesionesCustom) || 1,
        sesiones_usadas: 0,
        monto_clp: montoClp,
        monto_total: montoClp,
        valor_total: montoClp,
        precio_base: montoClp,
        total_final_clp: montoClp,
        metodo_pago: null,
        estado_pago: 'pendiente',
        fecha_compra: getChileanDate(),
        numero_boleta: null,
        estado: 'activo',
        created_at: new Date().toISOString()
      };

      let { error } = await supabase.from('compras_planes').insert([payload]);
      if (error) {
        delete payload.valor_total;
        delete payload.monto_total;
        delete payload.precio_base;
        delete payload.total_final_clp;
        const retry = await supabase.from('compras_planes').insert([payload]);
        if (retry.error) {
          toast.error('Error al asignar plan: ' + retry.error.message);
          return;
        }
      }

      toast.success('Tratamiento asignado exitosamente (Pendiente de pago)');
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
        <DialogTitle>Asignar Tratamiento / Plan</DialogTitle>
        <DialogDescription>
          Asigna un nuevo plan a <strong>{paciente?.nombre_completo}</strong>. El cobro quedará como pendiente.
        </DialogDescription>
      </DialogHeader>
      
      <DialogBody className="space-y-4 pt-4">
        {loadingPlanes ? (
          <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Plan o Servicio Oficial</label>
              <select
                value={selectedPlanId}
                onChange={(e) => handleSeleccionarPlan(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="" disabled>Seleccione un plan...</option>
                {planesDisponibles.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} — ${plan.precio?.toLocaleString('es-CL')} ({plan.sesiones} ses.)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">N° de Sesiones</label>
                <Input 
                  type="number" 
                  min="1"
                  value={sesionesCustom} 
                  onChange={(e) => setSesionesCustom(parseInt(e.target.value) || 1)} 
                  className="font-bold bg-white" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Monto Final Acordado (CLP)</span>
                  {selectedPlanId === 'personalizado' && (
                    <span className="text-[10px] text-amber-600 font-semibold uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Obligatorio
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <Input 
                    type="number" 
                    min="1"
                    required
                    placeholder="Ej: 80000"
                    value={montoCustom} 
                    onChange={(e) => setMontoCustom(e.target.value)} 
                    className={`pl-7 font-bold text-blue-700 bg-white ${selectedPlanId === 'personalizado' && (!montoCustom || parseInt(montoCustom) <= 0) ? 'border-amber-400 ring-2 ring-amber-200/50' : ''}`} 
                  />
                </div>
                {selectedPlanId === 'personalizado' && (!montoCustom || parseInt(montoCustom) <= 0) && (
                  <p className="text-[11px] text-amber-600 font-medium">Ingresa el valor pactado con el paciente (no puede ser $0).</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogBody>
      
      <DialogFooter className="bg-slate-50/80 p-4 mt-2 -mx-6 -mb-6 border-t border-slate-200/60 rounded-b-lg">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={saving || loadingPlanes} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
          {saving ? 'Asignando...' : 'Confirmar Asignación'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
