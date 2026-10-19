'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { formatCLP, formatRut, getChileanDate } from '@/lib/utils';
import { getArancel, getCatalogoPlanesParaPaciente } from '@/lib/pricing';
import { toast } from 'sonner';
import {
  CreditCard,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Search,
  FileText,
  Loader2,
  AlertCircle,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export type CheckoutMode = 'plan' | 'deuda' | 'sesion';

export interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: CheckoutMode;
  paciente?: any | null;
  pacienteId?: string;
  deudaInfo?: {
    tipo?: 'plan' | 'cita';
    id?: string;
    plan_id?: string;
    cita_id?: string;
    concepto?: string;
    deudaTotal?: number;
    deuda?: number;
    valor_total?: number;
    monto_pagado?: number;
    fecha?: string;
    paciente_nombre?: string;
  } | null;
  planEnUso?: any | null;
  cita?: any | null;
  categoriaTarifa?: string | null;
}

export function PaymentCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode,
  paciente: initialPaciente,
  pacienteId: initialPacienteId,
  deudaInfo,
  planEnUso,
  cita,
  categoriaTarifa
}: PaymentCheckoutModalProps) {
  const supabase = createClient();

  // Determinar modo inicial de apertura según contexto
  const resolvedInitialMode = useMemo<CheckoutMode>(() => {
    if (initialMode) return initialMode;
    if (deudaInfo || planEnUso) return 'deuda';
    if (cita) {
      const p = cita.pacientes || cita.paciente;
      const tienePlanActivo = p?.plan_id && (p?.sesiones_restantes || 0) > 0;
      return tienePlanActivo ? 'sesion' : 'sesion';
    }
    return 'plan';
  }, [initialMode, deudaInfo, planEnUso, cita]);

  const [mode, setMode] = useState<CheckoutMode>(resolvedInitialMode);

  // Pacientes y Selección
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Planes de catálogo
  const [catalogPlans, setCatalogPlans] = useState<any[]>([]);
  const [selectedCatalogPlanId, setSelectedCatalogPlanId] = useState<string>('');

  // Planes pendientes del paciente actual (para modo B)
  const [pendingPlans, setPendingPlans] = useState<any[]>([]);
  const [selectedPendingPlanId, setSelectedPendingPlanId] = useState<string>('');

  // Form Fields Universales
  const [metodoPago, setMetodoPago] = useState<string>('Transferencia');
  const [numeroBoleta, setNumeroBoleta] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>(() => getChileanDate());
  const [notas, setNotas] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields: MODO A (Venta de Plan)
  const [planConcepto, setPlanConcepto] = useState('Plan Kinésico');
  const [planSesiones, setPlanSesiones] = useState<number>(6);
  const [planValorTotal, setPlanValorTotal] = useState<number>(145000);
  const [planModalidadPago, setPlanModalidadPago] = useState<'total' | 'parcial' | 'pendiente'>('total');
  const [planMontoAbono, setPlanMontoAbono] = useState<number>(145000);
  const [abonarEvaluacion, setAbonarEvaluacion] = useState(false);

  // Form Fields: MODO B (Abono / Deuda)
  const [deudaMontoTotal, setDeudaMontoTotal] = useState<number>(0);
  const [deudaMontoAPagar, setDeudaMontoAPagar] = useState<number>(0);
  const [deudaConcepto, setDeudaConcepto] = useState<string>('');

  // Form Fields: MODO C (Sesión Unitaria)
  const [sesionMonto, setSesionMonto] = useState<number>(28000);
  const [sesionEsFiada, setSesionEsFiada] = useState<boolean>(false);

  // Cargar catálogo de planes y pacientes si es necesario
  useEffect(() => {
    if (!isOpen) return;

    setMode(resolvedInitialMode);
    setMetodoPago('Transferencia');
    setNumeroBoleta('');
    setFechaPago(getChileanDate());
    setNotas('');
    setIsSubmitting(false);

    // Identificar paciente inicial
    const basePatient = initialPaciente || cita?.pacientes || cita?.paciente || null;
    const basePatientId = initialPacienteId || basePatient?.id || cita?.paciente_id || deudaInfo?.id || null;

    if (basePatient) {
      setSelectedPatient(basePatient);
      setPatientSearch(basePatient.nombre_completo || '');
    } else if (basePatientId && supabase) {
      supabase.from('pacientes').select('*').eq('id', basePatientId).single().then(({ data }) => {
        if (data) {
          setSelectedPatient(data);
          setPatientSearch(data.nombre_completo || '');
        }
      });
    } else {
      setSelectedPatient(null);
      setPatientSearch('');
    }

    // Cargar catálogo oficial
    if (supabase) {
      supabase
        .from('catalogo_planes')
        .select('*')
        .eq('activo', true)
        .order('precio_clp', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setCatalogPlans(data);
            const first = data[0];
            setSelectedCatalogPlanId(first.id);
            setPlanConcepto(first.nombre);
            setPlanSesiones(first.total_sesiones || 6);
            setPlanValorTotal(Number(first.precio_clp) || 145000);
            setPlanMontoAbono(Number(first.precio_clp) || 145000);
          } else {
            const fallback = getCatalogoPlanesParaPaciente(categoriaTarifa);
            setCatalogPlans(fallback.map(f => ({ id: f.id, nombre: f.nombre, total_sesiones: f.sesiones, precio_clp: f.precio })));
          }
        });

      supabase
        .from('pacientes')
        .select('id, nombre_completo, rut, telefono, prevision, categoria_tarifa')
        .order('nombre_completo', { ascending: true })
        .then(({ data }) => {
          if (data) setPatientsList(data);
        });
    }

    // Configurar tarifa para modo C
    const cat = categoriaTarifa || basePatient?.categoria_tarifa;
    const arancel = getArancel(cat);
    setSesionMonto(arancel.sesion_individual);
  }, [isOpen, resolvedInitialMode, initialPaciente, initialPacienteId, cita, categoriaTarifa, deudaInfo]);

  // Sincronizar planes pendientes del paciente para Modo B
  useEffect(() => {
    const pId = selectedPatient?.id || initialPacienteId;
    if (!pId || !supabase) return;

    // Si viene un planEnUso o deudaInfo explícito
    if (planEnUso) {
      const deuda = planEnUso.saldo_pendiente ?? (planEnUso.valor_total ?? 0);
      setDeudaConcepto(planEnUso.nombre_plan || 'Plan Kinésico');
      setDeudaMontoTotal(deuda);
      setDeudaMontoAPagar(deuda);
      setSelectedPendingPlanId(planEnUso.id);
      return;
    }

    if (deudaInfo) {
      const deuda = deudaInfo.deudaTotal ?? deudaInfo.deuda ?? deudaInfo.valor_total ?? 0;
      setDeudaConcepto(deudaInfo.concepto || (deudaInfo.tipo === 'cita' ? 'Sesión Kinésica' : 'Plan Kinésico'));
      setDeudaMontoTotal(deuda);
      setDeudaMontoAPagar(deuda);
      setSelectedPendingPlanId(deudaInfo.plan_id || deudaInfo.id || '');
      return;
    }

    // Buscar en BD compras_planes con saldo pendiente
    supabase
      .from('compras_planes')
      .select('*')
      .eq('paciente_id', pId)
      .eq('estado', 'activo')
      .gt('saldo_pendiente', 0)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPendingPlans(data);
          const first = data[0];
          setSelectedPendingPlanId(first.id);
          setDeudaConcepto(first.nombre_plan || 'Plan Kinésico');
          const deuda = first.saldo_pendiente ?? (first.valor_total ?? 0);
          setDeudaMontoTotal(deuda);
          setDeudaMontoAPagar(deuda);
        } else {
          setPendingPlans([]);
          setDeudaMontoTotal(0);
          setDeudaMontoAPagar(0);
        }
      });
  }, [selectedPatient, initialPacienteId, planEnUso, deudaInfo]);

  // Manejador de cambio de plan del catálogo (Modo A)
  const handleSelectCatalogPlan = (planId: string) => {
    setSelectedCatalogPlanId(planId);
    if (planId === 'custom') {
      setPlanConcepto('✨ Plan Personalizado a Medida');
      setPlanSesiones(6);
      return;
    }
    const found = catalogPlans.find(p => p.id === planId);
    if (found) {
      setPlanConcepto(found.nombre || found.nombre_plan);
      setPlanSesiones(found.total_sesiones || 6);
      const pr = Number(found.precio_clp || found.precio) || 145000;
      setPlanValorTotal(pr);
      if (planModalidadPago === 'total') setPlanMontoAbono(pr);
    }
  };

  // Manejador de cambio de plan pendiente (Modo B)
  const handleSelectPendingPlan = (planId: string) => {
    setSelectedPendingPlanId(planId);
    const found = pendingPlans.find(p => p.id === planId);
    if (found) {
      setDeudaConcepto(found.nombre_plan || 'Plan Kinésico');
      const deuda = found.saldo_pendiente ?? (found.valor_total ?? 0);
      setDeudaMontoTotal(deuda);
      setDeudaMontoAPagar(deuda);
    }
  };

  // Pacientes filtrados para búsqueda
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim() || selectedPatient) return [];
    const q = patientSearch.toLowerCase();
    return patientsList.filter(
      p =>
        (p.nombre_completo || '').toLowerCase().includes(q) ||
        (p.rut || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [patientsList, patientSearch, selectedPatient]);

  // SUBMIT CENTRALIZADO Y ATÓMICO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const patientId = selectedPatient?.id || initialPacienteId || cita?.paciente_id;
    if (!patientId) {
      toast.error('Debe seleccionar o vincular un paciente.');
      return;
    }

    const boletaLimpia = numeroBoleta.trim() || null;
    const cleanNotes = notas.trim();

    setIsSubmitting(true);

    try {
      // -------------------------------------------------------------
      // MODO A: VENTA DE PLAN
      // -------------------------------------------------------------
      if (mode === 'plan') {
        const total = Number(planValorTotal) || 0;
        let abonoHoy = 0;
        let saldoPendiente = total;
        let estadoPago = 'pendiente';

        if (planModalidadPago === 'total') {
          abonoHoy = total;
          saldoPendiente = 0;
          estadoPago = 'pagado';
        } else if (planModalidadPago === 'parcial') {
          abonoHoy = Math.min(total, Number(planMontoAbono) || 0);
          saldoPendiente = Math.max(0, total - abonoHoy);
          estadoPago = saldoPendiente === 0 ? 'pagado' : 'parcial';
        }

        const notasFinales = abonarEvaluacion
          ? `Plan contratado con abono de evaluación previa ($28.000)${cleanNotes ? ` - ${cleanNotes}` : ''}`
          : cleanNotes || null;

        // 1. Insertar en compras_planes
        const { data: newPlan, error: cpErr } = await supabase
          .from('compras_planes')
          .insert([
            {
              paciente_id: patientId,
              catalogo_plan_id: selectedCatalogPlanId !== 'custom' ? selectedCatalogPlanId : null,
              nombre_plan: planConcepto.trim() || 'Plan Kinésico',
              total_sesiones: Number(planSesiones) || 1,
              sesiones_usadas: 0,
              valor_total: total,
              monto_pagado: abonoHoy,
              saldo_pendiente: saldoPendiente,
              estado_pago: estadoPago,
              metodo_pago: metodoPago,
              numero_boleta: boletaLimpia,
              fecha_compra: fechaPago,
              estado: 'activo',
              notas: notasFinales
            }
          ])
          .select()
          .single();

        if (cpErr) throw cpErr;

        // 2. Si se pagó un monto hoy, registrar atómicamente en pagos_pacientes
        if (abonoHoy > 0) {
          const { error: ppErr } = await supabase.from('pagos_pacientes').insert([
            {
              paciente_id: patientId,
              plan_id: newPlan.id,
              monto: abonoHoy,
              metodo_pago: metodoPago,
              fecha: new Date().toISOString(),
              numero_boleta: boletaLimpia,
              comprobante: boletaLimpia,
              tipo_concepto: 'venta_plan',
              notas: `Pago inicial ${planConcepto}${boletaLimpia ? ` | Boleta: ${boletaLimpia}` : ''}`
            }
          ]);
          if (ppErr) console.warn('Error en pagos_pacientes:', ppErr.message);
        }

        toast.success(`¡Plan ${planConcepto} contratado exitosamente!`, {
          description: `Total: ${formatCLP(total)} | Abono: ${formatCLP(abonoHoy)}${saldoPendiente > 0 ? ` | Saldo: ${formatCLP(saldoPendiente)}` : ''}`
        });
      }

      // -------------------------------------------------------------
      // MODO B: ABONO / LIQUIDACIÓN DE DEUDA
      // -------------------------------------------------------------
      else if (mode === 'deuda') {
        const montoAbonado = Number(deudaMontoAPagar) || 0;
        if (montoAbonado <= 0) {
          toast.error('El monto a pagar debe ser mayor a $0.');
          setIsSubmitting(false);
          return;
        }

        const isCitaDeuda = deudaInfo?.tipo === 'cita' && deudaInfo?.id;

        if (isCitaDeuda) {
          // Regularizar deuda de cita individual
          const { error: cErr } = await supabase
            .from('citas_atenciones')
            .update({
              estado_pago: 'pagado',
              monto_cobrado: montoAbonado,
              metodo_pago: metodoPago
            })
            .eq('id', deudaInfo.id);

          if (cErr) throw cErr;

          // Registrar en pagos_pacientes
          const { error: ppErr } = await supabase.from('pagos_pacientes').insert([
            {
              paciente_id: patientId,
              cita_id: deudaInfo.id,
              monto: montoAbonado,
              metodo_pago: metodoPago,
              fecha: new Date().toISOString(),
              numero_boleta: boletaLimpia,
              comprobante: boletaLimpia,
              tipo_concepto: 'sesion_individual',
              notas: `Liquidación sesión pendiente${boletaLimpia ? ` | Boleta: ${boletaLimpia}` : ''}`
            }
          ]);
          if (ppErr) console.warn('Error en pagos_pacientes:', ppErr.message);
        } else {
          // Regularizar deuda de plan
          const targetPlanId = selectedPendingPlanId || deudaInfo?.plan_id || deudaInfo?.id || planEnUso?.id;
          if (!targetPlanId) {
            toast.error('No se especificó el plan a liquidar.');
            setIsSubmitting(false);
            return;
          }

          // Consultar estado actual del plan
          const { data: planData, error: fetchErr } = await supabase
            .from('compras_planes')
            .select('*')
            .eq('id', targetPlanId)
            .single();

          if (fetchErr) throw fetchErr;

          const valorTotal = planData.valor_total ?? 0;
          const montoPagadoAnterior = planData.monto_pagado ?? 0;
          const nuevoMontoPagado = montoPagadoAnterior + montoAbonado;
          const nuevoSaldoPendiente = Math.max(0, valorTotal - nuevoMontoPagado);
          const nuevoEstadoPago = nuevoSaldoPendiente <= 0 ? 'pagado' : 'parcial';

          // Actualizar compras_planes
          const { error: cpErr } = await supabase
            .from('compras_planes')
            .update({
              monto_pagado: nuevoMontoPagado,
              saldo_pendiente: nuevoSaldoPendiente,
              estado_pago: nuevoEstadoPago,
              metodo_pago: metodoPago,
              numero_boleta: boletaLimpia || planData.numero_boleta,
              updated_at: new Date().toISOString()
            })
            .eq('id', targetPlanId);

          if (cpErr) throw cpErr;

          // Insertar en pagos_pacientes
          const { error: ppErr } = await supabase.from('pagos_pacientes').insert([
            {
              paciente_id: patientId,
              plan_id: targetPlanId,
              monto: montoAbonado,
              metodo_pago: metodoPago,
              fecha: new Date().toISOString(),
              numero_boleta: boletaLimpia,
              comprobante: boletaLimpia,
              tipo_concepto: 'abono_plan',
              notas: `Abono a plan ${planData.nombre_plan || ''}${boletaLimpia ? ` | Boleta: ${boletaLimpia}` : ''}${cleanNotes ? ` | ${cleanNotes}` : ''}`
            }
          ]);
          if (ppErr) console.warn('Error en pagos_pacientes:', ppErr.message);
        }

        toast.success('¡Cobro de deuda registrado exitosamente!', {
          description: `Monto pagado: ${formatCLP(montoAbonado)}${boletaLimpia ? ` | Boleta: ${boletaLimpia}` : ''}`
        });
      }

      // -------------------------------------------------------------
      // MODO C: SESIÓN UNITARIA (BOX)
      // -------------------------------------------------------------
      else if (mode === 'sesion') {
        const montoUnitario = Number(sesionMonto) || 0;
        const estadoPagoCita = sesionEsFiada ? 'pendiente_pago' : 'pagado';
        const citaId = cita?.id || null;

        // Si hay cita vinculada, actualizar su estado a asistió y estado_pago
        if (citaId) {
          const { error: cErr } = await supabase
            .from('citas_atenciones')
            .update({
              estado: 'asistio',
              estado_pago: estadoPagoCita,
              monto_cobrado: montoUnitario,
              metodo_pago: sesionEsFiada ? null : metodoPago
            })
            .eq('id', citaId);

          if (cErr) throw cErr;
        }

        // Si se pagó hoy (no fiada), insertar en pagos_pacientes
        if (!sesionEsFiada && montoUnitario > 0) {
          const { error: ppErr } = await supabase.from('pagos_pacientes').insert([
            {
              paciente_id: patientId,
              cita_id: citaId,
              monto: montoUnitario,
              metodo_pago: metodoPago,
              fecha: new Date().toISOString(),
              numero_boleta: boletaLimpia,
              comprobante: boletaLimpia,
              tipo_concepto: 'sesion_individual',
              notas: `Sesión Individual Kinésica${boletaLimpia ? ` | Boleta: ${boletaLimpia}` : ''}${cleanNotes ? ` | ${cleanNotes}` : ''}`
            }
          ]);
          if (ppErr) console.warn('Error en pagos_pacientes:', ppErr.message);
        }

        toast.success(
          sesionEsFiada
            ? 'Atención registrada como pendiente de pago.'
            : '¡Sesión individual cobrada exitosamente!'
        );
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error procesando checkout:', err);
      toast.error(`Error al procesar cobro: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador especial: Descontar de plan activo directamente en Modo C
  const handleDescontarPlanActivo = async () => {
    if (!supabase || !cita) return;
    const p = cita.pacientes || cita.paciente || selectedPatient;
    const planId = p?.plan_id;
    if (!planId) return;

    setIsSubmitting(true);
    try {
      // 1. Actualizar cita
      await supabase
        .from('citas_atenciones')
        .update({
          estado: 'asistio',
          estado_pago: 'cubierto_por_plan'
        })
        .eq('id', cita.id);

      // 2. Incrementar sesiones usadas
      const usadas = (p.sesiones_usadas || 0) + 1;
      const totales = p.total_sesiones || 1;
      const estadoPlan = usadas >= totales ? 'finalizado' : 'activo';

      await supabase
        .from('compras_planes')
        .update({
          sesiones_usadas: usadas,
          estado: estadoPlan
        })
        .eq('id', planId);

      toast.success('Atención registrada y descontada del plan activo.', {
        description: `Sesión ${usadas} de ${totales}`
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error('Error al descontar del plan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pacienteDisplay = selectedPatient || cita?.pacientes || cita?.paciente;
  const tienePlanActivo = pacienteDisplay?.plan_id && (pacienteDisplay?.sesiones_restantes ?? 1) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Checkout Clínico Unificado</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Gestión unificada de ventas de planes, abonos a saldo y cobro de sesiones de box.
            </DialogDescription>
          </div>
        </div>

        {/* SELECTOR DE MODALIDAD (3 Zonas: AAS) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mt-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('plan')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'plan'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Venta de Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('deuda')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'deuda'
                ? 'bg-white text-amber-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Abono / Deuda</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('sesion')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'sesion'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sesión Unit.</span>
          </button>
        </div>
      </DialogHeader>

      <DialogBody className="space-y-4 py-4 max-h-[75vh] overflow-y-auto">
        <form onSubmit={handleSubmit} id="checkout-form" className="space-y-4">
          {/* 1. FICHA RESUMEN DEL PACIENTE */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
            {pacienteDisplay ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    {pacienteDisplay.nombre_completo?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {pacienteDisplay.nombre_completo}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                      <span>{pacienteDisplay.rut ? formatRut(pacienteDisplay.rut) : 'Sin RUT'}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">{pacienteDisplay.prevision || 'Particular'}</span>
                    </div>
                  </div>
                </div>

                {!initialPaciente && !cita && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Buscar Paciente:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Nombre o RUT del paciente..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-emerald-500"
                  />
                </div>

                {filteredPatients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100">
                    {filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.nombre_completo);
                        }}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{p.nombre_completo}</span>
                        <span className="font-mono text-slate-500">{formatRut(p.rut)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* MODO A: VENTA DE PLAN */}
          {/* ========================================================= */}
          {mode === 'plan' && (
            <div className="space-y-3.5 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Configuración del Plan
                </span>
                <span className="text-[11px] font-mono text-emerald-700">Modo A</span>
              </div>

              {/* Selector de Plan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plan o Tratamiento:
                </label>
                <select
                  value={selectedCatalogPlanId}
                  onChange={e => handleSelectCatalogPlan(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-emerald-500 cursor-pointer"
                >
                  {catalogPlans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || p.nombre_plan} ({p.total_sesiones || p.sesiones || 6} ses.) — {formatCLP(p.precio_clp || p.precio || 0)}
                    </option>
                  ))}
                  <option value="custom">✨ Plan Personalizado / A Medida</option>
                </select>
              </div>

              {selectedCatalogPlanId === 'custom' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre del Plan Personalizado:
                  </label>
                  <input
                    type="text"
                    value={planConcepto}
                    onChange={e => setPlanConcepto(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              )}

              {/* Sesiones y Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sesiones Contratadas:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={planSesiones}
                    onChange={e => setPlanSesiones(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Precio Total (CLP):
                  </label>
                  <input
                    type="number"
                    value={planValorTotal}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setPlanValorTotal(val);
                      if (planModalidadPago === 'total') setPlanMontoAbono(val);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Modalidad de Abono Inicial */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Modalidad de Cobro Inicial:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setPlanModalidadPago('total');
                      setPlanMontoAbono(planValorTotal);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      planModalidadPago === 'total'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Pagado Hoy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPlanModalidadPago('parcial');
                      setPlanMontoAbono(Math.round(planValorTotal / 2));
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      planModalidadPago === 'parcial'
                        ? 'bg-amber-500 text-white border-amber-500 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⏳ Abono Parcial
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPlanModalidadPago('pendiente');
                      setPlanMontoAbono(0);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      planModalidadPago === 'pendiente'
                        ? 'bg-slate-700 text-white border-slate-700 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⚠️ A Crédito (0)
                  </button>
                </div>
              </div>

              {planModalidadPago === 'parcial' && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900">Monto Abonado Hoy:</span>
                    <span className="font-mono font-bold text-amber-800">
                      Saldo restante: {formatCLP(Math.max(0, planValorTotal - planMontoAbono))}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={planMontoAbono}
                    onChange={e => setPlanMontoAbono(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              )}

              {/* Checkbox Abono Evaluación */}
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={abonarEvaluacion}
                  onChange={e => setAbonarEvaluacion(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Abonar valor de evaluación previa ($28.000) al tratamiento</span>
              </label>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODO B: ABONO / LIQUIDACIÓN DE DEUDA */}
          {/* ========================================================= */}
          {mode === 'deuda' && (
            <div className="space-y-3.5 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Liquidación de Saldo Pendiente
                </span>
                <span className="text-[11px] font-mono text-amber-700">Modo B</span>
              </div>

              {/* Selección de plan pendiente si hay varios */}
              {pendingPlans.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Seleccionar Plan a Abonar:
                  </label>
                  <select
                    value={selectedPendingPlanId}
                    onChange={e => handleSelectPendingPlan(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {pendingPlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_plan} (Debe {formatCLP(p.saldo_pendiente ?? p.valor_total)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Concepto:</span>
                  <span className="font-bold text-slate-800">{deudaConcepto || 'Plan Kinésico'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Deuda Total Registrada:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatCLP(deudaMontoTotal)}
                  </span>
                </div>
              </div>

              {/* Input de monto a pagar hoy */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Monto que Paga Hoy (CLP):
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeudaMontoAPagar(deudaMontoTotal)}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Pagar Total ({formatCLP(deudaMontoTotal)})
                  </button>
                </div>
                <input
                  type="number"
                  value={deudaMontoAPagar}
                  onChange={e => setDeudaMontoAPagar(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-base font-mono font-extrabold text-slate-900 focus:outline-amber-500"
                />
              </div>

              {/* Balance en tiempo real */}
              <div className="flex items-center justify-between text-xs pt-1 px-1 font-mono tabular-nums">
                <span className="text-slate-600">Nuevo Saldo Post-Pago:</span>
                <span
                  className={`font-bold ${
                    Math.max(0, deudaMontoTotal - deudaMontoAPagar) === 0
                      ? 'text-emerald-600'
                      : 'text-amber-700'
                  }`}
                >
                  {Math.max(0, deudaMontoTotal - deudaMontoAPagar) === 0
                    ? '✓ Quedará al día ($0)'
                    : formatCLP(Math.max(0, deudaMontoTotal - deudaMontoAPagar))}
                </span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODO C: SESIÓN UNITARIA (BOX) */}
          {/* ========================================================= */}
          {mode === 'sesion' && (
            <div className="space-y-3.5 bg-blue-50/40 p-3.5 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Cobro de Sesión Individual de Box
                </span>
                <span className="text-[11px] font-mono text-blue-700">Modo C</span>
              </div>

              {/* Si el paciente tiene plan activo, mostrar atajo preferente */}
              {tienePlanActivo && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">
                      Plan Activo Detectado: {pacienteDisplay?.nombre_plan}
                    </span>
                    <span className="font-mono text-emerald-800 font-bold">
                      {pacienteDisplay?.sesiones_usadas || 0}/{pacienteDisplay?.total_sesiones || 1} ses.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDescontarPlanActivo}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Descontar de Plan Activo (Sin Cobro Extra)</span>
                  </button>
                </div>
              )}

              {/* Cobro Particular de Sesión */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Monto Sesión (CLP):
                    </label>
                    <input
                      type="number"
                      value={sesionMonto}
                      onChange={e => setSesionMonto(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Estado del Pago:
                    </label>
                    <select
                      value={sesionEsFiada ? 'fiado' : 'pagado'}
                      onChange={e => setSesionEsFiada(e.target.value === 'fiado')}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="pagado">✓ Pagado Ahora</option>
                      <option value="fiado">⚠️ Pendiente de Pago</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* CAMPOS TRANSACCIONALES (Método, Boleta, Fecha) */}
          {/* ========================================================= */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Medio de Pago:
                </label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="Transferencia">Transferencia Electrónica</option>
                  <option value="Débito / Transbank">Débito / Transbank (POS)</option>
                  <option value="Efectivo">Efectivo en Box</option>
                  <option value="Convenio">Convenio Institucional</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>N° de Boleta:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Recomendado</span>
                </label>
                <input
                  type="text"
                  value={numeroBoleta}
                  onChange={e => setNumeroBoleta(e.target.value)}
                  placeholder="Ej: 45892"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fecha de Registro:
                </label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={e => setFechaPago(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notas / Observaciones:
                </label>
                <input
                  type="text"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: 50% abono..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      </DialogBody>

      <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-3 sm:px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        >
          Cancelar
        </button>

        <button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar y Registrar Cobro</span>
            </>
          )}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

export default PaymentCheckoutModal;
