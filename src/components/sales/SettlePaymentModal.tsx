'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getChileanDate } from '@/lib/utils';

interface SettlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planEnUso: any; // El plan que está pendiente
  onSuccess?: () => void;
}

export function SettlePaymentModal({ isOpen, onClose, planEnUso, onSuccess }: SettlePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentDate, setPaymentDate] = useState(() => getChileanDate());
  const [boletaNumber, setBoletaNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montoPagaHoy, setMontoPagaHoy] = useState<number>(0);

  // Initialize montoPagaHoy when modal opens
  React.useEffect(() => {
    if (planEnUso && isOpen) {
      const valorTotal = planEnUso.valor_total ?? 0;
      setMontoPagaHoy(planEnUso.saldo_pendiente ?? valorTotal);
    }
  }, [planEnUso, isOpen]);

  if (!isOpen || !planEnUso) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    if (!supabase) return;

    e.preventDefault();
    
    if (!boletaNumber.trim()) {
      toast.error('El N° de Boleta es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const boletaClean = boletaNumber.trim();

      const valorTotal = planEnUso.valor_total ?? 0;
      const montoPagadoAnterior = planEnUso.monto_pagado ?? 0;
      const saldoPendienteAnterior = planEnUso.saldo_pendiente ?? valorTotal;
      
      const nuevoMontoPagado = montoPagadoAnterior + Number(montoPagaHoy);
      const nuevoSaldoPendiente = Math.max(0, valorTotal - nuevoMontoPagado);
      
      let nuevoEstadoPago = 'pendiente';
      if (nuevoSaldoPendiente <= 0) nuevoEstadoPago = 'pagado';
      else if (nuevoMontoPagado > 0) nuevoEstadoPago = 'parcial';

      // 1. Update in compras_planes
      const { error: cpError } = await supabase
        .from('compras_planes')
        .update({
          estado_pago: nuevoEstadoPago,
          metodo_pago: paymentMethod,
          monto_pagado: nuevoMontoPagado,
          saldo_pendiente: nuevoSaldoPendiente,
          numero_boleta: boletaClean,
          notas: notes.trim() ? notes.trim() : null,
          observaciones: notes.trim() ? notes.trim() : null,
          fecha_compra: paymentDate
        })
        .eq('id', planEnUso.id);

      if (cpError) throw new Error(cpError.message);

      // 2. Register payment in pagos_pacientes
      const { error: ppError } = await supabase
        .from('pagos_pacientes')
        .insert([{
          paciente_id: planEnUso.paciente_id,
          plan_id: planEnUso.id,

          monto: Number(montoPagaHoy),
          metodo_pago: paymentMethod,
          fecha: new Date().toISOString(),
          notas: notes.trim() ? notes.trim() : null,
          numero_boleta: boletaClean,
          comprobante: boletaClean
        }]);

      if (ppError) console.warn('Error insertando en pagos_pacientes', ppError);

      toast.success('Cobro registrado exitosamente');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(`Error al registrar cobro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorTotalPlan = planEnUso.valor_total ?? 0;
  const saldoPendienteActual = planEnUso.saldo_pendiente ?? valorTotalPlan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-lg flex flex-col bg-slate-50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Registrar Cobro / Pago de Plan</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Liquidación de deuda o abono parcial</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Plan a Liquidar:</p>
                <p className="text-sm font-bold text-slate-800">{planEnUso.nombre_plan}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Valor Total:</p>
                <p className="text-sm font-bold text-slate-800">${valorTotalPlan.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Saldo Pendiente:</p>
                <p className="text-sm font-bold text-rose-600">${saldoPendienteActual.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                DETALLES DEL PAGO
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto que Paga Hoy (CLP) *</label>
                <input
                  type="text"
                  required
                  value={montoPagaHoy || ""}
                  onChange={(e) => {
                    const val = Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0;
                    setMontoPagaHoy(val > saldoPendienteActual ? saldoPendienteActual : val);
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-lg font-black text-emerald-600 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta_debito">Tarjeta Débito</option>
                  <option value="tarjeta_credito">Tarjeta Crédito</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      Fecha de Pago
                    </span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      N° de Boleta Electrónica *
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 18037"
                    value={boletaNumber}
                    onChange={(e) => setBoletaNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
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
