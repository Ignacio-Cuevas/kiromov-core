'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Patient, Plan, PaymentMethod, PaymentStatus, Sale } from '@/types/clinical';
import { createSale } from '@/actions/sales';
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
  DollarSign,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface SaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPatient?: Patient | null;
  onSaleCompleted?: (sale: Sale) => void;
}

export function SaleModal({
  open,
  onOpenChange,
  initialPatient,
  onSaleCompleted,
}: SaleModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Form Fields
  const [concept, setConcept] = useState('');
  const [sessionsQuantity, setSessionsQuantity] = useState<number>(4);
  const [totalAmountCLP, setTotalAmountCLP] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Load plans
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

      // Load patients
      getPatients().then((data) => {
        setPatients(data);
      });

      if (initialPatient) {
        setSelectedPatientId(initialPatient.id);
        setPatientSearch(initialPatient.full_name);
      } else {
        setSelectedPatientId('');
        setPatientSearch('');
      }

      setPaymentMethod('transfer');
      setPaymentStatus('paid');
      setNotes('');
    }
  }, [open, initialPatient]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setConcept(plan.name);
      setSessionsQuantity(plan.sessions_count);
      setTotalAmountCLP(plan.price_clp);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase().trim();
    const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
    const qClean = q.replace(/[^0-9kK]/g, '');
    return (
      p.full_name.toLowerCase().includes(q) ||
      (qClean.length >= 2 && rutClean.includes(qClean)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId) {
      toast.error('Por favor selecciona el paciente destinatario.');
      return;
    }

    if (!concept.trim()) {
      toast.error('El concepto o servicio es obligatorio.');
      return;
    }

    if (totalAmountCLP < 0) {
      toast.error('El monto total no puede ser negativo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createSale({
        patient_id: selectedPatientId,
        plan_id: selectedPlanId || null,
        concept: concept.trim(),
        sessions_quantity: sessionsQuantity,
        total_amount_clp: totalAmountCLP,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || null,
      });

      if (result.success && result.data) {
        toast.success('¡Venta registrada con éxito!', {
          description: `${result.data.concept} — ${formatCLP(result.data.total_amount_clp)} (${result.data.sessions_quantity} sesiones asignadas)`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
        onSaleCompleted?.(result.data);
        onOpenChange(false);
      } else {
        toast.error('Error al registrar la venta: ' + (result.error || ''));
      }
    } catch (err: any) {
      toast.error('Error de conexión al procesar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Registrar Venta / Asignar Sesiones
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra el cobro y añade automáticamente las sesiones al saldo del paciente.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* 1. Selector de Paciente */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-blue-600" />
            1. Paciente Destinatario
          </span>

          {initialPatient ? (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-sm font-bold text-slate-900 block">
                  {initialPatient.full_name}
                </strong>
                <span className="text-xs text-slate-500 font-mono">
                  RUT: {formatRut(initialPatient.rut)}
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                Saldo: {initialPatient.remaining_sessions || 0} sesiones
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar paciente por Nombre o RUT..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9 bg-white rounded-xl text-sm"
                />
              </div>

              <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {filteredPatients.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setPatientSearch(p.full_name);
                    }}
                    className={`w-full text-left p-2 text-xs transition-colors flex items-center justify-between ${
                      selectedPatientId === p.id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{p.full_name}</span>
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
        </div>

        {/* 2. Selector de Plan y Precio */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            2. Servicio y Cantidad de Sesiones
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Catálogo de Planes</label>
              <select
                value={selectedPlanId}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} — {formatCLP(pl.price_clp)} ({pl.sessions_count} ses.)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Sesiones a Asignar <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                max={50}
                value={sessionsQuantity}
                onChange={(e) => setSessionsQuantity(parseInt(e.target.value, 10) || 0)}
                className="bg-white rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Monto Total a Cobrar (CLP) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step={1000}
                value={totalAmountCLP}
                onChange={(e) => setTotalAmountCLP(parseInt(e.target.value, 10) || 0)}
                className="bg-white rounded-xl text-sm font-bold text-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* 3. Medio de Pago y Estado */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-purple-600" />
            3. Método y Estado del Cobro
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="transfer">Transferencia Bancaria</option>
                <option value="card">Débito / Crédito (Transbank)</option>
                <option value="cash">Efectivo</option>
                <option value="agreement">Convenio Institucional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Estado de Pago</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="paid">✓ Pagado (Cobrado)</option>
                <option value="pending">⏳ Pendiente de Pago</option>
                <option value="partial">🌓 Parcial / Cuotas</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Observaciones / N° Comprobante (Opcional)
              </label>
              <Input
                placeholder="Ej: Transferencia Banco Estado comprobante #109238"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Procesando...' : 'Confirmar y Asignar Sesiones'}</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default SaleModal;
