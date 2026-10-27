'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PaymentCheckoutModal } from "@/components/sales/PaymentCheckoutModal";
import { PatientModal } from "@/components/patients/PatientModal";
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  getResumenPlan, 
  evaluarRiesgoDesercion, 
  requiereReevaluacion,
  detectarSegmentoTMO,
  getSegmentoTMOLabel
} from '@/lib/clinical';
import { AppointmentModal } from "@/components/appointments/AppointmentModal";
import { AssignTreatmentModal } from "@/components/sales/AssignTreatmentModal";
import { RenewPlanDialog } from "@/components/patients/RenewPlanDialog";
import { EditPatientDialog } from "@/components/patients/EditPatientDialog";
import { ManagePlanModal } from "@/components/patients/ManagePlanModal";
import { DischargeReportModal } from "@/components/clinical/DischargeReportModal";
import ClinicalRecordView from "@/components/clinical/ClinicalRecordView";
import { PatientsDataGrid, PacienteResumen } from "@/components/patients/PatientsDataGrid";
import { toast } from 'sonner';
import { purgeDuplicatePatientsAction } from "@/actions/patients";
import { useSede } from '@/context/SedeContext';
import { 
  Table, 
  LayoutGrid, 
  Plus, 
  ArrowRight, 
  MessageCircle, 
  FileText, 
  RotateCw,
  Search,
  Filter,
  Calendar
} from 'lucide-react';

const CHIPS_TMO = [
  { id: 'todos', label: 'Todos' },
  { id: 'lumbar', label: '🦴 Lumbar / Pelvis' },
  { id: 'cervical', label: '💆 Cervical / Dorsal' },
  { id: 'hombro', label: '💪 Hombro / EESS' },
  { id: 'eeii', label: '🦵 Rodilla / Tobillo' },
  { id: 'atm', label: '🦷 ATM' },
];

type ActiveModal = 
  | { type: 'patient' }
  | { type: 'sale' }
  | { type: 'appointment'; data: any }
  | { type: 'edit'; data: PacienteResumen }
  | { type: 'managePlan'; data: PacienteResumen }
  | { type: 'assign'; data: PacienteResumen }
  | { type: 'renew'; data: PacienteResumen }
  | { type: 'discharge'; data: PacienteResumen }
  | null;

export default function PacientesPage() {
  const supabase = createClient();
  const { sedeActiva, sedeConfig } = useSede();
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [loading, setLoading] = useState(true);

  // Modos de vista y filtros
  const [modoVista, setModoVista] = useState<'tabla' | 'kanban'>('tabla');
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'vigentes' | 'renovar' | 'riesgo' | 'finalizados' | 'sin_plan'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [verTodosRed, setVerTodosRed] = useState<boolean>(false);

  // Montaje dinámico de modal único (Lazy / discriminado)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Expediente Clínico Medilink
  const [selectedPacienteFichaId, setSelectedPacienteFichaId] = useState<string | null>(null);
  const [isPurgingDuplicates, setIsPurgingDuplicates] = useState(false);

  const handlePurgeDuplicates = async () => {
    if (!confirm('¿Deseas buscar y eliminar registros de pacientes duplicados vacíos (sin citas ni compras asociadas)?')) return;
    setIsPurgingDuplicates(true);
    const toastId = toast.loading('Depurando registros duplicados vacíos...');
    try {
      const res = await purgeDuplicatePatientsAction();
      if (res.success) {
        toast.success(res.message, { id: toastId });
        cargarPacientes();
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error al depurar duplicados', { id: toastId });
    } finally {
      setIsPurgingDuplicates(false);
    }
  };

  const handleAbrirEditar = (p: PacienteResumen) => {
    setActiveModal({ type: 'edit', data: p });
  };

  const handleAbrirAjustarPlan = (p: PacienteResumen) => {
    setActiveModal({ type: 'managePlan', data: p });
  };

  const handleAgendarPaciente = (p: PacienteResumen) => {
    setActiveModal({
      type: 'appointment',
      data: {
        id: p.id,
        nombre_completo: p.nombre_completo,
        rut: p.rut,
        telefono: p.telefono,
      }
    });
  };

  const handleAbrirAsignarPlan = (p: PacienteResumen) => {
    setActiveModal({ type: 'assign', data: p });
  };

  const handleAbrirRenovar = (p: PacienteResumen) => {
    setActiveModal({ type: 'renew', data: p });
  };

  const handleAbrirAlta = (p: PacienteResumen) => {
    setActiveModal({ type: 'discharge', data: p });
  };

  const abrirFichaPaciente = (pacienteId: string) => {
    setSelectedPacienteFichaId(pacienteId);
  };

  // 1. Carga de datos directa enriquecida con compras_planes y diagnóstico clínico TMO
  const cargarPacientes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [resVista, resPacientes, resPlanes] = await Promise.all([
        supabase
          .from('vista_resumen_pacientes')
          .select('*')
          .order('nombre_completo', { ascending: true }),
        supabase
          .from('pacientes')
          .select('*'),
        supabase
          .from('compras_planes')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (resVista.error) throw resVista.error;

      const pMap = new Map<string, any>();
      if (resPacientes.data) {
        resPacientes.data.forEach((p: any) => pMap.set(p.id, p));
      }

      const planesMap = new Map<string, any[]>();
      if (resPlanes.data) {
        resPlanes.data.forEach((cp: any) => {
          const list = planesMap.get(cp.paciente_id) || [];
          list.push(cp);
          planesMap.set(cp.paciente_id, list);
        });
      }

      // Enriquecer diagnósticos y planes para que prevalezcan las ediciones manuales en compras_planes
      const listaLimpia = ((resVista.data as PacienteResumen[]) || [])
        .map((p) => {
          const raw = pMap.get(p.id) || {};
          const patientPlans = planesMap.get(p.id) || [];
          const activePlan = patientPlans.find((cp) => cp.estado === 'activo');
          const latestPlan = patientPlans[0];
          const planElegido = activePlan || latestPlan;

          let sesionesTotales = Number(p.total_sesiones ?? (p as any).total_sesiones ?? 0);
          let sesionesUsadas = Number(p.sesiones_usadas ?? (p as any).sesiones_consumidas ?? 0);
          let planId = p.plan_id || null;
          let nombrePlan = p.nombre_plan || null;
          let estadoPago = p.estado_pago || 'pagado';
          let rawEstadoPlan = (p.estado_plan || '').toLowerCase().trim();

          if (planElegido) {
            planId = planElegido.id;
            nombrePlan = planElegido.nombre_plan || nombrePlan;
            sesionesTotales = Number(planElegido.total_sesiones ?? sesionesTotales);
            sesionesUsadas = Number(planElegido.sesiones_usadas ?? sesionesUsadas);
            if (planElegido.estado_pago) {
              estadoPago = planElegido.estado_pago.toLowerCase().includes('pend') ? 'pendiente' : 'pagado';
            }
            if (planElegido.estado === 'completado' || planElegido.estado === 'finalizado') {
              rawEstadoPlan = 'finalizado';
            } else if (planElegido.estado === 'cancelado') {
              rawEstadoPlan = 'cancelado';
            }
          }

          const sesionesRestantes = Math.max(0, sesionesTotales - sesionesUsadas);

          // Determinar estado_plan normalizado
          let estadoPlanFinal: 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan' | string = 'sin_plan';
          if (sesionesTotales === 0 || (!planElegido && !p.plan_id && (!p.nombre_plan || p.nombre_plan === 'Sin plan activo'))) {
            estadoPlanFinal = 'sin_plan';
          } else if (rawEstadoPlan === 'finalizado' || rawEstadoPlan.includes('finaliz') || (sesionesTotales > 0 && sesionesRestantes === 0)) {
            estadoPlanFinal = 'finalizado';
          } else if (rawEstadoPlan === 'por_renovar' || sesionesRestantes === 1) {
            estadoPlanFinal = 'por_renovar';
          } else if (rawEstadoPlan === 'vigente' || rawEstadoPlan === 'activo' || sesionesRestantes > 1) {
            estadoPlanFinal = 'vigente';
          }

          return {
            ...p,
            rut: p.rut || raw.rut || '',
            telefono: p.telefono || raw.telefono || null,
            email: p.email || raw.email || null,
            prevision: p.prevision || raw.prevision_salud || raw.prevision || 'Particular',
            prevision_salud: p.prevision_salud || raw.prevision_salud || raw.prevision || 'Particular',
            motivo_consulta: p.motivo_consulta || raw.motivo_consulta || null,
            diagnostico_principal: p.diagnostico_principal || raw.diagnostico_principal || null,
            diagnostico_medico: p.diagnostico_medico || raw.diagnostico_medico || null,
            fecha_nacimiento: p.fecha_nacimiento || raw.fecha_nacimiento || null,
            antecedentes_morbidos: p.antecedentes_morbidos || raw.antecedentes_morbidos || null,
            antecedentes_medicos: p.antecedentes_medicos || raw.antecedentes_medicos || null,
            banderas_rojas: p.banderas_rojas || raw.banderas_rojas || null,
            alertas_seguridad: p.alertas_seguridad || raw.alertas_seguridad || null,
            plan_id: planId,
            nombre_plan: nombrePlan,
            total_sesiones: sesionesTotales,
            sesiones_usadas: sesionesUsadas,
            sesiones_restantes: sesionesRestantes,
            estado_plan: estadoPlanFinal,
            estado_pago: estadoPago,
            monto_clp: planElegido?.monto_clp ?? p.monto_clp ?? null,
            sede: raw.sede || (p as any).sede || 'chillan',
          };
        });

      setPacientes(listaLimpia);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
      toast.error('Error al cargar la lista de pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  // Atajo de teclado Cmd + K para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const searchInput = document.getElementById('pacientes-search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Pacientes base según sede activa o red completa
  const pacientesBase = useMemo(() => {
    if (verTodosRed) return pacientes;
    return pacientes.filter(p => ((p as any).sede || 'chillan') === sedeActiva);
  }, [pacientes, verTodosRed, sedeActiva]);

  // Métricas y KPIs Superiores con Pestaña de Riesgo de Abandono
  const kpis = useMemo(() => {
    const vigentes = pacientesBase.filter(p => p.estado_plan === 'vigente').length;
    const porRenovar = pacientesBase.filter(p => p.estado_plan === 'por_renovar' || p.sesiones_restantes === 1).length;
    const enRiesgo = pacientesBase.filter(p => {
      const alerta = evaluarRiesgoDesercion({ ...p, sesiones_consumidas: p.sesiones_usadas } as any);
      return alerta.nivel !== null;
    }).length;
    const finalizados = pacientesBase.filter(p => p.estado_plan === 'finalizado').length;
    const sinPlan = pacientesBase.filter(p => p.estado_plan === 'sin_plan' || p.total_sesiones === 0).length;
    return { vigentes, porRenovar, enRiesgo, finalizados, sinPlan, total: pacientesBase.length };
  }, [pacientesBase]);

  // 3. Filtrado por Búsqueda, Pestañas y Filtro Anatómico TMO
  const pacientesFiltrados = useMemo(() => {
    return pacientesBase.filter(p => {
      // Filtro de texto (nombre, rut o teléfono)
      const term = busqueda.toLowerCase().trim();
      const matchText = 
        !term ||
        (p.nombre_completo && p.nombre_completo.toLowerCase().includes(term)) ||
        (p.rut && p.rut.toLowerCase().includes(term)) ||
        (p.telefono && p.telefono.includes(term));

      if (!matchText) return false;

      // Filtro de pestañas (relevante para vista tabla y móvil)
      if (filtroTab === 'vigentes' && p.estado_plan !== 'vigente') return false;
      if (filtroTab === 'renovar' && p.estado_plan !== 'por_renovar' && p.sesiones_restantes !== 1) return false;
      if (filtroTab === 'riesgo') {
        const alerta = evaluarRiesgoDesercion({ ...p, sesiones_consumidas: p.sesiones_usadas } as any);
        if (alerta.nivel === null) return false;
      }
      if (filtroTab === 'finalizados' && p.estado_plan !== 'finalizado') return false;
      if (filtroTab === 'sin_plan' && p.estado_plan !== 'sin_plan' && p.total_sesiones > 0) return false;

      // Filtro Anatómico / Segmentario TMO
      if (filtroSegmento !== 'todos') {
        const seg = detectarSegmentoTMO(p);
        if (seg !== filtroSegmento) return false;
      }

      return true;
    });
  }, [pacientesBase, busqueda, filtroTab, filtroSegmento]);

  // 4. Columnas del Tablero Kanban según ciclo clínico
  const kanbanColumnas = useMemo(() => {
    // Columna 1: Evaluación / Nuevos (sin plan o 1 sesión realizada pendientes de definir plan)
    const evaluacionNuevos = pacientesFiltrados.filter(p => {
      const { tienePlan, sesionesUsadas } = getResumenPlan(p);
      const isSinPlan = !tienePlan || p.estado_plan === 'sin_plan' || (p.total_sesiones || 0) === 0;
      const isUnaSesionPendiente = (p.total_sesiones === 1 && sesionesUsadas >= 1) || (sesionesUsadas === 1 && isSinPlan);
      return isSinPlan || isUnaSesionPendiente;
    });

    // Columna 2: En Tratamiento Activo (estado_plan === 'vigente' y sesiones_restantes > 1)
    const tratamientoActivo = pacientesFiltrados.filter(p => {
      const { sesionesRestantes } = getResumenPlan(p);
      return p.estado_plan === 'vigente' && sesionesRestantes > 1;
    });

    // Columna 3: Por Renovar (1 restante) (estado_plan === 'por_renovar' o sesiones_restantes === 1)
    const porRenovar = pacientesFiltrados.filter(p => {
      const { tienePlan, sesionesRestantes } = getResumenPlan(p);
      if (!tienePlan || p.estado_plan === 'finalizado') return false;
      return p.estado_plan === 'por_renovar' || sesionesRestantes === 1;
    });

    // Columna 4: En Riesgo (>21 días) (evaluarRiesgoDesercion(p).nivel !== null)
    const enRiesgo = pacientesFiltrados.filter(p => {
      const alerta = evaluarRiesgoDesercion(p as any);
      return alerta.nivel !== null;
    });

    // Columna 5: Alta / Completados (estado_plan === 'finalizado')
    const altaCompletados = pacientesFiltrados.filter(p => {
      return p.estado_plan === 'finalizado';
    });

    return [
      {
        id: 'evaluacion',
        titulo: 'Evaluación / Nuevos',
        subtitulo: 'Pendientes de definir plan',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        pacientes: evaluacionNuevos,
      },
      {
        id: 'tratamiento',
        titulo: 'En Tratamiento Activo',
        subtitulo: 'Plan vigente (>1 ses. rest.)',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        pacientes: tratamientoActivo,
      },
      {
        id: 'renovar',
        titulo: 'Por Renovar (1 restante)',
        subtitulo: '1 sesión restante',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        pacientes: porRenovar,
      },
      {
        id: 'riesgo',
        titulo: 'En Riesgo (>21 días)',
        subtitulo: 'Alerta radar deserción',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        pacientes: enRiesgo,
      },
      {
        id: 'alta',
        titulo: 'Alta / Completados',
        subtitulo: 'Tratamiento finalizado',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        pacientes: altaCompletados,
      },
    ];
  }, [pacientesFiltrados]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans text-slate-900 overflow-x-hidden">
      
      {/* Contenedor Principal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-5 print:hidden overflow-x-hidden">
        
        {/* 1. Cabecera Minimalista con Métricas Integradas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">Directorio Clínico & Pacientes</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Planes Vigentes: <strong className="text-slate-800 font-bold">{kpis.vigentes}</strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Por Renovar: <strong className="text-slate-800 font-bold">{kpis.porRenovar}</strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                En Riesgo: <strong className="text-slate-800 font-bold">{kpis.enRiesgo}</strong>
              </span>
              <span>·</span>
              <span className="font-mono tabular-nums">
                Total: <strong className="text-slate-800 font-bold">{kpis.total}</strong> Pacientes
              </span>
            </div>
          </div>

          {/* Acciones Globales */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button"
              onClick={handlePurgeDuplicates}
              disabled={isPurgingDuplicates}
              className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Elimina registros duplicados vacíos creados por error sin citas ni compras asociadas"
            >
              🧹 Depurar Duplicados
            </button>
            <button 
              type="button"
              onClick={() => cargarPacientes()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>Actualizar</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveModal({ type: 'sale' })}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              + Registrar Venta
            </button>
            <button 
              type="button"
              onClick={() => setActiveModal({ type: 'patient' })}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Paciente</span>
            </button>
          </div>
        </div>

        {/* 2. BANDEJA DE FILTROS UNIFICADA DE UN SOLO PISO (Barra de Herramientas Compacta, Sticky en Móvil) */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sticky top-14 sm:static z-20">
          
          {/* Lado Izquierdo: Buscador a ancho completo en móvil con atajo ⌘K + Selector Segmento TMO */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
            <div className="relative w-full flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="pacientes-search-input"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, RUT o teléfono..."
                className="w-full pl-9 pr-14 py-2 sm:py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-base sm:text-xs text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
              />
              {busqueda ? (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              ) : (
                <span className="hidden sm:inline absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                  ⌘K
                </span>
              )}
            </div>

            {/* Selector de Segmento TMO Compacto */}
            <div className="shrink-0 w-full sm:w-auto">
              <select
                value={filtroSegmento}
                onChange={(e) => setFiltroSegmento(e.target.value)}
                className="w-full sm:w-auto h-9 sm:h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs font-semibold rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="todos">🦴 Segmento TMO: Todos ({pacientesBase.length})</option>
                <option value="lumbar">🦴 Lumbar / Pelvis</option>
                <option value="cervical">💆 Cervical / Dorsal</option>
                <option value="hombro">💪 Hombro / EESS</option>
                <option value="eeii">🦵 Rodilla / Tobillo</option>
                <option value="atm">🦷 ATM</option>
              </select>
            </div>

            {/* Switch "Ver todos los pacientes de la red" */}
            <div className="shrink-0 w-full sm:w-auto">
              <label 
                className={`w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 h-9 sm:h-8 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                  verTodosRed
                    ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Mostrar pacientes de ambas sedes (Chillán y Concepción)"
              >
                <input
                  type="checkbox"
                  checked={verTodosRed}
                  onChange={(e) => setVerTodosRed(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="whitespace-nowrap">
                  {verTodosRed ? '🌐 Ver todos los pacientes de la red' : `📍 Sede ${sedeConfig.ciudad}`}
                </span>
              </label>
            </div>
          </div>

          {/* Lado Derecho: Pills de Estado Clínico + Selector de Modo de Vista */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {/* Pills de Estado Clínico */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setFiltroTab('todos')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroTab === 'todos'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({kpis.total})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTab('vigentes')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroTab === 'vigentes'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                🟢 En Tratamiento ({kpis.vigentes})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTab('renovar')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroTab === 'renovar'
                    ? 'bg-white text-amber-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                🟡 Por Renovar ({kpis.porRenovar})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTab('riesgo')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroTab === 'riesgo'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                🔴 En Riesgo ({kpis.enRiesgo})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTab('sin_plan')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filtroTab === 'sin_plan'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sin Plan ({kpis.sinPlan})
              </button>
            </div>

            {/* Selector de Modo de Vista [ 📋 Tabla ] [ 🗂️ Kanban ] */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setModoVista('tabla')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  modoVista === 'tabla'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Tabular de Alta Densidad"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVista('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  modoVista === 'kanban'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Tablero Kanban Clínico"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. CONTENIDO: DATA GRID DE ALTA DENSIDAD VS TABLERO KANBAN */}
        {modoVista === 'tabla' ? (
          <PatientsDataGrid
            pacientes={pacientesFiltrados}
            loading={loading}
            onOpenFicha={abrirFichaPaciente}
            onAgendar={handleAgendarPaciente}
            onEditar={handleAbrirEditar}
            onAjustarPlan={handleAbrirAjustarPlan}
            onLimpiarFiltros={() => {
              setBusqueda('');
              setFiltroTab('todos');
              setFiltroSegmento('todos');
            }}
          />
        ) : (
          /* TABLERO KANBAN DE CICLO CLÍNICO */
          <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-start gap-4 min-w-max">
              {kanbanColumnas.map((col) => (
                <div
                  key={col.id}
                  className="w-72 flex-shrink-0 bg-slate-100/70 p-3 rounded-2xl border border-slate-200 flex flex-col max-h-[750px]"
                >
                  {/* Cabecera de Columna */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-3 px-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          {col.titulo}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${col.badgeColor}`}>
                          {col.pacientes.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{col.subtitulo}</p>
                    </div>
                  </div>

                  {/* Lista de Cards de la Columna con Scroll Vertical Independiente */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {loading ? (
                      <div className="space-y-2.5 py-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-28 bg-white/60 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : col.pacientes.length === 0 ? (
                      <div className="p-6 text-center bg-white/40 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        Sin pacientes en esta etapa
                      </div>
                    ) : (
                      col.pacientes.map((p) => {
                        const { tienePlan, sesionesUsadas, sesionesTotales, sesionesRestantes, porcentajeUso } = getResumenPlan(p);
                        const segmentoKey = detectarSegmentoTMO(p);
                        const segmentoInfo = getSegmentoTMOLabel(segmentoKey);
                        const alerta = evaluarRiesgoDesercion(p as any);
                        const isPorRenovarCard = col.id === 'renovar';
                        const isRiesgoCard = col.id === 'riesgo';
                        const isAltaCard = col.id === 'alta';

                        let borderStyle = 'border-slate-200/80';
                        if (isPorRenovarCard) borderStyle = 'border-amber-300 bg-amber-50/20';
                        if (isRiesgoCard) borderStyle = 'border-rose-300 bg-rose-50/20';
                        if (isAltaCard) borderStyle = 'border-slate-200 bg-slate-50/30';

                        return (
                          <div
                            key={p.id}
                            className={`bg-white p-3.5 rounded-xl border ${borderStyle} shadow-xs space-y-2.5 hover:shadow-md transition-all group`}
                          >
                            {/* Cabecera de la card: Nombre, Previsión y Chip Anatómico */}
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => abrirFichaPaciente(p.id)}
                                  className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-left cursor-pointer hover:underline"
                                  title={p.nombre_completo}
                                >
                                  {p.nombre_completo}
                                </button>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0">
                                  {p.prevision || 'Part'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${segmentoInfo.colorClass}`}
                                >
                                  {segmentoInfo.shortLabel}
                                </span>

                                {p.rut && (
                                  <span className="font-mono tabular-nums text-[10px] text-slate-400">
                                    {p.rut}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Detalle Clínico / Progreso */}
                            {col.id === 'evaluacion' && (
                              <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                                <p className="font-medium text-slate-700">
                                  {tienePlan ? `${p.nombre_plan || 'Plan'}` : 'Sin plan asignado'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                                  {sesionesUsadas > 0 ? `${sesionesUsadas} sesión realizada` : 'Evaluación inicial pendiente'}
                                </p>
                              </div>
                            )}

                            {col.id === 'tratamiento' && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 font-mono tabular-nums">
                                  <span>{sesionesUsadas}/{sesionesTotales} ses.</span>
                                  <span className="text-emerald-600 font-bold">{sesionesRestantes} rest.</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${porcentajeUso}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {col.id === 'renovar' && (
                              <div className="space-y-1 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 font-mono tabular-nums">
                                  <span>⚠️ Última Sesión</span>
                                  <span>{sesionesUsadas}/{sesionesTotales}</span>
                                </div>
                                <p className="text-[10px] text-amber-700">
                                  Falta 1 sesión para finalizar el plan actual.
                                </p>
                              </div>
                            )}

                            {col.id === 'riesgo' && (
                              <div className="space-y-1 bg-rose-50/60 p-2 rounded-lg border border-rose-200/60">
                                <p className="text-[11px] font-bold text-rose-800 line-clamp-1">
                                  {alerta.etiqueta || 'Alerta de Inasistencia'}
                                </p>
                                {p.dias_sin_atencion && (
                                  <p className="text-[10px] text-rose-600 font-mono tabular-nums">
                                    {p.dias_sin_atencion} días sin control kinésico
                                  </p>
                                )}
                              </div>
                            )}

                            {col.id === 'alta' && (
                              <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                                <p className="font-bold text-slate-800">Tratamiento Finalizado</p>
                                <p className="text-[10px] text-emerald-700 font-medium">
                                  ✓ Sesiones plan completadas
                                </p>
                              </div>
                            )}

                            {/* Botonera de la Card según columna */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              {col.id === 'evaluacion' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirAsignarPlan(p)}
                                    className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Definir Plan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAgendarPaciente(p)}
                                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                    title="Agendar cita"
                                  >
                                    📅
                                  </button>
                                </>
                              )}

                              {col.id === 'tratamiento' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAgendarPaciente(p)}
                                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Calendar className="w-3 h-3 text-emerald-600" />
                                    <span>Agendar Próxima</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => abrirFichaPaciente(p.id)}
                                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                    title="Ver Ficha"
                                  >
                                    →
                                  </button>
                                </>
                              )}

                              {col.id === 'renovar' && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirRenovar(p)}
                                  className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>📲 Ofrecer Continuidad</span>
                                </button>
                              )}

                              {col.id === 'riesgo' && (
                                <>
                                  {p.telefono ? (
                                    <a
                                      href={`https://wa.me/56${p.telefono.replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent(
                                        alerta.mensajeWhatsApp ||
                                          `Hola ${p.nombre_completo?.split(' ')[0]}, te escribimos desde Kiromov Centro Clínico para consultar por tu recuperación y coordinar tu próxima sesión.`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Sin teléfono registrado</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => abrirFichaPaciente(p.id)}
                                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                    title="Ver Ficha"
                                  >
                                    →
                                  </button>
                                </>
                              )}

                              {col.id === 'alta' && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirAlta(p)}
                                  className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3 text-slate-600" />
                                  <span>📄 Certificado / Alta</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. MONTAJE DINÁMICO DE MODALES (LAZY / DISCRIMINADO) */}
        {activeModal?.type === 'sale' && (
          <PaymentCheckoutModal 
            isOpen={true} 
            onClose={() => setActiveModal(null)} 
            onSuccess={() => {
              setActiveModal(null);
              cargarPacientes();
            }}
            initialMode="plan"
          />
        )}

        {activeModal?.type === 'patient' && (
          <PatientModal
            open={true}
            onOpenChange={(open) => !open && setActiveModal(null)}
            onPatientSaved={() => {
              setFiltroTab('todos');
              setActiveModal(null);
              cargarPacientes();
            }}
          />
        )}
        
        {activeModal?.type === 'appointment' && activeModal.data && (
          <AppointmentModal
            isOpen={true}
            preselectedPatient={activeModal.data}
            onClose={() => setActiveModal(null)}
            onSuccess={() => {
              toast.success('Cita agendada correctamente');
              setActiveModal(null);
            }}
          />
        )}

        {activeModal?.type === 'assign' && activeModal.data && (
          <AssignTreatmentModal
            isOpen={true}
            paciente={activeModal.data}
            onClose={() => setActiveModal(null)}
            onSuccess={() => {
              setActiveModal(null);
              cargarPacientes();
            }}
          />
        )}

        {activeModal?.type === 'renew' && activeModal.data && (
          <RenewPlanDialog
            pacienteId={activeModal.data.id}
            pacienteNombre={activeModal.data.nombre_completo}
            open={true}
            onOpenChange={(open) => !open && setActiveModal(null)}
            onPlanPurchased={() => {
              setActiveModal(null);
              cargarPacientes();
            }}
          />
        )}

        {activeModal?.type === 'discharge' && activeModal.data && (
          <DischargeReportModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            patient={activeModal.data}
          />
        )}

        {activeModal?.type === 'edit' && activeModal.data && (
          <EditPatientDialog
            isOpen={true}
            onClose={() => setActiveModal(null)}
            patient={activeModal.data}
            onPatientUpdated={() => {
              setActiveModal(null);
              cargarPacientes();
            }}
            onPatientDeleted={() => {
              setActiveModal(null);
              cargarPacientes();
            }}
          />
        )}

        {activeModal?.type === 'managePlan' && activeModal.data && (
          <ManagePlanModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            paciente={activeModal.data}
            planActual={{
              id: activeModal.data.plan_id,
              nombre_plan: activeModal.data.nombre_plan,
              total_sesiones: activeModal.data.total_sesiones,
              sesiones_usadas: activeModal.data.sesiones_usadas,
              estado: activeModal.data.estado_plan,
              estado_pago: activeModal.data.estado_pago,
            }}
            onSuccess={async () => {
              setActiveModal(null);
              await cargarPacientes();
            }}
          />
        )}

        {/* Expediente Clínico Medilink desde Directorio de Pacientes */}
        {selectedPacienteFichaId && (
          <ClinicalRecordView
            pacienteId={selectedPacienteFichaId}
            onClose={() => setSelectedPacienteFichaId(null)}
            onSuccess={() => {
              cargarPacientes();
            }}
          />
        )}
      </section>
    </div>
  );
}
