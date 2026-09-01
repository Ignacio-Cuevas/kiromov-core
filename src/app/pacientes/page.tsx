'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { PatientModal } from '@/components/patients/PatientModal';
import { SaleModal } from '@/components/sales/SaleModal';
import { PayPlanModal } from '@/components/patients/PayPlanModal';
import { PatientDrawer } from '@/components/patients/PatientDrawer';
import { createClient } from '@/utils/supabase/client';
import { fetchVistaResumenPacientes } from '@/lib/supabase';
import { formatRut } from '@/lib/utils';
import {
  UserPlus,
  Search,
  ShoppingCart,
  CalendarDays,
  Edit2,
  RefreshCw,
  Phone,
  Mail,
  FolderOpen,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Activity,
  PackageCheck,
  AlertTriangle,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import Link from 'next/link';

export type PlanFilterTab = 'todos' | 'vigentes' | 'por_renovar' | 'finalizados' | 'sin_plan';

function getPlanCategory(
  estadoPlan?: string | null
): 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan' {
  if (!estadoPlan) return 'sin_plan';
  const s = estadoPlan.toLowerCase().trim();
  if (s === 'vigente' || s === 'plan vigente' || s === 'activo') return 'vigente';
  if (
    s === 'por_renovar' ||
    s === 'por renovar' ||
    s.includes('por renovar') ||
    s.includes('renovar') ||
    s.includes('1 restante')
  ) {
    return 'por_renovar';
  }
  if (s === 'finalizado' || s === 'plan finalizado' || s === 'completed') {
    return 'finalizado';
  }
  if (s === 'sin_plan' || s === 'sin plan' || s === 'sin plan activo') {
    return 'sin_plan';
  }
  return 'sin_plan';
}



export default function PatientsPage() {
  const supabase = createClient();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<PlanFilterTab>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<any | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [patientTargetSale, setPatientTargetSale] = useState<any | null>(null);
  const [isPayPlanOpen, setIsPayPlanOpen] = useState(false);
  const [planToPay, setPlanToPay] = useState<any | null>(null);
  const [patientNameToPay, setPatientNameToPay] = useState<string>('');
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Helper: determina si un paciente tiene plan vigente basado en datos disponibles
  const tienePlanVigente = (p: any): boolean => {
    if (!p) return false;
    const estadoValido = ['vigente', 'activo', 'por_renovar', 'plan vigente'].includes(
      (p.estado_plan || '').toLowerCase().trim()
    );
    const tieneSaldo =
      Number(p.sesiones_restantes) > 0 ||
      Number(p.sesiones_totales) > Number(p.sesiones_usadas);
    return Boolean(p.plan_id || p.nombre_plan) && (estadoValido || tieneSaldo);
  };

  // 1. Cargar Datos — FUENTE PRIMARIA: vista_resumen_pacientes (PostgreSQL calcula saldos y estado)
  //    Solo si la vista no devuelve datos, se recurre a reconciliación manual con tablas subyacentes.
  const loadData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      let vistaData: any[] = [];
      let useVistaDirectly = false;

      if (supabase) {
        // Paso 1: Consultar la vista materializada — fuente de verdad
        try {
          const { data: vData, error: vErr } = await supabase
            .from('vista_resumen_pacientes')
            .select('*')
            .order('nombre_completo', { ascending: true });

          if (!vErr && vData && vData.length > 0) {
            vistaData = vData;
            useVistaDirectly = true;
          } else if (vErr) {
            console.warn('[Diagnóstico] Error en vista_resumen_pacientes:', vErr.message);
          }
        } catch (err) {
          console.warn('[Diagnóstico] Excepción al consultar vista:', err);
        }
      }

      // Paso 2: Si la vista devolvió datos, usarlos directamente SIN sobreescribir
      if (useVistaDirectly && vistaData.length > 0) {
        const finalPatients = vistaData.map((p: any) => {
          const totalSes = Number(p.sesiones_totales ?? 0);
          const usedSes = Number(p.sesiones_usadas ?? 0);
          const remainingSes = p.sesiones_restantes !== undefined && p.sesiones_restantes !== null
            ? Number(p.sesiones_restantes)
            : Math.max(0, totalSes - usedSes);
          const percent = totalSes > 0 ? Math.min(100, Math.round((usedSes / totalSes) * 100)) : 0;

          // Normalizar estado_plan desde la vista (ya viene calculado por PostgreSQL)
          const rawEstado = (p.estado_plan || '').toLowerCase().trim();
          let estadoPlan: string;
          if (rawEstado === 'vigente' || rawEstado === 'plan vigente' || rawEstado === 'activo') {
            estadoPlan = remainingSes === 1 ? 'por_renovar' : 'vigente';
          } else if (rawEstado === 'por_renovar' || rawEstado === 'por renovar' || rawEstado.includes('renovar')) {
            estadoPlan = 'por_renovar';
          } else if (rawEstado === 'finalizado' || rawEstado === 'plan finalizado' || rawEstado === 'completed') {
            estadoPlan = 'finalizado';
          } else if (totalSes > 0 && remainingSes > 0) {
            // La vista tiene sesiones pero el estado no matchea — inferir del saldo
            estadoPlan = remainingSes === 1 ? 'por_renovar' : 'vigente';
          } else if (totalSes > 0 && remainingSes <= 0) {
            estadoPlan = 'finalizado';
          } else {
            estadoPlan = 'sin_plan';
          }

          // Detectar cobro pendiente desde la vista
          const rawPago = (p.estado_pago || '').toLowerCase().trim();
          const hasPending = rawPago.includes('pendiente') || rawPago === 'pending' || rawPago === 'unpaid';

          return {
            id: p.id,
            codigo_paciente: p.codigo_paciente || 'PAC-CLINIC',
            nombre_completo: p.nombre_completo || 'Paciente Sin Nombre',
            full_name: p.nombre_completo || 'Paciente Sin Nombre',
            rut: p.rut || '',
            telefono: p.telefono || p.phone || '',
            phone: p.telefono || p.phone || '',
            email: p.email || '',
            prevision: p.prevision || p.prevision_salud || p.health_insurance || 'Particular',
            prevision_salud: p.prevision || p.prevision_salud || p.health_insurance || 'Particular',
            health_insurance: p.prevision || p.prevision_salud || p.health_insurance || 'Particular',
            diagnostico_principal: p.diagnostico_principal || p.diagnostico_medico || p.motivo_consulta || '',
            medical_notes: p.diagnostico_principal || p.diagnostico_medico || p.motivo_consulta || '',
            plan_id: p.plan_id || (totalSes > 0 ? 'active-plan' : null),
            nombre_plan: p.nombre_plan || (totalSes > 0 ? 'Plan de Kinesiología' : null),
            sesiones_totales: totalSes,
            total_sesiones: totalSes,
            total_sessions: totalSes,
            sesiones_usadas: usedSes,
            sesiones_consumidas: usedSes,
            used_sessions: usedSes,
            sesiones_restantes: remainingSes,
            remaining_sessions: remainingSes,
            percent,
            estado_plan: estadoPlan,
            has_pending_payment: hasPending,
            pending_plan: hasPending ? { id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp } : null,
            active_plan: p.plan_id ? { id: p.plan_id, nombre_plan: p.nombre_plan } : null,
            planes: [],
            // Pasar campos adicionales de la vista sin transformar
            ultima_atencion: p.ultima_atencion,
            estado_pago: p.estado_pago,
            monto_clp: p.monto_clp,
          };
        });

        setPacientes(finalPatients);
        if (showToast) toast.success(`Directorio actualizado: ${finalPatients.length} pacientes cargados`);
        return;
      }

      // Paso 3: FALLBACK — La vista no devolvió datos, recurrir a tablas individuales
      let pacientesData: any[] = [];
      let comprasData: any[] = [];
      let citasData: any[] = [];

      if (supabase) {
        try {
          const [pRes, cpRes, caRes] = await Promise.all([
            supabase.from('pacientes').select('*').order('nombre_completo', { ascending: true }),
            supabase.from('compras_planes').select('*').order('fecha_compra', { ascending: false }),
            supabase.from('citas_atenciones').select('*'),
          ]);
          if (!pRes.error && pRes.data) pacientesData = pRes.data;
          if (!cpRes.error && cpRes.data) comprasData = cpRes.data;
          if (!caRes.error && caRes.data) citasData = caRes.data;
        } catch (err) {
          console.warn('[Fallback] Error al consultar tablas individuales:', err);
        }
      }

      const baseList = pacientesData.length > 0
        ? pacientesData
        : await fetchVistaResumenPacientes();

      // Mapa de citas asistidas por paciente
      const realAttendedMap = new Map<string, number>();
      citasData.forEach((c: any) => {
        const st = (c.estado || '').toLowerCase().trim();
        if (['asistió', 'asistio', 'atendido', 'completada', 'completado', 'inasistencia (descuenta sesión)'].includes(st)) {
          realAttendedMap.set(c.paciente_id, (realAttendedMap.get(c.paciente_id) || 0) + 1);
        }
      });

      // Mapa de compras por paciente
      const planesByPatientMap = new Map<string, any[]>();
      comprasData.forEach((cp: any) => {
        const list = planesByPatientMap.get(cp.paciente_id) || [];
        list.push(cp);
        planesByPatientMap.set(cp.paciente_id, list);
      });

      const finalPatients = baseList.map((p: any) => {
        const patientId = p.id || p.paciente_id;
        const patientPlans = planesByPatientMap.get(patientId) || [];
        const activePlan = patientPlans.find((pl: any) => pl.estado === 'activo') || patientPlans[0] || null;

        const usedSes = realAttendedMap.get(patientId) ??
          Number(p.sesiones_usadas ?? p.sesiones_consumidas ?? 0);
        let totalSes = patientPlans.reduce(
          (sum: number, pl: any) => sum + Number(pl.total_sesiones || pl.sesiones_totales || 0), 0
        );
        if (totalSes === 0) totalSes = Number(p.sesiones_totales ?? p.total_sesiones ?? 0);

        const remainingSes = Math.max(0, totalSes - usedSes);
        const percent = totalSes > 0 ? Math.min(100, Math.round((usedSes / totalSes) * 100)) : 0;

        let estadoPlan: string = 'sin_plan';
        if (totalSes === 0) estadoPlan = 'sin_plan';
        else if (remainingSes <= 0) estadoPlan = 'finalizado';
        else if (remainingSes === 1) estadoPlan = 'por_renovar';
        else estadoPlan = 'vigente';

        const pendingPlanObj = patientPlans.find((pl: any) => {
          const st = (pl.estado_pago || '').toLowerCase().trim();
          return st.includes('pendiente') || st === 'pending';
        });

        return {
          id: patientId,
          codigo_paciente: p.codigo_paciente || 'PAC-CLINIC',
          nombre_completo: p.nombre_completo || p.full_name || 'Paciente Sin Nombre',
          full_name: p.nombre_completo || p.full_name || 'Paciente Sin Nombre',
          rut: p.rut || '',
          telefono: p.telefono || p.phone || '',
          phone: p.telefono || p.phone || '',
          email: p.email || '',
          prevision: p.prevision || p.prevision_salud || 'Particular',
          prevision_salud: p.prevision || p.prevision_salud || 'Particular',
          health_insurance: p.prevision || p.prevision_salud || 'Particular',
          diagnostico_principal: p.diagnostico_principal || p.diagnostico_medico || p.motivo_consulta || '',
          medical_notes: p.diagnostico_principal || p.diagnostico_medico || p.motivo_consulta || '',
          plan_id: activePlan?.id || p.plan_id || (totalSes > 0 ? 'active-plan' : null),
          nombre_plan: activePlan?.nombre_plan || p.nombre_plan || (totalSes > 0 ? 'Plan de Kinesiología' : null),
          sesiones_totales: totalSes,
          total_sesiones: totalSes,
          total_sessions: totalSes,
          sesiones_usadas: usedSes,
          sesiones_consumidas: usedSes,
          used_sessions: usedSes,
          sesiones_restantes: remainingSes,
          remaining_sessions: remainingSes,
          percent,
          estado_plan: estadoPlan,
          has_pending_payment: !!pendingPlanObj,
          pending_plan: pendingPlanObj || null,
          active_plan: activePlan,
          planes: patientPlans,
        };
      });

      setPacientes(finalPatients);
      if (showToast) toast.success(`Directorio actualizado: ${finalPatients.length} pacientes cargados`);
    } catch (err) {
      console.error('[loadData] Error fatal:', err);
      toast.error('Error al cargar pacientes');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Conteos dinámicos para pestañas y métricas
  const { vigentesCount, porRenovarCount, finalizadosCount, sinPlanCount } = useMemo(() => {
    const planesVigentes = pacientes.filter(p => p.estado_plan === 'vigente').length;
    const porRenovar = pacientes.filter(p => p.estado_plan === 'por_renovar').length;
    const finalizados = pacientes.filter(p => p.estado_plan === 'finalizado').length;
    const sinPlan = pacientes.filter(p => !p.estado_plan || p.estado_plan === 'sin_plan').length;

    return {
      vigentesCount: planesVigentes,
      porRenovarCount: porRenovar,
      finalizadosCount: finalizados,
      sinPlanCount: sinPlan,
    };
  }, [pacientes]);

  // Filtrado reactivo por pestaña y búsqueda
  const filteredPatients = useMemo(() => {
    return pacientes.filter((p) => {
      // 1. Filtro por Pestaña
      const estado = p.estado_plan || 'sin_plan';
      if (activeFilterTab === 'vigentes') {
        if (estado !== 'vigente' && estado !== 'por_renovar') return false;
      } else if (activeFilterTab === 'por_renovar') {
        if (estado !== 'por_renovar') return false;
      } else if (activeFilterTab === 'finalizados') {
        if (estado !== 'finalizado') return false;
      } else if (activeFilterTab === 'sin_plan') {
        if (estado !== 'sin_plan') return false;
      }

      // 2. Filtro por Búsqueda (Nombre, RUT, Teléfono)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
      const qClean = q.replace(/[^0-9kK]/g, '');

      return (
        p.nombre_completo.toLowerCase().includes(q) ||
        (qClean.length >= 2 && rutClean.includes(qClean)) ||
        (p.telefono && p.telefono.includes(q)) ||
        (p.diagnostico_principal && p.diagnostico_principal.toLowerCase().includes(q))
      );
    });
  }, [pacientes, activeFilterTab, searchQuery]);

  const handleOpenCreate = () => {
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setPatientToEdit(p);
    setIsPatientModalOpen(true);
  };

  const handleOpenSale = (p: any) => {
    setPatientTargetSale(p);
    setIsSaleModalOpen(true);
  };

  const handleOpenPayPlan = (p: any) => {
    if (p.pending_plan) {
      setPlanToPay(p.pending_plan);
      setPatientNameToPay(p.nombre_completo);
      setIsPayPlanOpen(true);
    } else {
      handleOpenSale(p);
    }
  };

  const handleOpenDrawer = (p: any) => {
    setSelectedPatientForDrawer(p);
    setIsDrawerOpen(true);
  };

  const handlePatientSaved = () => {
    loadData();
  };

  const handleSaleCompleted = () => {
    loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSupabaseOnline={true}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Encabezado y Acciones Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Directorio Clínico de Pacientes</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/70 border border-blue-300/60 px-2.5 py-0.5 rounded-full">
                {pacientes.length} Registrados
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestión de fichas clínicas, control de saldos y planes en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-100 text-blue-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vista en Tabla"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-100 text-blue-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vista en Tarjetas"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs rounded-xl"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Nuevo Paciente</span>
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen Rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Pacientes</span>
              <span className="text-xl font-extrabold text-slate-900">{pacientes.length}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Planes Vigentes</span>
              <span className="text-xl font-extrabold text-emerald-600">{vigentesCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Por Renovar (1 ses.)</span>
              <span className="text-xl font-extrabold text-amber-600">{porRenovarCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Finalizados / Sin Plan</span>
              <span className="text-xl font-extrabold text-slate-600">{finalizadosCount + sinPlanCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Pestañas de Filtro y Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Pestañas Dinámicas */}
          <div className="inline-flex overflow-x-auto p-1 bg-slate-200/70 rounded-xl max-w-full text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setActiveFilterTab('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeFilterTab === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({pacientes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('vigentes')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeFilterTab === 'vigentes'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ● Planes Vigentes ({vigentesCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('por_renovar')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeFilterTab === 'por_renovar'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Por Renovar ({porRenovarCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('finalizados')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeFilterTab === 'finalizados'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Finalizados ({finalizadosCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('sin_plan')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeFilterTab === 'sin_plan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sin Plan ({sinPlanCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por Nombre, RUT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white border-slate-200 rounded-xl text-xs shadow-2xs"
            />
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-semibold">Cargando directorio de pacientes desde Supabase...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                {searchQuery || activeFilterTab !== 'todos'
                  ? 'No se encontraron pacientes con este filtro'
                  : 'No hay pacientes registrados'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || activeFilterTab !== 'todos'
                  ? 'Intenta restablecer los filtros para ver todos los pacientes.'
                  : 'Registra el primer paciente con el botón superior para comenzar.'}
              </p>
            </div>
            {searchQuery || activeFilterTab !== 'todos' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilterTab('todos');
                }}
                className="rounded-xl text-xs font-bold"
              >
                Limpiar Filtros
              </Button>
            ) : (
              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              >
                <UserPlus className="h-4 w-4" />
                <span>Registrar Paciente</span>
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View con consumo exacto de campos */
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 text-xs">
                  <TableHead className="min-w-[200px]">Paciente</TableHead>
                  <TableHead className="min-w-[130px]">RUT</TableHead>
<TableHead className="min-w-[110px]">Previsión</TableHead>
                  <TableHead className="min-w-[130px]">Teléfono</TableHead>
                  <TableHead className="min-w-[170px]">Saldo de Sesiones</TableHead>
                  <TableHead className="min-w-[160px]">Estado del Plan</TableHead>
                  <TableHead className="text-right min-w-[240px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((p) => {
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                      {/* Paciente */}
                      <TableCell className="font-medium text-slate-900 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(p)}
                          className="text-left hover:text-blue-600 transition-colors group"
                        >
                          <strong className="block text-sm font-bold text-slate-900 group-hover:text-blue-600 leading-snug">
                            {p.nombre_completo}
                          </strong>
                          {p.diagnostico_principal && (
                            <span className="text-[11px] text-blue-600 line-clamp-1">
                              {p.diagnostico_principal}
                            </span>
                          )}
                        </button>
                      </TableCell>

                      {/* RUT */}
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-700 min-w-[130px]">
                        {formatRut(p.rut)}
                      </TableCell>

                      {/* Previsión */}
                      <TableCell className="min-w-[110px]">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {p.prevision || 'Particular'}
                        </span>
                      </TableCell>

                      {/* Teléfono */}
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-600 min-w-[130px]">
                        {p.telefono || '—'}
                      </TableCell>

                      {/* Saldo de Sesiones */}
                      <TableCell className="min-w-[170px]">
                        {p.estado_plan !== 'sin_plan' && p.sesiones_totales > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <span>{p.sesiones_usadas ?? 0}/{p.sesiones_totales} ses.</span>
                              <span className="text-slate-400 font-normal">({p.sesiones_restantes ?? 0} rest.)</span>
                            </div>
                            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${Math.min(100, (((p.sesiones_usadas ?? 0) / p.sesiones_totales) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Sin plan activo</span>
                        )}
                      </TableCell>

                      {/* Estado del Plan (Insignias) */}
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          {p.estado_plan === 'vigente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Plan Vigente
                            </span>
                          )}
                          {p.estado_plan === 'por_renovar' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Por Renovar (1 rest.)
                            </span>
                          )}
                          {p.estado_plan === 'finalizado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Finalizado
                            </span>
                          )}
                          {(!p.estado_plan || p.estado_plan === 'sin_plan') && (
                            <span className="text-slate-400 text-xs">Sin Plan Activo</span>
                          )}
                          {/* Advertencia de Cobro Pendiente */}
                          {p.has_pending_payment && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 whitespace-nowrap mt-1">
                              <AlertTriangle className="w-3 h-3" /> Pago Pendiente
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right min-w-[240px]">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleOpenDrawer(p)}
                            className="h-8 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 font-semibold text-xs gap-1 rounded-xl shadow-2xs shrink-0"
                            title="Abrir ficha clínica del paciente"
                          >
                            <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                            <span>Ficha</span>
                          </Button>

                          {p.has_pending_payment ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayPlan(p)}
                              className="h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1 rounded-xl shadow-2xs shrink-0"
                              title="Cobrar plan adeudado"
                            >
                              <CreditCard className="h-3.5 w-3.5 shrink-0" />
                              <span>Cobrar</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenSale(p)}
                              className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 font-semibold text-xs gap-1 rounded-xl shadow-2xs shrink-0"
                              title="Vender o asignar sesiones"
                            >
                              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                              <span>Venta</span>
                            </Button>
                          )}

                          <Link
                            href={`/agenda?pacienteId=${p.id}`}
                            className="h-8 px-2.5 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 font-semibold text-xs gap-1 rounded-xl transition-colors shadow-2xs shrink-0"
                            title="Agendar cita"
                          >
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>Agendar</span>
                          </Link>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs gap-1 rounded-xl shadow-2xs shrink-0"
                            title="Editar datos"
                          >
                            <Edit2 className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>Editar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((p) => {
              const hasPlan =
                p.plan_id ||
                (p.sesiones_totales && p.sesiones_totales > 0) ||
                (p.total_sesiones && p.total_sesiones > 0);

              const total = p.sesiones_totales || p.total_sesiones || 0;
              const used = p.sesiones_usadas ?? p.sesiones_consumidas ?? 0;
              const remaining = p.sesiones_restantes ?? Math.max(0, total - used);
              const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
              const planCat = getPlanCategory(p.estado_plan);

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Name and Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(p)}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-base font-bold text-slate-900 leading-snug truncate hover:text-blue-600">
                            {p.nombre_completo}
                          </h3>
                        </button>
                        <span className="text-xs font-mono text-slate-500 whitespace-nowrap block mt-0.5">
                          RUT: {formatRut(p.rut)}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {p.prevision || 'Particular'}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-slate-600">
                      {p.telefono && (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{p.telefono}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Medical Diagnosis if available */}
                    {p.diagnostico_principal && (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 line-clamp-2">
                        <strong className="block text-[11px] text-blue-700 uppercase font-bold">
                          Diagnóstico / Motivo:
                        </strong>
                        {p.diagnostico_principal}
                      </div>
                    )}

                    {/* Session Balance Card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Saldo de Sesiones:</span>
                        {hasPlan ? (
                          <span className="font-bold text-slate-900">
                            {used} / {total} ses. ({remaining} rest.)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin plan activo</span>
                        )}
                      </div>
                      {hasPlan && <Progress value={percent} className="h-2" />}

                      {/* Badge de Estado del Plan */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-1">
                        <div>
                          {planCat === 'vigente' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                              ● Plan Vigente
                            </span>
                          )}
                          {planCat === 'por_renovar' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100/80 text-amber-800 border border-amber-200">
                              ⚠️ Por Renovar (1 rest.)
                            </span>
                          )}
                          {planCat === 'finalizado' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700">
                              Finalizado
                            </span>
                          )}
                          {planCat === 'sin_plan' && (
                            <span className="text-slate-400 text-xs italic">Sin Plan Activo</span>
                          )}
                        </div>

                        {p.has_pending_payment && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayPlan(p)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          >
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            <span>⚠️ Cobro Pendiente</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => handleOpenDrawer(p)}
                      className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold text-xs gap-1 rounded-xl shadow-2xs"
                      title="Abrir ficha clínica"
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span>Ficha</span>
                    </Button>

                    {p.has_pending_payment ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenPayPlan(p)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1 rounded-xl shadow-2xs"
                        title="Cobrar plan adeudado"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Cobrar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleOpenSale(p)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 rounded-xl shadow-2xs"
                        title="Vender o asignar sesiones a este paciente"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>Venta</span>
                      </Button>
                    )}

                    <Link
                      href={`/agenda?pacienteId=${p.id}`}
                      className="h-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 font-bold text-xs gap-1 rounded-xl transition-colors shadow-2xs"
                      title="Agendar cita en el calendario"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Agenda</span>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(p)}
                      className="h-8 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1 rounded-xl shadow-2xs"
                      title="Editar datos del paciente"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Editar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Patient Create / Edit Modal */}
      <PatientModal
        open={isPatientModalOpen}
        onOpenChange={setIsPatientModalOpen}
        patientToEdit={patientToEdit}
        onPatientSaved={handlePatientSaved}
      />

      {/* Sale / Billing Modal */}
      <SaleModal
        open={isSaleModalOpen}
        onOpenChange={setIsSaleModalOpen}
        initialPatient={patientTargetSale}
        onSaleCompleted={handleSaleCompleted}
      />

      {/* Pay Plan Modal */}
      {isPayPlanOpen && planToPay && (
        <PayPlanModal
          open={isPayPlanOpen}
          onOpenChange={setIsPayPlanOpen}
          onClose={() => {
            setIsPayPlanOpen(false);
            setPlanToPay(null);
          }}
          plan={planToPay}
          patientName={patientNameToPay}
          onSuccess={() => loadData(true)}
        />
      )}

      {/* Patient Clinical Drawer */}
      <PatientDrawer
        patient={selectedPatientForDrawer}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onAttendanceRegistered={() => loadData()}
      />
    </div>
  );
}
