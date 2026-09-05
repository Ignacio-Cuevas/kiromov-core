'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AssignTreatmentModalProps {
  isOpen: boolean;
  paciente: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignTreatmentModal({ isOpen, paciente, onClose, onSuccess }: AssignTreatmentModalProps) {
  const supabase = createClient();
  const [planesList, setPlanesList] = useState<any[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [montoCustom, setMontoCustom] = useState<string>('');
  const [sesionesCustom, setSesionesCustom] = useState<number>(1);

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
        setSesionesCustom(p.sesiones || 1);
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
        sesiones_totales: sesionesCustom,
        sesiones_usadas: 0,
        monto_clp: montoClp,
        estado_pago: 'pendiente',
        fecha_compra: new Date().toISOString().split('T')[0],
        metodo_pago: null,
        numero_boleta: null,
        estado: 'activo'
      };

      const { error } = await supabase.from('compras_planes').insert([payload]);
      if (error) throw error;

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">N° de Sesiones</label>
                <Input 
                  type="number" 
                  value={sesionesCustom} 
                  onChange={(e) => setSesionesCustom(parseInt(e.target.value) || 1)} 
                  className="font-bold bg-white" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Monto Final Acordado (CLP)</label>
                <Input 
                  type="number" 
                  value={montoCustom} 
                  onChange={(e) => setMontoCustom(e.target.value)} 
                  className="font-bold text-blue-700 bg-white" 
                />
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
