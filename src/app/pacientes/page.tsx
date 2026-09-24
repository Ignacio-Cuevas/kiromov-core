'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SaleModal } from "@/components/sales/SaleModal";
import { PatientModal } from "@/components/patients/PatientModal";
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  getResumenPlan, 
  evaluarRiesgoDesercion, 
  requiereReevaluacion
} from '@/lib/clinical';
import { AppointmentModal } from "@/components/appointments/AppointmentModal";
import { AssignTreatmentModal } from "@/components/sales/AssignTreatmentModal";
import { RenewPlanDialog } from "@/components/patients/RenewPlanDialog";
import { EditPatientDialog } from "@/components/patients/EditPatientDialog";
import { ManagePlanModal } from "@/components/patients/ManagePlanModal";
import { DischargeReportModal } from "@/components/clinical/DischargeReportModal";
import ClinicalRecordView from "@/components/clinical/ClinicalRecordView";
import { toast } from 'sonner';
import { 
  Table, 
  LayoutGrid, 
  Plus, 
  ArrowRight, 
  MessageCircle, 
  FileText, 
  RotateCw,
  Settings
} from 'lucide-react';

function detectarSegmentoTMO(p: any): string {
  const texto = `${p.motivo_consulta || ''} ${p.diagnostico_principal || ''} ${p.diagnostico_medico || ''}`.toLowerCase();
  if (/lumb|ciat|sacr|l5|s1|espalda baja|gluteo/i.test(texto)) return 'lumbar';
  if (/cervic|cuello|nuca|dorsal|escapul|trapecio/i.test(texto)) return 'cervical';
  if (/hombro|manguito|codo|muñeca|mano|brazo|tendinopatia hombro/i.test(texto)) return 'hombro';
  if (/rodilla|menisc|patelar|cadera|tobillo|pie|aquil|fascia/i.test(texto)) return 'eeii';
  if (/atm|mandibul|brux/i.test(texto)) return 'atm';
  return 'otro';
}

function getSegmentoTMOLabel(segmento: string) {
  switch (segmento) {
    case 'lumbar':
      return { label: '🦴 Lumbar / Pelvis', shortLabel: 'Lumbar', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'cervical':
      return { label: '💆 Cervical / Dorsal', shortLabel: 'Cervical', colorClass: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'hombro':
      return { label: '💪 Hombro / EESS', shortLabel: 'Hombro', colorClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'eeii':
      return { label: '🦵 Rodilla / Tobillo', shortLabel: 'EEII / Rodilla', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'atm':
      return { label: '🦷 ATM', shortLabel: 'ATM', colorClass: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { label: 'Otros / General', shortLabel: 'General', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

interface PacienteResumen {
  id: string;
  codigo_paciente?: string;
  nombre_completo: string;
  rut: string;
  telefono: string | null;
  email: string | null;
  prevision: string;
  prevision_salud?: string | null;
  estado: string;
  plan_id: string | null;
  nombre_plan: string | null;
  sesiones_totales: number;
  sesiones_usadas: number;
  sesiones_restantes: number;
  estado_plan: 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan' | string;
  estado_pago: 'pagado' | 'pendiente' | null;
  monto_clp: number | null;
  ultimo_dolor_ena?: number | null;
  dias_sin_atencion?: number | null;
  motivo_consulta?: string | null;
  diagnostico_principal?: string | null;
  diagnostico_medico?: string | null;
  fecha_nacimiento?: string | null;
  antecedentes_morbidos?: string | null;
  antecedentes_medicos?: string | null;
  banderas_rojas?: string | null;
  alertas_seguridad?: string | null;
}

const CHIPS_TMO = [
  { id: 'todos', label: 'Todos' },
  { id: 'lumbar', label: '🦴 Lumbar / Pelvis' },
  { id: 'cervical', label: '💆 Cervical / Dorsal' },
  { id: 'hombro', label: '💪 Hombro / EESS' },
  { id: 'eeii', label: '🦵 Rodilla / Tobillo' },
  { id: 'atm', label: '🦷 ATM' },
];

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [loading, setLoading] = useState(true);

  // Modos de vista y filtros
  const [modoVista, setModoVista] = useState<'tabla' | 'kanban'>('tabla');
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'vigentes' | 'renovar' | 'riesgo' | 'finalizados' | 'sin_plan'>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modales base
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState<any>(null);
  const [isAgendarModalOpen, setIsAgendarModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState<PacienteResumen | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal de Ajuste de Plan Táctil
  const [pacienteParaAjustarPlan, setPacienteParaAjustarPlan] = useState<PacienteResumen | null>(null);
  const [isManagePlanModalOpen, setIsManagePlanModalOpen] = useState(false);

  // Modales interactivos del Tablero Kanban
  const [pacienteParaAsignarPlan, setPacienteParaAsignarPlan] = useState<PacienteResumen | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [pacienteParaRenovar, setPacienteParaRenovar] = useState<PacienteResumen | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  const [pacienteParaAlta, setPacienteParaAlta] = useState<PacienteResumen | null>(null);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);

  const [selectedPacienteFichaId, setSelectedPacienteFichaId] = useState<string | null>(null);

  const handleAbrirEditar = (p: PacienteResumen) => {
    setPacienteParaEditar(p);
    setIsEditModalOpen(true);
  };

  const handleAbrirAjustarPlan = (p: PacienteResumen) => {
    setPacienteParaAjustarPlan(p);
    setIsManagePlanModalOpen(true);
  };

  const handleAbrirAjustePlan = (p: PacienteResumen) => {
    handleAbrirAjustarPlan(p);
  };

  const handleAgendarPaciente = (p: PacienteResumen) => {
    setPacienteParaAgendar({
      id: p.id,
      nombre_completo: p.nombre_completo,
      rut: p.rut,
      telefono: p.telefono,
    });
    setIsAgendarModalOpen(true);
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
          .select('*') // Sin límite (.limit) para mostrar el directorio completo (~122 pacientes)
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

          let sesionesTotales = Number(p.sesiones_totales ?? (p as any).total_sesiones ?? 0);
          let sesionesUsadas = Number(p.sesiones_usadas ?? (p as any).sesiones_consumidas ?? 0);
          let planId = p.plan_id || null;
          let nombrePlan = p.nombre_plan || null;
          let estadoPago = p.estado_pago || 'pagado';
          let rawEstadoPlan = (p.estado_plan || '').toLowerCase().trim();

          if (planElegido) {
            planId = planElegido.id;
            nombrePlan = planElegido.nombre_plan || planElegido.plan_nombre || nombrePlan;
            sesionesTotales = Number(planElegido.sesiones_totales ?? planElegido.total_sesiones ?? sesionesTotales);
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
          } else if (sesionesRestantes > 1) {
            estadoPlanFinal = 'vigente';
          } else {
            estadoPlanFinal = rawEstadoPlan || 'vigente';
          }

          return {
            ...raw,
            ...p,
            rut: p.rut && p.rut !== '—' ? p.rut : (raw.rut || '—'),
            telefono: p.telefono || raw.telefono || null,
            email: p.email || raw.email || null,
            prevision: p.prevision || raw.prevision || raw.prevision_salud || 'Particular',
            fecha_nacimiento: p.fecha_nacimiento || raw.fecha_nacimiento || null,
            motivo_consulta: p.motivo_consulta || raw.motivo_consulta || null,
            diagnostico_principal: p.diagnostico_principal || raw.diagnostico_principal || null,
            diagnostico_medico: p.diagnostico_medico || raw.diagnostico_medico || null,
            antecedentes_morbidos: raw.antecedentes_morbidos || raw.antecedentes_medicos || p.antecedentes_morbidos || null,
            antecedentes_medicos: raw.antecedentes_medicos || raw.antecedentes_morbidos || p.antecedentes_medicos || null,
            banderas_rojas: raw.banderas_rojas || raw.alertas_seguridad || p.banderas_rojas || null,
            alertas_seguridad: raw.alertas_seguridad || raw.banderas_rojas || p.alertas_seguridad || null,
            plan_id: planId,
            nombre_plan: nombrePlan,
            sesiones_totales: sesionesTotales,
            sesiones_usadas: sesionesUsadas,
            sesiones_restantes: sesionesRestantes,
            estado_plan: estadoPlanFinal,
            estado_pago: estadoPago,
          };
        });

      setPacientes(listaLimpia);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  // 2. Métricas y KPIs Superiores con Pestaña de Riesgo de Abandono
  const kpis = useMemo(() => {
    const vigentes = pacientes.filter(p => p.estado_plan === 'vigente').length;
    const porRenovar = pacientes.filter(p => p.estado_plan === 'por_renovar' || p.sesiones_restantes === 1).length;
    const enRiesgo = pacientes.filter(p => {
      const alerta = evaluarRiesgoDesercion({ ...p, sesiones_consumidas: p.sesiones_usadas } as any);
      return alerta.nivel !== null;
    }).length;
    const finalizados = pacientes.filter(p => p.estado_plan === 'finalizado').length;
    const sinPlan = pacientes.filter(p => p.estado_plan === 'sin_plan' || p.sesiones_totales === 0).length;
    return { vigentes, porRenovar, enRiesgo, finalizados, sinPlan, total: pacientes.length };
  }, [pacientes]);

  // 3. Filtrado por Búsqueda, Pestañas y Filtro Anatómico TMO
  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
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
      if (filtroTab === 'sin_plan' && p.estado_plan !== 'sin_plan' && p.sesiones_totales > 0) return false;

      // Filtro Anatómico / Segmentario TMO
      if (filtroSegmento !== 'todos') {
        const seg = detectarSegmentoTMO(p);
        if (seg !== filtroSegmento) return false;
      }

      return true;
    });
  }, [pacientes, busqueda, filtroTab, filtroSegmento]);

  // 4. Columnas del Tablero Kanban según ciclo clínico
  const kanbanColumnas = useMemo(() => {
    // Columna 1: Evaluación / Nuevos (sin plan o 1 sesión realizada pendientes de definir plan)
    const evaluacionNuevos = pacientesFiltrados.filter(p => {
      const { tienePlan, sesionesUsadas } = getResumenPlan(p);
      const isSinPlan = !tienePlan || p.estado_plan === 'sin_plan' || (p.sesiones_totales || 0) === 0;
      const isUnaSesionPendiente = (p.sesiones_totales === 1 && sesionesUsadas >= 1) || (sesionesUsadas === 1 && isSinPlan);
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
    <div className="min-h-screen bg-cloud pb-16 font-gilroy text-ink-navy overflow-x-hidden">
      
      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 print:hidden overflow-x-hidden">
        
        {/* Título y Acciones Globales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-ink-navy tracking-tight">Directorio Clínico y Pacientes</h1>
            <p className="text-[14px] text-slate-gray mt-1">Control de tratamientos activos, saldos de sesiones y fichas clínicas.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => cargarPacientes()}
              className="px-4 py-2 rounded-buttons border border-hairline bg-paper text-slate-gray hover:bg-pebble text-[14px] font-semibold transition-colors shadow-calendly-btn"
            >
              ⟳ Actualizar
            </button>
            <button 
              onClick={() => setIsSaleModalOpen(true)}
              className="px-4 py-2 rounded-buttons bg-ink-navy hover:bg-slate-gray text-white text-[14px] font-semibold transition-colors shadow-calendly-btn"
            >
              + Registrar Venta
            </button>
            <button 
              onClick={() => setIsPatientModalOpen(true)}
              className="px-4 py-2 rounded-buttons bg-signal-blue hover:bg-deep-cobalt text-white text-[14px] font-semibold transition-colors shadow-calendly-btn flex items-center gap-1.5"
            >
              + Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Tarjetas KPI Superiores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg">
            <div>
              <p className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Planes Vigentes</p>
              <p className="text-[38px] font-bold text-ink-navy tracking-tight leading-tight">{kpis.vigentes}</p>
              <p className="text-[12px] text-mist-gray mt-0.5">En tratamiento activo</p>
            </div>
            <div className="w-12 h-12 rounded-inputs bg-pebble text-signal-blue flex items-center justify-center font-bold text-xl">
              ✓
            </div>
          </div>

          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg">
            <div>
              <p className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Por Renovar</p>
              <p className="text-[38px] font-bold text-ink-navy tracking-tight leading-tight">{kpis.porRenovar}</p>
              <p className="text-[12px] text-mist-gray mt-0.5">1 sesión restante</p>
            </div>
            <div className="w-12 h-12 rounded-inputs bg-pebble text-ink-navy flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
          </div>

          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg">
            <div>
              <p className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Total Pacientes</p>
              <p className="text-[38px] font-bold text-ink-navy tracking-tight leading-tight">{kpis.total}</p>
              <p className="text-[12px] text-mist-gray mt-0.5">{kpis.finalizados} planes finalizados</p>
            </div>
            <div className="w-12 h-12 rounded-inputs bg-cloud text-slate-gray flex items-center justify-center font-bold text-xl">
              👥
            </div>
          </div>
        </div>

        {/* 1. Barra de Filtro Anatómico / Segmentario TMO */}
        <div className="bg-paper p-3 rounded-cards border border-hairline shadow-calendly space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-hairline">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-gray">
                Segmento TMO:
              </span>
              <span className="text-[12px] text-mist-gray hidden md:inline">
                Filtra pacientes por región anatómica tratada
              </span>
            </div>

            {/* 2. Selector de Modo de Vista ([ 🗃️ Tarjetas ] vs [ 🗂️ Tablero ]) */}
            <div className="flex items-center p-1 bg-pebble rounded-inputs border border-hairline self-start sm:self-auto">
              <button
                onClick={() => setModoVista('tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
                  modoVista === 'tabla'
                    ? 'bg-paper text-ink-navy shadow-calendly font-bold'
                    : 'text-slate-gray hover:text-ink-navy'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>

              <button
                onClick={() => setModoVista('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
                  modoVista === 'kanban'
                    ? 'bg-paper text-signal-blue shadow-calendly font-bold'
                    : 'text-slate-gray hover:text-ink-navy'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tablero</span>
              </button>
            </div>
          </div>

          {/* Chips anatómicos con conteo dinámico y scroll horizontal fluido */}
          <div className="flex items-center gap-1.5 p-2 bg-pebble rounded-2xl border border-hairline overflow-x-auto no-scrollbar py-1.5">
            {CHIPS_TMO.map((s) => {
              const count =
                s.id === 'todos'
                  ? pacientes.length
                  : pacientes.filter((p) => detectarSegmentoTMO(p) === s.id).length;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFiltroSegmento(s.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    filtroSegmento === s.id
                      ? 'bg-ink-navy text-white shadow-calendly-btn font-bold'
                      : 'bg-paper text-slate-gray hover:text-ink-navy hover:bg-white border border-hairline'
                  }`}
                >
                  {s.label} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-paper p-3 rounded-cards border border-hairline shadow-calendly">
          {/* Pestañas de Filtro Clínico */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-pebble rounded-inputs border border-hairline scrollbar-thin">
            <button
              onClick={() => setFiltroTab('todos')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'todos' ? 'bg-paper text-ink-navy shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              Todos ({kpis.total})
            </button>
            <button
              onClick={() => setFiltroTab('vigentes')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'vigentes' ? 'bg-paper text-emerald-700 shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              🟢 Vigentes ({kpis.vigentes})
            </button>
            <button
              onClick={() => setFiltroTab('renovar')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'renovar' ? 'bg-paper text-amber-700 shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              🟡 Por Renovar ({kpis.porRenovar})
            </button>
            <button
              onClick={() => setFiltroTab('riesgo')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'riesgo' ? 'bg-paper text-rose-700 shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              🔴 En Riesgo de Abandono ({kpis.enRiesgo})
            </button>
            <button
              onClick={() => setFiltroTab('finalizados')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'finalizados' ? 'bg-paper text-slate-700 shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              ⚪ Finalizados ({kpis.finalizados})
            </button>
            <button
              onClick={() => setFiltroTab('sin_plan')}
              className={`px-3.5 py-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${filtroTab === 'sin_plan' ? 'bg-paper text-slate-500 shadow-calendly' : 'text-slate-gray hover:text-ink-navy'}`}
            >
              ⚪ Sin Plan ({kpis.sinPlan})
            </button>
          </div>

          {/* Buscador */}
          <div className="relative flex-1 max-w-md px-2">
            <input
              type="text"
              placeholder="Buscar por Nombre, RUT o Teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 3. Renderizado Condicional: Tabla vs Kanban */}
        {modoVista === 'kanban' ? (
          /* TABLERO KANBAN DE 5 COLUMNAS */
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

                  {/* Lista de Cards de la Columna */}
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

                        // Estilo dinámico de borde según la columna
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
                                <Link
                                  href={`/agenda?pacienteId=${p.id}&ficha=true`}
                                  className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1"
                                  title={p.nombre_completo}
                                >
                                  {p.nombre_completo}
                                </Link>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0">
                                  {p.prevision || 'Part'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {/* Chip Anatómico TMO */}
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${segmentoInfo.colorClass}`}
                                >
                                  {segmentoInfo.shortLabel}
                                </span>

                                {p.rut && (
                                  <span className="font-mono text-[10px] text-slate-400">
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
                                <p className="text-[10px] text-slate-400">
                                  {sesionesUsadas > 0 ? `${sesionesUsadas} sesión realizada` : 'Evaluación inicial pendiente'}
                                </p>
                              </div>
                            )}

                            {col.id === 'tratamiento' && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
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
                                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
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
                                  <p className="text-[10px] text-rose-600">
                                    {p.dias_sin_atencion} días sin control kinésico
                                  </p>
                                )}
                              </div>
                            )}

                            {col.id === 'alta' && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 space-y-0.5">
                                <p className="font-semibold text-slate-800">✅ Plan Completado</p>
                                <p className="text-[10px] text-slate-400">
                                  {sesionesTotales} sesiones completadas con éxito
                                </p>
                              </div>
                            )}

                            {/* Botones de Acción Contextuales por Columna */}
                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              {col.id === 'evaluacion' && (
                                <button
                                  onClick={() => {
                                    setPacienteParaAsignarPlan(p);
                                    setIsAssignModalOpen(true);
                                  }}
                                  className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Asignar Plan</span>
                                </button>
                              )}

                              {col.id === 'tratamiento' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setPacienteParaAgendar({
                                        id: p.id,
                                        nombre_completo: p.nombre_completo,
                                        rut: p.rut,
                                        telefono: p.telefono,
                                      });
                                      setIsAgendarModalOpen(true);
                                    }}
                                    className="flex-1 py-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all text-center cursor-pointer"
                                  >
                                    Agendar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirAjustarPlan(p)}
                                    className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all text-center cursor-pointer"
                                    title="Ajustar plan"
                                  >
                                    ⚙️
                                  </button>
                                  <Link
                                    href={`/agenda?pacienteId=${p.id}&ficha=true`}
                                    className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg transition-all text-center flex items-center justify-center gap-0.5"
                                  >
                                    <span>Ficha</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </>
                              )}

                              {col.id === 'renovar' && (
                                <button
                                  onClick={() => {
                                    setPacienteParaRenovar(p);
                                    setIsRenewModalOpen(true);
                                  }}
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
                                  <Link
                                    href={`/agenda?pacienteId=${p.id}&ficha=true`}
                                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all"
                                    title="Ver Ficha"
                                  >
                                    →
                                  </Link>
                                </>
                              )}

                              {col.id === 'alta' && (
                                <button
                                  onClick={() => {
                                    setPacienteParaAlta(p);
                                    setIsDischargeModalOpen(true);
                                  }}
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
        ) : (
          /* GRID DE TARJETAS CLÍNICAS RESPONSIVE (PatientCardGrid) */
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-52 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No se encontraron pacientes con los criterios de búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
                {pacientesFiltrados.map((p) => {
                  const riesgo = evaluarRiesgoDesercion({ ...p, sesiones_consumidas: p.sesiones_usadas } as any);
                  const esRiesgo = riesgo.nivel !== null;
                  const tienePlan = p.sesiones_totales > 0;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      {/* 1. Cabecera de la Tarjeta: Nombre, Previsión y Alerta de Riesgo */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-sm leading-snug truncate" title={p.nombre_completo}>
                              {p.nombre_completo}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                              {p.rut || 'Sin RUT'} {p.telefono ? `• ${p.telefono}` : ''}
                            </p>
                          </div>

                          {/* Badge de Previsión */}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
                            {p.prevision || 'Particular'}
                          </span>
                        </div>

                        {/* Alerta de Deserción si aplica */}
                        {esRiesgo && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${riesgo.badgeClass}`}>
                              {riesgo.etiqueta}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2. Bloque de Tratamiento y Saldo de Sesiones */}
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Tratamiento
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAbrirAjustePlan(p)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-0.5"
                            title="Editar sesiones del plan"
                          >
                            ⚙️ Ajustar
                          </button>
                        </div>

                        {tienePlan ? (
                          <div>
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span className="truncate max-w-[170px]" title={p.nombre_plan || 'Plan Kinésico'}>
                                {p.nombre_plan || 'Plan Kinésico'}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {p.sesiones_usadas}/{p.sesiones_totales} ses.
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  p.estado_plan === 'finalizado'
                                    ? 'bg-slate-400'
                                    : p.estado_plan === 'por_renovar'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, (p.sesiones_usadas / p.sesiones_totales) * 100)}%`
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {p.sesiones_restantes} sesiones restantes disponibles
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic py-1">Sin plan activo asignado</p>
                        )}
                      </div>

                      {/* 3. Botonera Inferior de Acciones */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {esRiesgo && p.telefono && (
                            <a
                              href={`https://wa.me/56${(p.telefono || '').replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent(riesgo.mensajeWhatsApp)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors"
                              title="Contactar por WhatsApp"
                            >
                              💬 Reactivar
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAbrirEditar(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Editar datos / RUT"
                          >
                            ✏️
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAgendarPaciente(p)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            Agendar
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirFichaPaciente(p.id)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                          >
                            Ficha →
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODALES DEL SISTEMA */}
        <SaleModal 
          isOpen={isSaleModalOpen} 
          onClose={() => setIsSaleModalOpen(false)} 
          onSuccess={cargarPacientes}
        />

        <PatientModal
          open={isPatientModalOpen}
          onOpenChange={setIsPatientModalOpen}
          onPatientSaved={() => {
            setFiltroTab('todos');
            cargarPacientes();
          }}
        />
        
        {isAgendarModalOpen && (
          <AppointmentModal
            isOpen={isAgendarModalOpen}
            preselectedPatient={pacienteParaAgendar}
            onClose={() => {
              setIsAgendarModalOpen(false);
              setPacienteParaAgendar(null);
            }}
            onSuccess={() => {
              toast.success('Cita agendada correctamente');
            }}
          />
        )}

        {/* Modal para Asignar Plan (Columna 1 del Kanban) */}
        {isAssignModalOpen && pacienteParaAsignarPlan && (
          <AssignTreatmentModal
            isOpen={isAssignModalOpen}
            paciente={pacienteParaAsignarPlan}
            onClose={() => {
              setIsAssignModalOpen(false);
              setPacienteParaAsignarPlan(null);
            }}
            onSuccess={() => {
              cargarPacientes();
            }}
          />
        )}

        {/* Modal para Ofrecer Continuidad / Renovar Plan (Columna 3 del Kanban) */}
        {isRenewModalOpen && pacienteParaRenovar && (
          <RenewPlanDialog
            pacienteId={pacienteParaRenovar.id}
            pacienteNombre={pacienteParaRenovar.nombre_completo}
            open={isRenewModalOpen}
            onOpenChange={(open) => {
              setIsRenewModalOpen(open);
              if (!open) setPacienteParaRenovar(null);
            }}
            onPlanPurchased={() => {
              cargarPacientes();
            }}
          />
        )}

        {/* Modal de Informe de Alta Médica (Columna 5 del Kanban) */}
        {isDischargeModalOpen && pacienteParaAlta && (
          <DischargeReportModal
            isOpen={isDischargeModalOpen}
            onClose={() => {
              setIsDischargeModalOpen(false);
              setPacienteParaAlta(null);
            }}
            patient={pacienteParaAlta}
          />
        )}

        {isEditModalOpen && pacienteParaEditar && (
          <EditPatientDialog
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setPacienteParaEditar(null);
            }}
            patient={pacienteParaEditar}
            onPatientUpdated={(updated) => {
              cargarPacientes();
            }}
            onPatientDeleted={() => {
              setIsEditModalOpen(false);
              setPacienteParaEditar(null);
              cargarPacientes();
            }}
          />
        )}

        {/* Modal de Gestión y Edición Táctil de Planes */}
        {isManagePlanModalOpen && pacienteParaAjustarPlan && (
          <ManagePlanModal
            isOpen={isManagePlanModalOpen}
            onClose={() => {
              setIsManagePlanModalOpen(false);
              setPacienteParaAjustarPlan(null);
            }}
            paciente={pacienteParaAjustarPlan}
            planActual={{
              id: pacienteParaAjustarPlan.plan_id,
              nombre_plan: pacienteParaAjustarPlan.nombre_plan,
              sesiones_totales: pacienteParaAjustarPlan.sesiones_totales,
              sesiones_usadas: pacienteParaAjustarPlan.sesiones_usadas,
              estado: pacienteParaAjustarPlan.estado_plan,
              estado_pago: pacienteParaAjustarPlan.estado_pago,
            }}
            onSuccess={async () => {
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
      </main>
    </div>
  );
}
