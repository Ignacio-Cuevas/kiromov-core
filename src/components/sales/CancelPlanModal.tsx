'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatCLP } from '@/lib/utils';
import { AlertTriangle, Trash2, CheckCircle2, DollarSign, Calculator } from 'lucide-react';

interface CancelPlanModalProps {
  isOpen: boolean;
  plan: any; // CompraPlan o plan de paciente
  patientName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelPlanModal({
  isOpen,
  plan,
  patientName,
  onClose,
  onSuccess,
}: CancelPlanModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<'adjust' | 'cancel_full'>('adjust');

  // Datos normalizados del plan
  const sesionesTotales = Number(plan?.sesiones_totales ?? plan?.total_sesiones ?? 1);
  const sesionesUsadas = Number(plan?.sesiones_usadas ?? plan?.sesiones_consumidas ?? 0);
  const nombrePlan = plan?.nombre_plan ?? plan?.plan_nombre ?? 'Plan Kinésico';
  const nombrePaciente = patientName || plan?.pacientes?.nombre_completo || 'el paciente';

  // Valor sugerido por sesión realizada ($28.000 si particular / standard, $25.000 si convenio)
  const esConvenio = nombrePlan.toLowerCase().includes('convenio');
  const valorUnitarioSugerido = esConvenio ? 25000 : 28000;
  const montoCalculadoInicial = Math.max(0, sesionesUsadas * valorUnitarioSugerido);

  const [montoAjustado, setMontoAjustado] = useState<number>(montoCalculadoInicial);
  const [motivo, setMotivo] = useState<string>('Paciente desiste de continuar el plan');

  useEffect(() => {
    if (plan) {
      const usadas = Number(plan.sesiones_usadas ?? plan.sesiones_consumidas ?? 0);
      const convenio = (plan.nombre_plan || '').toLowerCase().includes('convenio');
      const unitario = convenio ? 25000 : 28000;
      setMontoAjustado(Math.max(0, usadas * unitario));
      setModalMode(usadas === 0 ? 'cancel_full' : 'adjust');
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const handleConfirmar = async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      const planId = plan.id;

      if (modalMode === 'adjust') {
        // Opción 1: Ajustar a sesiones realizadas
        const { error } = await supabase
          .from('compras_planes')
          .update({
            nombre_plan: `Sesión Individual (${sesionesUsadas} realizada(s))`,
            sesiones_totales: Number(sesionesUsadas) || 1,
            total_sesiones: Number(sesionesUsadas) || 1,
            monto_clp: montoAjustado,
            valor_total: montoAjustado,
            estado: 'finalizado', // Cierra el plan
            notas: `Cancelación anticipada: paciente realizó ${sesionesUsadas} sesión(es). Se ajustó el cobro a ${formatCLP(montoAjustado)}. Motivo: ${motivo.trim() || 'No especificado'}.`,
            updated_at: new Date().toISOString()
          })
          .eq('id', planId);

        if (error) throw error;

        toast.success('Plan ajustado correctamente', {
          description: `Nuevo cobro fijado en ${formatCLP(montoAjustado)} por las ${sesionesUsadas} sesión(es) realizadas.`
        });
      } else {
        // Opción 2: Anular plan completo
        if (sesionesUsadas === 0) {
          // Si no usó sesiones, podemos anular o marcar cancelado con monto 0
          const { error } = await supabase
            .from('compras_planes')
            .update({
              monto_clp: 0,
              valor_total: 0,
              estado: 'cancelado',
              estado_pago: 'pagado', // Salda para que no aparezca como deuda
              notas: `Plan anulado por completo sin sesiones realizadas. Motivo: ${motivo.trim() || 'Error de asignación o desistimiento antes de iniciar'}.`,
              updated_at: new Date().toISOString()
            })
            .eq('id', planId);

        if (error) throw error;

        toast.success('Plan anulado por completo', {
          description: 'Se eliminó la deuda del paciente y el plan quedó cancelado.'
        });
      } else {
        // Si usó sesiones pero el profesional decide anularlo sin cobro
        const { error } = await supabase
          .from('compras_planes')
          .update({
            monto_clp: 0,
            valor_total: 0,
            estado: 'cancelado',
            estado_pago: 'pagado',
            notas: `Plan cancelado sin cobro adicional por criterio profesional (${sesionesUsadas} sesión(es) condonadas). Motivo: ${motivo.trim() || 'Condonación'}.`,
            updated_at: new Date().toISOString()
          })
          .eq('id', planId);

          if (error) throw error;

          toast.success('Plan cancelado y deuda condonada', {
            description: 'El plan quedó cancelado sin saldo pendiente.'
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error ajustando/cancelando plan:', err);
      toast.error(`Error al procesar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          Ajuste / Cancelación Anticipada de Plan
        </DialogTitle>
        <DialogDescription>
          Regularización de cobro y cierre de tratamiento para <strong>{nombrePaciente}</strong>.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4 pt-4">
        {/* Banner Informativo del Estado Actual */}
        <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-1">
          <p className="text-xs text-amber-900 leading-relaxed">
            El paciente <strong>{nombrePaciente}</strong> ha utilizado{' '}
            <strong className="text-slate-900 font-bold">{sesionesUsadas} sesión(es)</strong> de su plan de{' '}
            <strong>{sesionesTotales}</strong> (<em>{nombrePlan}</em>).
          </p>
          <p className="text-[11px] text-amber-800">
            Deuda original registrada: <strong className="font-mono">{formatCLP(plan.monto_clp || plan.valor_total || 0)}</strong>
          </p>
        </div>

        {/* Selector de Modalidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setModalMode('adjust')}
            className={`p-3 rounded-xl border text-left transition-all ${
              modalMode === 'adjust'
                ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <Calculator className="h-4 w-4 text-blue-600 shrink-0" />
              <span>1. Ajustar a Sesiones Realizadas</span>
            </div>
            <p className="text-[11px] font-normal text-slate-500 mt-1">
              Cobra solo las {sesionesUsadas} sesión(es) asistidas y finaliza el plan.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setModalMode('cancel_full')}
            className={`p-3 rounded-xl border text-left transition-all ${
              modalMode === 'cancel_full'
                ? 'border-rose-600 bg-rose-50/70 text-rose-950 font-bold shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
              <span>2. Anular Plan Completo</span>
            </div>
            <p className="text-[11px] font-normal text-slate-500 mt-1">
              {sesionesUsadas === 0
                ? 'Elimina la deuda por completo (plan sin uso previo).'
                : 'Cancela el plan y condona cualquier cobro pendiente.'}
            </p>
          </button>
        </div>

        {/* Configuración según Modalidad Seleccionada */}
        {modalMode === 'adjust' ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Monto final a cobrar por las {sesionesUsadas} sesión(es) realizadas (CLP):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <Input
                type="number"
                step="1000"
                min="0"
                value={montoAjustado}
                onChange={(e) => setMontoAjustado(Number(e.target.value))}
                className="pl-8 text-base font-bold text-emerald-700 font-mono"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Sugerido ({sesionesUsadas} × {formatCLP(valorUnitarioSugerido)}):</span>
              <button
                type="button"
                onClick={() => setMontoAjustado(sesionesUsadas * valorUnitarioSugerido)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Aplicar {formatCLP(sesionesUsadas * valorUnitarioSugerido)}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
            <p className="font-bold">⚠️ Consecuencia de Anular Plan:</p>
            <p className="text-[11px] leading-relaxed">
              El plan quedará en estado <strong>Cancelado</strong> y el monto adeudado pasará inmediatamente a <strong>$0 CLP</strong>.
              Desaparecerá de las cuentas por cobrar en <em>Quién Debe</em>.
            </p>
          </div>
        )}

        {/* Motivo de la cancelación / ajuste */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Motivo u observación del ajuste (Opcional):
          </label>
          <Input
            type="text"
            placeholder="Ej: Paciente viaja / cambio de prioridades / alta precoz"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="text-xs"
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="text-xs font-semibold"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmar}
          disabled={loading}
          className={`text-xs font-bold text-white ${
            modalMode === 'adjust'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {loading ? 'Procesando...' : modalMode === 'adjust' ? '✓ Confirmar Ajuste de Cobro' : '✕ Anular Plan Definitivamente'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default CancelPlanModal;
