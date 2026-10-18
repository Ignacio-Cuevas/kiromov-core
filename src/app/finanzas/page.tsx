'use client';

import React, { Suspense, useEffect, useState, useMemo, Fragment } from "react";
import { PaymentCheckoutModal } from "@/components/sales/PaymentCheckoutModal";
import { CancelPlanModal } from "@/components/sales/CancelPlanModal";
import { EditExpenseModal } from "@/components/finanzas/EditExpenseModal";
import { createClient } from "@/utils/supabase/client";
import { formatCLP, formatRut, getChileanDate } from '@/lib/utils';
import { Loader2, Plus, CreditCard, TrendingUp, TrendingDown, DollarSign, CheckCircle2, AlertTriangle, X, ChevronRight, ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

// Componentes UI dummy para no romper dependencias
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getArancel } from '@/lib/pricing';

export interface DesgloseDeuda {
  tipo: 'plan' | 'cita';
  id: string;
  fecha: string;
  detalle: string;
  saldo: number;
}

export interface DeudorConsolidado {
  pacienteId: string;
  paciente: any;
  totalDeuda: number;
  desglose: DesgloseDeuda[];
}

type PeriodoFiltro = 'este_mes' | 'mes_anterior' | 'este_semestre' | 'este_ano' | 'todo';
type TabName = 'deben' | 'pagados' | 'planes' | 'egresos';

function FinanzasContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('este_mes');
  const [activeTab, setActiveTab] = useState<TabName>('deben');

  // Datos
  const [citas, setCitas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);

  // Modal Egresos
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [savingEgreso, setSavingEgreso] = useState(false);
  const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito', fecha: '' });
  const [editingEgreso, setEditingEgreso] = useState<any | null>(null);

  const [expandedDeudores, setExpandedDeudores] = useState<Set<string>>(new Set());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDeudorForCheckout, setSelectedDeudorForCheckout] = useState<DeudorConsolidado | null>(null);
  const [selectedDeudaItemForCheckout, setSelectedDeudaItemForCheckout] = useState<any | null>(null);
  const [cancelingPlan, setCancelingPlan] = useState<any>(null);

  const getRangoFechas = (tipo: string) => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = ahora.getMonth();

    if (tipo === 'este_mes') {
      return {
        inicio: new Date(year, month, 1, 0, 0, 0),
        fin: new Date(year, month + 1, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'mes_anterior') {
      return {
        inicio: new Date(year, month - 1, 1, 0, 0, 0),
        fin: new Date(year, month, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'este_semestre') {
      const semestre = month < 6 ? 0 : 6;
      return {
        inicio: new Date(year, semestre, 1, 0, 0, 0),
        fin: new Date(year, semestre + 6, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'este_ano') {
      return {
        inicio: new Date(year, 0, 1, 0, 0, 0),
        fin: new Date(year, 11, 31, 23, 59, 59, 999)
      };
    }
    return {
      inicio: new Date(2020, 0, 1),
      fin: new Date(2030, 11, 31)
    };
  };

  const [pagos, setPagos] = useState<any[]>([]);

  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [resCitas, resCompras, resEgresos, resPagos] = await Promise.all([
        supabase.from('citas_atenciones')
          .select('*, pacientes(nombre_completo, rut, telefono)')
          .in('estado', ['asistio', 'asistió', 'confirmada', 'Confirmada'])
          .order('fecha', { ascending: true }),
        supabase.from('compras_planes')
          .select('*, pacientes(nombre_completo, rut, telefono)')
          .order('fecha_compra', { ascending: false }),
        supabase.from('egresos_caja')
          .select('*')
          .order('fecha', { ascending: false }),
        supabase.from('pagos_pacientes')
          .select('*, pacientes(nombre_completo, rut)')
          .order('fecha', { ascending: false })
      ]);

      setCitas(resCitas.data || []);
      setCompras(resCompras.data || []);
      setEgresos(resEgresos.data || []);
      setPagos(resPagos.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando finanzas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEgreso = async () => {
    if (!supabase) return;
    if (!egresoForm.concepto || !egresoForm.monto) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSavingEgreso(true);
    const payload = {
      concepto: egresoForm.concepto.trim(),
      categoria: egresoForm.categoria || 'Otros',
      medio_pago: egresoForm.formaPago || 'Débito / Transbank',
      monto_clp: parseInt(String(egresoForm.monto).replace(/\D/g, ''), 10) || 0,
      fecha: egresoForm.fecha || getChileanDate(),
      responsable: 'Clínica'
    };
    try {
      const { error } = await supabase.from('egresos_caja').insert([payload]);
      if (error) {
        console.error('Error en Supabase:', error);
        throw new Error(error.message);
      }
      toast.success('Egreso registrado exitosamente');
      setShowEgresoModal(false);
      setEgresoForm({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito', fecha: '' });
      loadData();
    } catch (err: any) { 
      toast.error(err.message || 'Error al guardar egreso'); 
    } finally { 
      setSavingEgreso(false); 
    }
  };

  const handleAbrirEditarEgreso = (egreso: any) => {
    setEditingEgreso(egreso);
  };

  const handleEliminarEgreso = async (egresoId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto / egreso? Esta acción no se puede deshacer.')) {
      return;
    }
    if (!supabase) return;
    try {
      const { error } = await supabase.from('egresos_caja').delete().eq('id', egresoId);
      if (error) throw error;
      toast.success('Egreso eliminado correctamente');
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar egreso: ' + (err.message || ''));
    }
  };

  const getRangoFechasStrings = (tipo: string) => {
    const { inicio, fin } = getRangoFechas(tipo);
    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return { inicioStr: formatDateStr(inicio), finStr: formatDateStr(fin) };
  };

  // Filtrado dinámico por fecha
  const asistenciasFiltradas = useMemo(() => {
    const { inicioStr, finStr } = getRangoFechasStrings(periodo);
    return citas.filter((a) => {
      if (!a.fecha) return false;
      return a.fecha >= inicioStr && a.fecha <= finStr;
    });
  }, [citas, periodo]);

  const transaccionesFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return compras.filter((t) => {
      if (!t.created_at) return false;
      const f = new Date(t.created_at);
      return f >= inicio && f <= fin;
    });
  }, [compras, periodo]);

  const egresosFiltrados = useMemo(() => {
    const { inicioStr, finStr } = getRangoFechasStrings(periodo);
    const { inicio, fin } = getRangoFechas(periodo);
    return egresos.filter((e) => {
      if (e.fecha) {
        return e.fecha >= inicioStr && e.fecha <= finStr;
      }
      if (!e.created_at) return false;
      const f = new Date(e.created_at);
      return f >= inicio && f <= fin;
    });
  }, [egresos, periodo]);

  const pagosFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return pagos.filter((p) => {
      if (!p.fecha) return false;
      const f = new Date(p.fecha);
      return f >= inicio && f <= fin;
    });
  }, [pagos, periodo]);

  // KPIs
  const ingresosPeriodo = useMemo(() => {
    return pagosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  }, [pagosFiltrados]);

  const egresosPeriodo = useMemo(() => {
    return egresosFiltrados
      .reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);
  }, [egresosFiltrados]);

  const flujoNetoPeriodo = useMemo(() => {
    return ingresosPeriodo - egresosPeriodo;
  }, [ingresosPeriodo, egresosPeriodo]);
  
  const hoyStr = new Date().toISOString().split('T')[0];

  // Agrupación de Deudores Consolidados por Paciente Único (Eliminando cobro doble por citas cubiertas por planes)
  const deudoresConsolidados = useMemo<DeudorConsolidado[]>(() => {
    const map = new Map<string, DeudorConsolidado>();

    // Obtener todos los IDs de pacientes únicos involucrados en compras o citas
    const pacienteIds = Array.from(
      new Set([
        ...compras.map(p => p.paciente_id),
        ...citas.map(c => c.paciente_id)
      ])
    ).filter(Boolean) as string[];

    pacienteIds.forEach(pacId => {
      // 1. Obtener sus planes en compras_planes (excluyendo cancelados)
      const planesPaciente = compras.filter(p => {
        if (p.paciente_id !== pacId) return false;
        const stPago = String(p.estado_pago || '').toLowerCase().trim();
        const stEstado = String(p.estado || '').toLowerCase().trim();
        return stPago !== 'cancelado' && stEstado !== 'cancelado';
      });

      // Saldo adeudado por concepto de planes y desglose de planes
      const desglose: DesgloseDeuda[] = [];
      let deudaPlanes = 0;

      planesPaciente.forEach(p => {
        const saldo = Number(p.saldo_pendiente ?? (String(p.estado_pago || '').toLowerCase().includes('pend') ? p.valor_total : 0)) || 0;
        if (saldo > 0) {
          deudaPlanes += saldo;
          desglose.push({
            tipo: 'plan',
            id: p.id,
            fecha: p.fecha_compra ? p.fecha_compra.split('T')[0] : '',
            detalle: p.nombre_plan || 'Plan Kinésico',
            saldo
          });
        }
      });

      // 2. Obtener sus citas asistidas/confirmadas
      const citasPaciente = citas
        .filter(c => {
          if (c.paciente_id !== pacId) return false;
          const st = String(c.estado || '').toLowerCase().trim();
          return ['asistio', 'asistió', 'confirmada', 'atendido', 'atendida'].includes(st);
        })
        .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

      // Cantidad de sesiones cubiertas por planes comprados
      const totalSesionesCubiertasPorPlanes = planesPaciente.reduce(
        (acc, p) => acc + (Number(p.total_sesiones || p.sesiones_totales) || 0),
        0
      );

      // Criterio para identificar citas impagas (excluye pagadas, cubiertas por plan, cortesías y citas futuras)
      const isCitaImpaga = (c: any) => {
        const stPago = String(c.estado_pago || '').toLowerCase().trim();
        if (stPago === 'pagado' || stPago === 'cubierto_por_plan' || stPago === 'cortesia' || c.pagada === true) {
          return false;
        }
        if (c.fecha && c.fecha > hoyStr) {
          return false;
        }
        return stPago === 'pendiente_pago' || stPago === 'pendiente' || !c.pagada;
      };

      // Regla para citas sueltas (fuera de plan):
      // - Si el paciente NO tiene planes: todas sus citas asistidas con estado_pago === 'pendiente_pago' (o !c.pagada) se consideran citas sueltas impagas.
      // - Si el paciente TIENE planes: SOLO las citas que excedan la cantidad total de sesiones cubiertas por sus planes se consideran citas sueltas:
      const citasCandidatasImpagas = planesPaciente.length === 0
        ? citasPaciente
        : citasPaciente.slice(totalSesionesCubiertasPorPlanes);

      const citasSueltasImpagas = citasCandidatasImpagas.filter(isCitaImpaga);

      let deudaCitas = 0;
      citasSueltasImpagas.forEach(c => {
        const arancel = getArancel(c.pacientes?.categoria_tarifa);
        const montoCita = Number(c.monto_cobrado) || arancel?.sesion_individual || 28000;
        deudaCitas += montoCita;
        desglose.push({
          tipo: 'cita',
          id: c.id,
          fecha: c.fecha || '',
          detalle: c.motivo_consulta || (planesPaciente.length > 0 ? 'Sesión Kinésica TMO (Excedente)' : 'Sesión Kinésica TMO'),
          saldo: montoCita
        });
      });

      // Deuda total del paciente:
      const deudaTotalPaciente = deudaPlanes + deudaCitas;

      // Solo si deudaTotalPaciente > 0 se agrega a deudoresConsolidados
      if (deudaTotalPaciente > 0) {
        const pacienteData =
          compras.find(p => p.paciente_id === pacId)?.pacientes ||
          citas.find(c => c.paciente_id === pacId)?.pacientes ||
          { id: pacId, nombre_completo: 'Paciente sin registrar', rut: '', telefono: '' };

        map.set(pacId, {
          pacienteId: pacId,
          paciente: { ...pacienteData, id: pacId },
          totalDeuda: deudaTotalPaciente,
          desglose
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalDeuda - a.totalDeuda);
  }, [compras, citas, hoyStr]);

  const deudoresCount = deudoresConsolidados.length;

  const porCobrarPeriodo = useMemo(() => {
    return deudoresConsolidados.reduce((acc, curr) => acc + curr.totalDeuda, 0);
  }, [deudoresConsolidados]);

  const toggleExpandDeudor = (pacienteId: string) => {
    setExpandedDeudores(prev => {
      const next = new Set(prev);
      if (next.has(pacienteId)) next.delete(pacienteId);
      else next.add(pacienteId);
      return next;
    });
  };

  const planesActivosLista = useMemo(() => {
    return compras.filter(t => t.estado === 'activo' && (t.total_sesiones > t.sesiones_usadas));
  }, [compras]);

  const handleCobrarWhatsApp = (deudor: DeudorConsolidado) => {
    const telefono = deudor.paciente?.telefono || '';
    const cleanPhone = telefono.replace(/\D/g, '').slice(-9);
    if (!cleanPhone) {
      toast.error('Paciente sin teléfono registrado');
      return;
    }

    const primerNombre = (deudor.paciente?.nombre_completo || '').split(' ')[0] || 'Estimado/a';
    const texto = `Hola ${primerNombre}, te saludamos de KIROMOV Centro Clínico.
Esperamos que tu tratamiento vaya muy bien. Te recordamos que mantienes un saldo pendiente consolidado de ${formatCLP(deudor.totalDeuda)}.

Datos para transferencia:
• Banco: Santander
• Tipo de Cuenta: Corriente
• N° Cuenta: 7654321
• RUT: 76.543.210-9
• Correo: pagos@kiromov.cl

Por favor envíanos tu comprobante por este medio al realizar el pago. ¡Muchas gracias!`;

    window.open(`https://wa.me/56${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
  };


  return (
    <div className="min-h-screen bg-cloud pb-20 font-sans text-ink-navy">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 sm:space-y-8 print:hidden">
        
        {/* HEADER Y FILTRO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-ink-navy tracking-tight">Finanzas & Caja</h1>
            <p className="text-xs sm:text-[14px] text-slate-gray mt-1">Gestión de ingresos, egresos y cuentas por cobrar.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
              className="min-h-[44px] bg-paper border border-hairline text-ink-navy text-xs sm:text-[14px] font-semibold rounded-inputs px-3 sm:px-4 py-2 sm:py-2.5 shadow-calendly focus:outline-none cursor-pointer"
            >
              <option value="este_mes">Este Mes</option>
              <option value="mes_anterior">Mes Anterior</option>
              <option value="este_semestre">Este Semestre</option>
              <option value="este_ano">Este Año</option>
              <option value="todo">Todo el Historial</option>
            </select>
          </div>
        </div>

        {/* KPIs (2 columnas en móvil, 4 en desktop con tipografía responsive) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-paper rounded-cards p-4 sm:p-6 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-inputs bg-pebble flex items-center justify-center text-signal-blue shrink-0"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5"/></div>
              <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-gray uppercase truncate">Ingresos Reales</h3>
            </div>
            <p className="text-lg sm:text-2xl lg:text-[32px] font-bold text-ink-navy leading-tight truncate">{formatCLP(ingresosPeriodo)}</p>
          </div>
          <div className="bg-paper rounded-cards p-4 sm:p-6 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-inputs bg-pebble flex items-center justify-center text-ink-navy shrink-0"><TrendingDown className="w-4 h-4 sm:w-5 sm:h-5"/></div>
              <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-gray uppercase truncate">Egresos</h3>
            </div>
            <p className="text-lg sm:text-2xl lg:text-[32px] font-bold text-ink-navy leading-tight truncate">{formatCLP(egresosPeriodo)}</p>
          </div>
          <div className="bg-paper rounded-cards p-4 sm:p-6 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-inputs bg-cloud flex items-center justify-center text-deep-cobalt shrink-0"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5"/></div>
              <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-gray uppercase truncate">Flujo Neto</h3>
            </div>
            <p className="text-lg sm:text-2xl lg:text-[32px] font-bold text-ink-navy leading-tight truncate">{formatCLP(flujoNetoPeriodo)}</p>
          </div>
          <div className="bg-paper rounded-cards p-4 sm:p-6 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-inputs bg-pebble flex items-center justify-center text-slate-gray shrink-0"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5"/></div>
              <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-gray uppercase truncate">Por Cobrar</h3>
            </div>
            <p className="text-lg sm:text-2xl lg:text-[32px] font-bold text-ink-navy leading-tight truncate">{formatCLP(porCobrarPeriodo)}</p>
            <p className="text-[11px] sm:text-[12px] text-mist-gray mt-0.5 truncate">De {deudoresCount} pacientes</p>
          </div>
        </div>

        {/* TABS Y TABLAS */}
        <div className="bg-paper rounded-cards shadow-calendly border border-hairline overflow-hidden">
          <div className="border-b border-hairline flex overflow-x-auto no-scrollbar bg-cloud">
            <button onClick={() => setActiveTab('deben')} className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'deben' ? 'border-amber-500 text-amber-600 bg-paper' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>⚠️ Quién Debe {deudoresCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">{deudoresCount}</span>}</button>
            <button onClick={() => setActiveTab('pagados')} className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'pagados' ? 'border-emerald-600 text-emerald-700 bg-paper' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>💰 Quién Pagó</button>
            <button onClick={() => setActiveTab('planes')} className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'planes' ? 'border-signal-blue text-signal-blue bg-paper' : 'border-transparent text-slate-gray hover:text-ink-navy hover:bg-pebble'}`}>📦 Planes Activos</button>
            <button onClick={() => setActiveTab('egresos')} className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'egresos' ? 'border-rose-500 text-rose-600 bg-paper' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>📉 Caja Diaria / Egresos</button>
          </div>

          <div className="p-0 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="font-semibold">Cargando registros...</p>
              </div>
            ) : (
              <>
                {/* 1. PLANES ACTIVOS */}
                {activeTab === 'planes' && (
                  <div className="overflow-x-auto">
                    {planesActivosLista.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">No hay planes activos en este período.</p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-signal-blue/10 text-signal-blue border-b border-signal-blue/20 text-xs uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Plan / Tratamiento</th>
                            <th className="py-3 px-4">Progreso (Sesiones)</th>
                            <th className="py-3 px-4 text-right">Saldo Restante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {planesActivosLista.map((p) => {
                            const usadas = p.sesiones_usadas || 0;
                            const totales = p.total_sesiones || 0;
                            const porcentaje = totales > 0 ? (usadas / totales) * 100 : 0;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900">{p.pacientes?.nombre_completo}</td>
                                <td className="py-3 px-4 font-medium text-slate-700 text-xs">{p.nombre_plan || 'Plan Kinésico'}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">{usadas} / {totales}</span>
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-signal-blue rounded-full" style={{ width: `${porcentaje}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                  {p.saldo_pendiente > 0 ? (
                                    <span className="text-rose-600">Debe {formatCLP(p.saldo_pendiente)}</span>
                                  ) : (
                                    <span className="text-emerald-600">Pagado</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 2. QUIÉN PAGÓ */}
                {activeTab === 'pagados' && (
                  <div className="overflow-x-auto">
                    {pagosFiltrados.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">No hay pagos registrados en este período.</p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-emerald-50 text-emerald-700 border-b border-emerald-100 text-xs uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Fecha Pago</th>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Plan o Servicio</th>
                            <th className="py-3 px-4">Medio de Pago</th>
                            <th className="py-3 px-4 text-right">Monto CLP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagosFiltrados.map((p) => (
                            <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-3 px-4 text-slate-500 text-xs">{p.fecha ? p.fecha.split('T')[0] : ''}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{p.pacientes?.nombre_completo}</td>
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">{p.notas || 'Sesión Individual Kinésica'}</td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {p.metodo_pago || 'N/A'} {(p.numero_boleta || p.comprobante) && <span className="block text-[10px] text-slate-400 font-medium">Boleta {p.numero_boleta || p.comprobante}</span>}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600">
                                ${Number(p.monto || 0).toLocaleString("es-CL")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 3. QUIÉN DEBE (Consolidado por Paciente Único) */}
                {activeTab === 'deben' && (
                  <div className="overflow-x-auto">
                    {deudoresConsolidados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-base font-bold text-slate-700">¡Todo al día!</p>
                        <p className="text-sm mt-1 text-slate-500">No hay cuentas por cobrar en este período.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-amber-50 text-amber-900 border-b border-amber-200 text-xs uppercase tracking-wider font-bold">
                          <tr>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Teléfono</th>
                            <th className="py-3 px-4">Obligaciones</th>
                            <th className="py-3 px-4 text-right">Deuda Consolidada</th>
                            <th className="py-3 px-4 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deudoresConsolidados.map((d) => {
                            const isExpanded = expandedDeudores.has(d.pacienteId);
                            const p = d.paciente;
                            return (
                              <React.Fragment key={d.pacienteId}>
                                <tr className="hover:bg-amber-50/30 transition-colors">
                                  {/* Paciente y toggle acordeón */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandDeudor(d.pacienteId)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                        title={isExpanded ? "Ocultar desglose" : "Ver desglose de deuda"}
                                      >
                                        <span className={`inline-block transform transition-transform text-xs font-bold ${isExpanded ? 'rotate-90' : ''}`}>
                                          ▶
                                        </span>
                                      </button>
                                      <div>
                                        <div
                                          className="font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                                          onClick={() => toggleExpandDeudor(d.pacienteId)}
                                        >
                                          {p.nombre_completo || 'Paciente sin registrar'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          {p.rut ? formatRut(p.rut) : 'Sin RUT'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Teléfono */}
                                  <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                                    {p.telefono || 'N/A'}
                                  </td>

                                  {/* Ítems pendientes */}
                                  <td className="py-3 px-4 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandDeudor(d.pacienteId)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer text-xs"
                                    >
                                      <span>{d.desglose.length} {d.desglose.length === 1 ? 'ítem' : 'ítems'}</span>
                                      <span className="text-[10px] text-amber-700">{isExpanded ? '▲' : '▼'}</span>
                                    </button>
                                  </td>

                                  {/* Deuda consolidada */}
                                  <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-600 text-base tabular-nums">
                                    {formatCLP(d.totalDeuda)}
                                  </td>

                                  {/* Acciones Rápidas Compactas */}
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedDeudorForCheckout(d);
                                          setSelectedDeudaItemForCheckout(null);
                                          setIsCheckoutOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                        title="Abrir checkout para cobrar deuda"
                                      >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        <span>Cobrar</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleCobrarWhatsApp(d)}
                                        className="p-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors cursor-pointer text-sm"
                                        title={`Enviar recordatorio de cobro por WhatsApp a ${p.nombre_completo}`}
                                      >
                                        💬
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* ACORDEÓN DESPLEGABLE: Desglose por ítem */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/90 border-b border-slate-200/90">
                                    <td colSpan={5} className="py-3 px-6 sm:px-8">
                                      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                                          <span>Detalle de Obligaciones Pendientes</span>
                                          <span>Subtotal</span>
                                        </div>
                                        <div className="divide-y divide-slate-100 text-xs">
                                          {d.desglose.map((sub, sIdx) => (
                                            <div key={sIdx} className="py-2 flex items-center justify-between gap-4">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                                  sub.tipo === 'plan' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                }`}>
                                                  {sub.tipo}
                                                </span>
                                                <span className="font-semibold text-slate-800 truncate">{sub.detalle}</span>
                                                {sub.fecha && (
                                                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                                    📅 {sub.fecha}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-mono font-bold text-rose-600 tabular-nums">
                                                  {formatCLP(sub.saldo)}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDeudaItemForCheckout({
                                                      tipo: sub.tipo,
                                                      id: sub.id,
                                                      plan_id: sub.tipo === 'plan' ? sub.id : undefined,
                                                      cita_id: sub.tipo === 'cita' ? sub.id : undefined,
                                                      concepto: sub.detalle,
                                                      deudaTotal: sub.saldo,
                                                      fecha: sub.fecha
                                                    });
                                                    setSelectedDeudorForCheckout(d);
                                                    setIsCheckoutOpen(true);
                                                  }}
                                                  className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                                                >
                                                  Cobrar este ítem
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 4. EGRESOS */}
                {activeTab === 'egresos' && (
                  <div>
                    <div className="p-4 border-b border-slate-100 flex justify-end bg-slate-50/50">
                      <Button onClick={() => setShowEgresoModal(true)} className="min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm px-4 py-2 flex items-center justify-center cursor-pointer">
                        <Plus className="w-4 h-4 mr-1.5" /> Nuevo Egreso
                      </Button>
                    </div>
                    {egresosFiltrados.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">No hay egresos registrados en este período.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/80 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Concepto</th>
                              <th className="py-3 px-4">Categoría</th>
                              <th className="py-3 px-4">Medio</th>
                              <th className="py-3 px-4 text-right">Monto CLP</th>
                              <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {egresosFiltrados.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 text-slate-500 text-xs">{e.fecha}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{e.concepto}</td>
                                <td className="py-3 px-4">
                                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold">{e.categoria}</span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-500 font-medium">{e.medio_pago || 'Débito'}</td>
                                <td className="py-3 px-4 text-right font-black text-rose-600">
                                  {formatCLP(e.monto_clp)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirEditarEgreso(e)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="Editar gasto"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarEgreso(e.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Eliminar gasto"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Dialog open={showEgresoModal} onOpenChange={setShowEgresoModal}>
        <DialogHeader>
          <DialogTitle>Registrar Egreso de Caja</DialogTitle>
          <DialogDescription>Añade un nuevo gasto operativo a la clínica.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Concepto / Descripción</label>
            <Input required placeholder="Ej: Insumos..." value={egresoForm.concepto} onChange={e => setEgresoForm({...egresoForm, concepto: e.target.value})} className="bg-slate-50/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fecha (Opcional)</label>
              <Input type="date" value={egresoForm.fecha} onChange={e => setEgresoForm({...egresoForm, fecha: e.target.value})} className="bg-slate-50/50 text-sm h-10" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-slate-700">Categoría</label>
              <select value={egresoForm.categoria} onChange={e => setEgresoForm({...egresoForm, categoria: e.target.value})} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10 outline-none">
                <option value="Insumos Clínicos">Insumos Clínicos</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Arriendo">Arriendo</option>
                <option value="Marketing">Marketing / Publicidad</option>
                <option value="Equipamiento">Equipamiento</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Monto CLP</label>
              <Input type="number" required min="100" placeholder="Ej: 25000" value={egresoForm.monto} onChange={e => setEgresoForm({...egresoForm, monto: e.target.value})} className="bg-slate-50/50 font-bold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Medio de Pago</label>
            <select value={egresoForm.formaPago} onChange={e => setEgresoForm({...egresoForm, formaPago: e.target.value})} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10 outline-none">
              <option value="Débito">Débito / Transbank</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEgresoModal(false)}>Cancelar</Button>
          <Button onClick={handleAddEgreso} disabled={savingEgreso} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">{savingEgreso ? 'Guardando...' : 'Guardar Egreso'}</Button>
        </DialogFooter>
      </Dialog>

      <PaymentCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedDeudorForCheckout(null);
          setSelectedDeudaItemForCheckout(null);
        }}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          setSelectedDeudorForCheckout(null);
          setSelectedDeudaItemForCheckout(null);
          loadData();
        }}
        initialMode="deuda"
        paciente={selectedDeudorForCheckout?.paciente}
        pacienteId={selectedDeudorForCheckout?.pacienteId}
        deudaInfo={selectedDeudaItemForCheckout || (selectedDeudorForCheckout ? {
          deudaTotal: selectedDeudorForCheckout.totalDeuda,
          concepto: `Deuda consolidada (${selectedDeudorForCheckout.desglose.length} ítems)`,
          plan_id: selectedDeudorForCheckout.desglose.find(x => x.tipo === 'plan')?.id,
          cita_id: selectedDeudorForCheckout.desglose.find(x => x.tipo === 'cita')?.id
        } : null)}
      />

      <CancelPlanModal
        isOpen={!!cancelingPlan}
        onClose={() => setCancelingPlan(null)}
        plan={cancelingPlan}
        patientName={cancelingPlan?.pacientes?.nombre_completo}
        onSuccess={() => { setCancelingPlan(null); loadData(); }}
      />

      <EditExpenseModal
        isOpen={!!editingEgreso}
        onClose={() => setEditingEgreso(null)}
        egreso={editingEgreso}
        onSuccess={loadData}
      />
    </div>
  );
}

export default function FinanzasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <FinanzasContent />
    </Suspense>
  );
}
