'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface SettlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planEnUso: any; // El plan que está pendiente
  onSuccess?: () => void;
}

export function SettlePaymentModal({ isOpen, onClose, planEnUso, onSuccess }: SettlePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [boletaNumber, setBoletaNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !planEnUso) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    if (!supabase) return;

    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const boletaClean = boletaNumber.trim() ? boletaNumber.trim() : null;

      // 1. Update in compras_planes
      const { error: cpError } = await supabase
        .from('compras_planes')
        .update({
          estado_pago: 'pagado',
          metodo_pago: paymentMethod,
          numero_boleta: boletaClean,
          notas: notes.trim() ? notes.trim() : null,
          fecha_compra: new Date().toISOString().split('T')[0] // Set fecha as today or leave old? The prompt says "Fecha de Pago" so today makes sense
        })
        .eq('id', planEnUso.id);

      if (cpError) throw new Error(cpError.message);

      // 2. Update in patient_plans if exists
      const { error: ppError } = await supabase
        .from('patient_plans')
        .update({
          receipt_number: boletaClean
        })
        .eq('plan_name', planEnUso.nombre_plan)
        .eq('patient_id', planEnUso.paciente_id);

      if (ppError) {
        console.warn('patient_plans no encontrado o fallo secundario', ppError);
      }

      toast.success('Cobro registrado exitosamente');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(`Error al registrar cobro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-lg flex flex-col bg-slate-50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Registrar Cobro / Pago</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Liquidación de deuda activa</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Plan a Liquidar:</p>
              <p className="text-sm font-bold text-slate-800">{planEnUso.nombre_plan}</p>
              <p className="text-xs text-slate-600 mt-1">Monto Adeudado: <span className="font-bold text-emerald-700">${planEnUso.monto_clp?.toLocaleString('es-CL')}</span></p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                DETALLES DEL PAGO
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta">Débito / Crédito (Transbank)</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="convenio">Convenio Institucional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    N° de Boleta / Documento Tributario (Opcional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 14582"
                  value={boletaNumber}
                  onChange={(e) => setBoletaNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia Banco Estado"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium text-sm transition-colors shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Registrar Pago Final</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
