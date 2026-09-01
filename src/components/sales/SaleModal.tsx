'use client';

import React, { useState, useEffect } from 'react';
import { Patient, Plan, Sale } from '@/types/clinical';
import { createClient } from '@/utils/supabase/client';
import { createSale, settlePendingPlan } from '@/actions/sales';
import { getPlans } from '@/actions/plans';
import { getPatients } from '@/actions/patients';
import { formatCLP, formatRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ShoppingCart,
  User,
  Layers,
  CreditCard,
  CheckCircle2,
  Search,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SaleModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  initialPatient?: Patient | any | null;
  selectedPatient?: Patient | any | null;
  onSaleCompleted?: (sale: Sale | any) => void;
  onSuccess?: () => void;
}

export function SaleModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  initialPatient,
  selectedPatient,
  onSaleCompleted,
  onSuccess,
}: SaleModalProps) {
  const isModalOpen = isOpen ?? open ?? false;

  const handleCloseModal = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const supabase = createClient();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Mode: 'new_sale' | 'settle_pending'
  const [modalMode, setModalMode] = useState<'new_sale' | 'settle_pending'>('new_sale');
  const [pendingPlan, setPendingPlan] = useState<any | null>(null);

  // Form Fields
  const [concept, setConcept] = useState('');
  const [sessionsQuantity, setSessionsQuantity] = useState<number>(4);
  const [totalAmountCLP, setTotalAmountCLP] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<string>('transferencia');
  const [paymentStatus, setPaymentStatus] = useState<string>('pagado');
  const [boletaNumber, setBoletaNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPatientProp = selectedPatient || initialPatient;

  // Cargar pacientes y planes
  useEffect(() => {
    if (isModalOpen) {
      getPlans().then((data) => {
        setPlans(data);
        const active = data.filter((p) => p.is_active);
        if (active.length > 0) {
          const first = active[0];
          setSelectedPlanId(first.id);
          setConcept(first.name);
          setSessionsQuantity(first.sessions_count);
          setTotalAmountCLP(first.price_clp);
        }
      });

      getPatients().then((data) => {
        setPatients(data);
      });

      if (targetPatientProp) {
        setSelectedPatientId(targetPatientProp.id);
        setPatientSearch(
          targetPatientProp.full_name || targetPatientProp.nombre_completo || ''
        );
      } else {
        setSelectedPatientId('');
        setPatientSearch('');
      }

      setModalMode('new_sale');
      setPendingPlan(null);
      setPaymentMethod('transferencia');
      setPaymentStatus('pagado');
      setBoletaNumber('');
      setNotes('');
    }
  }, [isModalOpen, targetPatientProp]);

  // Detectar si el paciente seleccionado tiene un plan con cobro pendiente
  useEffect(() => {
    const currentId = selectedPatientId || targetPatientProp?.id;
    if (!currentId || !supabase) {
      setPendingPlan(null);
      return;
    }

    supabase
      .from('compras_planes')
      .select('*')
      .eq('paciente_id', currentId)
      .order('fecha_compra', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const foundPending = data.find((p: any) => {
            const st = (p.estado_pago || '').toLowerCase().trim();
            return st.includes('pendiente') || st === 'pending' || st === 'unpaid';
          });
          setPendingPlan(foundPending || null);
        } else {
          setPendingPlan(null);
        }
      });
  }, [selectedPatientId, targetPatientProp, supabase]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    if (planId === 'custom') {
      setConcept('');
      setSessionsQuantity(4);
      setTotalAmountCLP(100000);
    } else {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        setConcept(plan.name);
        setSessionsQuantity(plan.sessions_count);
        setTotalAmountCLP(plan.price_clp);
      }
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase().trim();
    const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
    const qClean = q.replace(/[^0-9kK]/g, '');
    return (
      (p.full_name || p.nombre_completo || '').toLowerCase().includes(q) ||
      (qClean.length >= 2 && rutClean.includes(qClean)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const selectedPatientObj =
    patients.find((p) => p.id === selectedPatientId) || targetPatientProp;

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId && !selectedPatientObj?.id) {
      toast.error('Por favor selecciona el paciente destinatario.');
      return;
    }

    const patientId = selectedPatientId || selectedPatientObj?.id;
    const totalSessions = Number(sessionsQuantity) || 1;
    const finalAmount =
      parseInt(String(totalAmountCLP).replace(/\D/g, ''), 10) || 0;

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    const planName =
      concept.trim() || selectedPlan?.name || 'Plan de Kinesiología';
    const cleanBoleta = boletaNumber?.trim() || null;

    if (!planName) {
      toast.error('El concepto o servicio es obligatorio.');
      return;
    }

    if (finalAmount < 0) {
      toast.error('El monto total no puede ser negativo.');
      return;
    }

    setIsSubmitting(true);

    try {
      // MODO 1: Regularizar / Cobrar Plan Pendiente Existente
      if (modalMode === 'settle_pending' && pendingPlan?.id) {
        const settleResult = await settlePendingPlan({
          plan_id: pendingPlan.id,
          payment_method: paymentMethod,
          numero_boleta: cleanBoleta,
          monto_clp: finalAmount,
          notes: notes.trim() || pendingPlan.notas || null,
        });

        if (settleResult.success) {
          toast.success('¡Cobro registrado con éxito! Plan marcado como pagado.', {
            description: `${pendingPlan.nombre_plan} — ${formatCLP(finalAmount)}${cleanBoleta ? ` | Boleta N° ${cleanBoleta}` : ''}`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });

          onSuccess?.();
          onSaleCompleted?.({
            id: pendingPlan.id,
            patient_id: patientId,
            concept: pendingPlan.nombre_plan,
            sessions_quantity: pendingPlan.total_sesiones,
            total_amount_clp: finalAmount,
            payment_method: paymentMethod as any,
            payment_status: 'paid',
          });

          handleCloseModal();
          return;
        } else {
          toast.error(settleResult.error || 'Error al regularizar el cobro');
          return;
        }
      }

      // MODO 2: Crear Nueva Venta de Plan
      const actionMethod: 'transfer' | 'card' | 'cash' | 'agreement' =
        paymentMethod === 'tarjeta'
          ? 'card'
          : paymentMethod === 'efectivo'
          ? 'cash'
          : paymentMethod === 'convenio'
          ? 'agreement'
          : 'transfer';

      const actionStatus: 'paid' | 'pending' | 'partial' =
        paymentStatus === 'pendiente' ? 'pending' : 'paid';

      const actionRes = await createSale({
        patient_id: patientId,
        plan_id: selectedPlanId !== 'custom' ? selectedPlanId : null,
        concept: planName,
        sessions_quantity: totalSessions,
        total_amount_clp: finalAmount,
        payment_method: actionMethod,
        payment_status: actionStatus,
        numero_boleta: cleanBoleta,
        receipt_number: cleanBoleta,
        notes: notes.trim() || null,
      });

      if (actionRes.success && actionRes.data) {
        toast.success('¡Venta registrada y sesiones asignadas con éxito!', {
          description: `${planName} — ${formatCLP(finalAmount)} (${totalSessions} sesiones asignadas)${cleanBoleta ? ` | Boleta N° ${cleanBoleta}` : ''}`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        onSuccess?.();
        onSaleCompleted?.(actionRes.data);
        handleCloseModal();
      } else {
        toast.error(actionRes.error || 'No se pudo registrar la venta en Supabase');
      }
    } catch (err: any) {
      console.error('Error al registrar venta/cobro:', err);
      toast.error(err?.message || 'Error de conexión al procesar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Fijo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 border border-emerald-100 shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                {modalMode === 'settle_pending'
                  ? 'Registrar Cobro de Plan Adeudado'
                  : 'Registrar Venta / Cobro de Plan'}
              </h3>
              <p className="text-xs text-slate-500">
                {modalMode === 'settle_pending'
                  ? 'Regulariza el pago y asigna número de boleta al plan existente.'
                  : 'Asigna saldo de sesiones al paciente y registra el ingreso contable.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={handleConfirmSale} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Sección 1: Paciente Destinatario */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-600" />
                1. PACIENTE DESTINATARIO
              </span>

              {targetPatientProp ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">
                      {targetPatientProp.full_name || targetPatientProp.nombre_completo}
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      RUT: {formatRut(targetPatientProp.rut)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                    Saldo actual: {targetPatientProp.remaining_sessions || targetPatientProp.sesiones_restantes || 0} ses.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente por Nombre o RUT..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredPatients.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(p.full_name || p.nombre_completo || '');
                        }}
                        className={`w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between ${
                          selectedPatientId === p.id
                            ? 'bg-blue-50 font-bold text-blue-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="block font-semibold">{p.full_name || p.nombre_completo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{formatRut(p.rut)}</span>
                        </div>
                        {selectedPatientId === p.id && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerta si el paciente tiene cobro pendiente */}
              {pendingPlan && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="text-amber-900 block font-bold">
                        ⚠️ Cobro Pendiente Detectado:
                      </strong>
                      <span className="text-amber-800">
                        {pendingPlan.nombre_plan} ({formatCLP(pendingPlan.total_final_clp ?? pendingPlan.valor_total ?? pendingPlan.monto_clp ?? 0)})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalMode === 'settle_pending') {
                        setModalMode('new_sale');
                      } else {
                        setModalMode('settle_pending');
                        setConcept(pendingPlan.nombre_plan);
                        setSessionsQuantity(pendingPlan.total_sesiones || pendingPlan.sesiones_totales || 4);
                        setTotalAmountCLP(pendingPlan.total_final_clp ?? pendingPlan.valor_total ?? pendingPlan.monto_clp ?? 0);
                        setBoletaNumber(pendingPlan.numero_boleta || '');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modalMode === 'settle_pending'
                        ? 'bg-slate-800 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                    }`}
                  >
                    {modalMode === 'settle_pending' ? 'Cambiar a Nueva Venta' : 'Regularizar Pago'}
                  </button>
                </div>
              )}
            </div>

            {/* Sección 2: Plan y Precio */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                2. SERVICIO Y CANTIDAD DE SESIONES
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modalMode !== 'settle_pending' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Seleccionar Tarifa del Catálogo
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handleSelectPlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    >
                      {plans.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} — {formatCLP(pl.price_clp)} ({pl.sessions_count} ses.)
                        </option>
                      ))}
                      <option value="custom">✏️ Plan Personalizado / Ajuste Manual</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Glosa / Nombre del Plan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Plan 6 Sesiones Lumbar"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Sesiones a Asignar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={sessionsQuantity}
                    onChange={(e) =>
                      setSessionsQuantity(parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Monto Total a Cobrar (CLP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step={1000}
                    min={0}
                    required
                    value={totalAmountCLP}
                    onChange={(e) =>
                      setTotalAmountCLP(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-emerald-700 font-extrabold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: MEDIO Y ESTADO DE PAGO */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                3. MEDIO Y ESTADO DE PAGO
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Método de Pago
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado del Pago
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="pagado">✓ Pagado</option>
                    <option value="pendiente">⏳ Pendiente de Pago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    N° de Boleta / Documento Tributario (Opcional)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Para reembolso</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
          </div>

          {/* Footer Fijo con Botón Submit */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium text-sm transition-colors shadow-2xs disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {modalMode === 'settle_pending'
                      ? 'Confirmar Cobro de Plan'
                      : 'Confirmar y Asignar Sesiones'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaleModal;
