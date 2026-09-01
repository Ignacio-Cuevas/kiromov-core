'use client';

import React, { useState, useEffect } from 'react';
import { CompraPlan } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { formatCLP } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  DollarSign,
} from 'lucide-react';

interface PayPlanModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  plan: CompraPlan | any | null;
  patientName?: string;
  onSuccess?: () => void;
}

export function PayPlanModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  plan,
  patientName,
  onSuccess,
}: PayPlanModalProps) {
  const isModalOpen = isOpen ?? open ?? false;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const supabase = createClient();

  const [montoCobro, setMontoCobro] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string>('transferencia');
  const [boletaNumber, setBoletaNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (plan && isModalOpen) {
      const initialAmount =
        plan.total_final_clp ??
        plan.valor_total ??
        plan.monto_clp ??
        plan.precio_base ??
        0;
      setMontoCobro(initialAmount);
      setBoletaNumber(plan.numero_boleta || '');
      setNotes(plan.notas || '');

      const currentMethod = (plan.metodo_pago || plan.medio_pago || '').toLowerCase();
      if (currentMethod.includes('tarjeta') || currentMethod.includes('débito') || currentMethod.includes('card')) {
        setSelectedMethod('tarjeta');
      } else if (currentMethod.includes('efectivo') || currentMethod.includes('cash')) {
        setSelectedMethod('efectivo');
      } else if (currentMethod.includes('convenio') || currentMethod.includes('agreement')) {
        setSelectedMethod('convenio');
      } else {
        setSelectedMethod('transferencia');
      }
    }
  }, [plan, isModalOpen]);

  if (!isModalOpen || !plan) return null;

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalAmount = parseInt(String(montoCobro).replace(/\D/g, ''), 10) || 0;
    const cleanBoleta = boletaNumber?.trim() || null;
    const methodLabel =
      selectedMethod === 'tarjeta'
        ? 'Débito / Transbank'
        : selectedMethod === 'efectivo'
        ? 'Efectivo'
        : selectedMethod === 'convenio'
        ? 'Convenio'
        : 'Transferencia';

    try {
      if (supabase) {
        const { error } = await supabase
          .from('compras_planes')
          .update({
            estado_pago: 'Pagado',
            metodo_pago: selectedMethod,
            medio_pago: methodLabel,
            numero_boleta: cleanBoleta,
            monto_clp: finalAmount,
            valor_total: finalAmount,
            total_final_clp: finalAmount,
            notas: notes.trim() || plan.notas || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', plan.id);

        if (error) throw error;
      }

      toast.success('¡Pago registrado con éxito! Plan marcado como pagado.', {
        description: `${plan.nombre_plan} — ${formatCLP(finalAmount)}${cleanBoleta ? ` (Boleta N° ${cleanBoleta})` : ''}`,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error al registrar cobro:', err);
      toast.error(err?.message || 'No se pudo registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Fijo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-200 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                Registrar Cobro / Pago de Plan
              </h3>
              <p className="text-xs text-slate-500">
                {patientName ? `${patientName} • ` : ''}
                {plan.nombre_plan}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmPayment} className="flex-1 flex flex-col">
          <div className="p-6 space-y-4">
            {/* Resumen del Plan Adeudado */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  Cobro de Plan Pendiente
                </span>
                <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                  ⚠️ Pago Pendiente
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-semibold text-slate-800">
                  {plan.nombre_plan}
                </span>
                <span className="text-xl font-extrabold text-amber-700 font-mono">
                  {formatCLP(montoCobro)}
                </span>
              </div>
            </div>

            {/* Monto a Cobrar */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Monto Recibido / Cobrado (CLP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step={1000}
                min={0}
                required
                value={montoCobro}
                onChange={(e) => setMontoCobro(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-extrabold text-emerald-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Método de Pago */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Método de Pago <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Débito / Crédito (Transbank)</option>
                <option value="efectivo">Efectivo</option>
                <option value="convenio">Convenio Institucional</option>
              </select>
            </div>

            {/* N° de Boleta Tributaria */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  N° de Boleta / Documento Tributario (Opcional)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Para certificado Isapre</span>
              </label>
              <input
                type="text"
                placeholder="Ej: 14582"
                value={boletaNumber}
                onChange={(e) => setBoletaNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Observaciones / N° Comprobante (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Comprobante Transferencia Banco Estado #10294"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Footer Fijo */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registrando Pago...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PayPlanModal;
