'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { getChileanDate } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  Minus, 
  CheckCircle2, 
  CreditCard, 
  CalendarCheck, 
  Loader2,
  Sparkles
} from 'lucide-react';

export interface ManagePlanPatient {
  id: string;
  nombre_completo: string;
  rut?: string | null;
  telefono?: string | null;
  email?: string | null;
  prevision?: string | null;
  plan_id?: string | null;
  nombre_plan?: string | null;
  sesiones_totales?: number | null;
  sesiones_usadas?: number | null;
  sesiones_restantes?: number | null;
  estado_plan?: string | null;
  estado_pago?: string | null;
}

export interface ManagePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  paciente: ManagePlanPatient | null;
  planActual?: {
    id?: string | null;
    nombre_plan?: string | null;
    sesiones_totales?: number | null;
    sesiones_usadas?: number | null;
    total_sesiones?: number | null;
    estado?: string | null;
    estado_pago?: string | null;
  } | null;
}

interface PlanCatalogoItem {
  id: string;
  nombre: string;
  total_sesiones: number;
  precio_clp?: number;
}

const CATALOGO_DEFAULT: PlanCatalogoItem[] = [
  { id: 'cat-1', nombre: 'Evaluación Inicial + TMO', total_sesiones: 1 },
  { id: 'cat-2', nombre: 'Sesión Individual (Particular)', total_sesiones: 1 },
  { id: 'cat-3', nombre: 'Sesión Individual (Convenio)', total_sesiones: 1 },
  { id: 'cat-4', nombre: 'Promo 2x (2 Sesiones)', total_sesiones: 2 },
  { id: 'cat-5', nombre: 'Plan Activa Care (4 Sesiones)', total_sesiones: 4 },
  { id: 'cat-6', nombre: 'Plan Activa Care (Convenio - 4 Sesiones)', total_sesiones: 4 },
  { id: 'cat-7', nombre: 'Plan Pro Care (6 Sesiones)', total_sesiones: 6 },
  { id: 'cat-8', nombre: 'Plan Pro Care (Convenio - 6 Sesiones)', total_sesiones: 6 },
  { id: 'cat-9', nombre: 'Plan Integral (10 Sesiones)', total_sesiones: 10 },
  { id: 'cat-10', nombre: 'Plan Integral (Convenio - 10 Sesiones)', total_sesiones: 10 },
  { id: 'cat-11', nombre: 'Pack Convenio (10 Sesiones)', total_sesiones: 10 },
  { id: 'cat-12', nombre: 'Plan Personalizado / Especial', total_sesiones: 1 },
];

export function ManagePlanModal({
  isOpen,
  onClose,
  onSuccess,
  paciente,
  planActual,
}: ManagePlanModalProps) {
  const supabase = createClient();

  const [planId, setPlanId] = useState<string | null>(null);
  const [nombrePlan, setNombrePlan] = useState('');
  const [sesionesTotales, setSesionesTotales] = useState<number>(10);
  const [sesionesUsadas, setSesionesUsadas] = useState<number>(0);
  const [estadoPlan, setEstadoPlan] = useState<'activo' | 'completado' | 'cancelado'>('activo');
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pagado');
  const [catalogo, setCatalogo] = useState<PlanCatalogoItem[]>(CATALOGO_DEFAULT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // 1. Cargar catálogo de planes desde Supabase
  useEffect(() => {
    if (!isOpen || !supabase) return;
    const fetchCatalogo = async () => {
      try {
        const { data, error } = await supabase
          .from('catalogo_planes')
          .select('id, nombre, total_sesiones, precio_clp, activo')
          .order('total_sesiones', { ascending: true });

        if (!error && data && data.length > 0) {
          const items: PlanCatalogoItem[] = data.map((d: any) => ({
            id: d.id,
            nombre: d.nombre || 'Plan Kinésico',
            total_sesiones: Number(d.total_sesiones) || 1,
            precio_clp: d.precio_clp,
          }));
          setCatalogo(items);
        }
      } catch (err) {
        console.warn('Error cargando catalogo_planes, usando respaldo:', err);
      }
    };
    fetchCatalogo();
  }, [isOpen]);

  // 2. Inicializar valores del paciente / plan
  useEffect(() => {
    if (!isOpen || !paciente) return;

    let activePlanId = planActual?.id || paciente.plan_id || null;
    let initialNombre = planActual?.nombre_plan || paciente.nombre_plan || '';
    let initialTotales = Number(planActual?.sesiones_totales ?? planActual?.total_sesiones ?? paciente.sesiones_totales ?? 10);
    let initialUsadas = Number(planActual?.sesiones_usadas ?? paciente.sesiones_usadas ?? 0);
    
    // Normalizar estado del plan
    const rawEstado = (planActual?.estado || paciente.estado_plan || '').toLowerCase().trim();
    let initialEstado: 'activo' | 'completado' | 'cancelado' = 'activo';
    if (rawEstado.includes('finaliz') || rawEstado.includes('complet') || rawEstado === 'completado') {
      initialEstado = 'completado';
    } else if (rawEstado.includes('cancel')) {
      initialEstado = 'cancelado';
    } else {
      initialEstado = 'activo';
    }

    // Normalizar estado de pago
    const rawPago = (planActual?.estado_pago || paciente.estado_pago || '').toLowerCase().trim();
    const initialPago: 'pagado' | 'pendiente' = rawPago.includes('pend') ? 'pendiente' : 'pagado';

    setPlanId(activePlanId);
    setNombrePlan(initialNombre || 'Pack Convenio (10 Sesiones)');
    setSesionesTotales(initialTotales > 0 ? initialTotales : 10);
    setSesionesUsadas(initialUsadas >= 0 ? initialUsadas : 0);
    setEstadoPlan(initialEstado);
    setEstadoPago(initialPago);

    // Si no tenemos planId explícito, buscar el más reciente en compras_planes para este paciente
    if (!activePlanId && supabase && paciente.id) {
      const fetchPatientPlan = async () => {
        setLoadingInitial(true);
        try {
          const { data, error } = await supabase
            .from('compras_planes')
            .select('*')
            .eq('paciente_id', paciente.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            setPlanId(data.id);
            if (data.nombre_plan || data.plan_nombre) {
              setNombrePlan(data.nombre_plan || data.plan_nombre);
            }
            const t = Number(data.sesiones_totales ?? data.total_sesiones ?? 10);
            const u = Number(data.sesiones_usadas ?? 0);
            setSesionesTotales(t > 0 ? t : 10);
            setSesionesUsadas(u >= 0 ? u : 0);
            if (data.estado === 'completado' || data.estado === 'finalizado') {
              setEstadoPlan('completado');
            } else if (data.estado === 'cancelado') {
              setEstadoPlan('cancelado');
            } else {
              setEstadoPlan('activo');
            }
            if ((data.estado_pago || '').toLowerCase().includes('pend')) {
              setEstadoPago('pendiente');
            } else {
              setEstadoPago('pagado');
            }
          }
        } catch (err) {
          console.warn('Error al buscar plan del paciente:', err);
        } finally {
          setLoadingInitial(false);
        }
      };
      fetchPatientPlan();
    }
  }, [isOpen, paciente, planActual]);

  if (!isOpen || !paciente) return null;

  // Sesiones restantes calculadas en tiempo real
  const sesionesRestantes = Math.max(0, sesionesTotales - sesionesUsadas);
  const porcentajeUso = sesionesTotales > 0 ? Math.min(100, Math.round((sesionesUsadas / sesionesTotales) * 100)) : 0;

  // Botones rápidos de ajuste
  const handleSumarSesion = () => {
    setSesionesUsadas((prev) => {
      const next = prev + 1;
      if (next >= sesionesTotales && estadoPlan === 'activo') {
        setEstadoPlan('completado');
      }
      return next;
    });
  };

  const handleRestarSesion = () => {
    setSesionesUsadas((prev) => {
      const next = Math.max(0, prev - 1);
      if (next < sesionesTotales && estadoPlan === 'completado') {
        setEstadoPlan('activo');
      }
      return next;
    });
  };

  const handleCompletarTodo = () => {
    setSesionesUsadas(sesionesTotales);
    setEstadoPlan('completado');
  };

  const handleSeleccionarCatalogo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const encontrado = catalogo.find((c) => c.id === selectedId);
    if (encontrado) {
      setNombrePlan(encontrado.nombre);
      setSesionesTotales(encontrado.total_sesiones);
      if (sesionesUsadas > encontrado.total_sesiones) {
        setSesionesUsadas(encontrado.total_sesiones);
      }
    }
  };

  // Guardado en Supabase
  const handleGuardarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        nombre_plan: nombrePlan.trim() || 'Plan Kinésico',
        plan_nombre: nombrePlan.trim() || 'Plan Kinésico',
        total_sesiones: Number(sesionesTotales),
        sesiones_totales: Number(sesionesTotales),
        sesiones_usadas: Number(sesionesUsadas),
        estado: estadoPlan, // 'activo', 'completado', 'cancelado'
        estado_pago: estadoPago, // 'pagado', 'pendiente'
        updated_at: new Date().toISOString(),
      };

      if (planId) {
        // Actualizar plan existente
        const { error } = await supabase
          .from('compras_planes')
          .update(payload)
          .eq('id', planId);
        if (error) {
          // Reintentar con conjunto base de columnas estándar
          const fallbackPayload = {
            nombre_plan: nombrePlan.trim() || 'Plan Kinésico',
            total_sesiones: Number(sesionesTotales),
            sesiones_totales: Number(sesionesTotales),
            sesiones_usadas: Number(sesionesUsadas),
            estado: estadoPlan,
            estado_pago: estadoPago,
          };
          const retry = await supabase
            .from('compras_planes')
            .update(fallbackPayload)
            .eq('id', planId);
          if (retry.error) throw retry.error;
        }
      } else {
        // Asignar plan desde cero
        const { error } = await supabase
          .from('compras_planes')
          .insert([
            {
              ...payload,
              paciente_id: paciente.id,
              fecha_compra: getChileanDate(),
              created_at: new Date().toISOString(),
            },
          ]);
        if (error) throw error;
      }

      toast.success('¡Plan del paciente actualizado exitosamente!');
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error guardando plan:', err);
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-xl">
      {/* 1. Header Fijo (Sticky Header) */}
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5 text-blue-600 animate-spin-slow" />
          </div>
          <div>
            <DialogTitle>Gestión Manual del Plan</DialogTitle>
            <DialogDescription>
              Ajuste de sesiones y estado para <strong>{paciente.nombre_completo}</strong>
              {paciente.rut && <span className="font-mono text-slate-400 ml-1">({paciente.rut})</span>}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* 2. Cuerpo Desplazable (Scrollable Body) */}
      <form onSubmit={handleGuardarPlan} className="flex-1 flex flex-col overflow-hidden">
        <DialogBody className="space-y-5 px-6 py-5 overflow-y-auto">
          {loadingInitial && (
            <div className="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl text-xs text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cargando datos del plan desde el servidor...</span>
            </div>
          )}

          {/* Resumen Visual del Saldo Actual */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Estado Actual del Saldo
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                  estadoPlan === 'completado'
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : estadoPlan === 'cancelado'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : sesionesRestantes <= 1
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {estadoPlan === 'completado'
                  ? 'Plan Completado'
                  : estadoPlan === 'cancelado'
                  ? 'Plan Cancelado'
                  : `${sesionesRestantes} sesiones restantes`}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {sesionesUsadas}
                </span>
                <span className="text-xl font-semibold text-slate-400">/</span>
                <span className="text-xl font-bold text-slate-600">
                  {sesionesTotales}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">sesiones realizadas</span>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {porcentajeUso}% avance
              </span>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  estadoPlan === 'completado'
                    ? 'bg-slate-500'
                    : estadoPlan === 'cancelado'
                    ? 'bg-rose-500'
                    : sesionesRestantes <= 1
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${porcentajeUso}%` }}
              />
            </div>
          </div>

          {/* Campo 1: Nombre del Plan y Selector de Catálogo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Nombre del Plan Clínico</span>
              </label>
              <span className="text-[11px] text-slate-400">Personalizable</span>
            </div>

            {/* Selector rápido desde catalogo_planes */}
            <select
              onChange={handleSeleccionarCatalogo}
              defaultValue=""
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="" disabled>
                ⚡ Seleccionar plantilla del Catálogo de Tarifas...
              </option>
              {catalogo.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre} ({cat.total_sesiones} {cat.total_sesiones === 1 ? 'sesión' : 'sesiones'})
                </option>
              ))}
            </select>

            {/* Input de texto libre editable */}
            <input
              type="text"
              value={nombrePlan}
              onChange={(e) => setNombrePlan(e.target.value)}
              placeholder="Ej: Pack Convenio 10 Sesiones"
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Contadores Numéricos: Totales y Usadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Campo 2: Sesiones Totales */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Sesiones Totales del Plan
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSesionesTotales((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs transition-colors cursor-pointer"
                  title="Restar 1 sesión total"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sesionesTotales}
                  onChange={(e) => setSesionesTotales(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => setSesionesTotales((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs transition-colors cursor-pointer"
                  title="Sumar 1 sesión total"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Duración convenida del tratamiento</p>
            </div>

            {/* Campo 3: Sesiones Usadas con Botones Rápidos Táctiles */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Sesiones Consumidas / Usadas
                </label>
                <span className="text-[10px] font-bold text-blue-600">Táctil</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestarSesion}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs transition-colors cursor-pointer"
                  title="Restar sesión usada"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  min="0"
                  max={sesionesTotales + 20}
                  value={sesionesUsadas}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setSesionesUsadas(val);
                    if (val >= sesionesTotales && estadoPlan === 'activo') {
                      setEstadoPlan('completado');
                    }
                  }}
                  className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-base font-extrabold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={handleSumarSesion}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs transition-colors cursor-pointer"
                  title="Sumar sesión usada"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botones de acción rápida de 1 solo toque */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleSumarSesion}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+1 Sesión Usada</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestarSesion}
                  className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 font-bold text-[11px] rounded-lg border border-amber-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                  <span>-1 Devolver</span>
                </button>
              </div>
            </div>

          </div>

          {/* Botón de acceso rápido: Marcar todo completado */}
          <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-900">
                ¿El paciente completó todo su tratamiento?
              </span>
            </div>
            <button
              type="button"
              onClick={handleCompletarTodo}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Completar ({sesionesTotales}/{sesionesTotales})
            </button>
          </div>

          {/* Campo 4 y 5: Estado del Plan y Estado de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Estado del Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Estado del Plan</span>
              </label>
              <select
                value={estadoPlan}
                onChange={(e) => setEstadoPlan(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="activo">🟢 Activo / Vigente</option>
                <option value="completado">⚪ Finalizado / Completado</option>
                <option value="cancelado">🔴 Cancelado</option>
              </select>
              <p className="text-[10px] text-slate-400">
                {estadoPlan === 'completado'
                  ? 'Figurará bajo la pestaña "Finalizados"'
                  : estadoPlan === 'cancelado'
                  ? 'Plan cancelado sin más sesiones activas'
                  : 'Paciente en tratamiento activo'}
              </p>
            </div>

            {/* Estado de Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>Estado de Pago</span>
              </label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="pagado">✓ Pagado (Saldado)</option>
                <option value="pendiente">🔴 Cobro Pendiente</option>
              </select>
              <p className="text-[10px] text-slate-400">
                {estadoPago === 'pagado'
                  ? 'Plan pagado sin deudas pendientes'
                  : 'Se mostrará alerta de cobro en recepción'}
              </p>
            </div>

          </div>

          {planId && (
            <p className="text-[10px] font-mono text-slate-400 truncate">
              ID Registro Plan: {planId}
            </p>
          )}
        </DialogBody>

        {/* 3. Footer Fijo (Sticky Footer) */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
