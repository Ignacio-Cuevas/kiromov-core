'use client';

import { Suspense, useEffect, useState, useMemo } from "react";
import { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";
import { CancelPlanModal } from "@/components/sales/CancelPlanModal";
import { EditExpenseModal } from "@/components/finanzas/EditExpenseModal";
import { createClient } from "@/utils/supabase/client";
import { formatCLP, formatRut , getChileanDate } from '@/lib/utils';
import { Loader2, Plus, CreditCard, TrendingUp, TrendingDown, DollarSign, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

// Componentes UI dummy para no romper dependencias
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getArancel } from '@/lib/pricing';
import { CobrarDeudaModal, type DeudaItem } from '@/components/sales/CobrarDeudaModal';

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

  const [deudaItemToCobrar, setDeudaItemToCobrar] = useState<DeudaItem | null>(null);

  // Modal Settle & Cancel
  const [settlingPlan, setSettlingPlan] = useState<any>(null);
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
          .eq('estado', 'asistio')
          .order('fecha', { ascending: false }),
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

  const porCobrarPeriodo = useMemo(() => {
    const planesPendientes = compras
      .filter((t) => t.estado === 'activo' && (t.estado_pago === 'pendiente' || (t.saldo_pendiente && t.saldo_pendiente > 0)))
      .reduce((acc, curr) => acc + (Number(curr.saldo_pendiente ?? curr.valor_total) || 0), 0);
    
    const citasPendientes = citas
      .filter((c) => c.estado_pago === 'pendiente_pago' && !c.plan_id && c.fecha && c.fecha <= hoyStr)
      .reduce((acc, curr) => acc + (Number(curr.monto_cobrado) || getArancel(curr.pacientes?.categoria_tarifa).sesion_individual), 0);

    return planesPendientes + citasPendientes;
  }, [compras, citas, hoyStr]);

  const deudoresCount = useMemo(() => {
    const ids = new Set<string>();
    compras
      .filter((t) => t.estado === 'activo' && (t.estado_pago === 'pendiente' || (t.saldo_pendiente && t.saldo_pendiente > 0)))
      .filter((t) => (Number(t.saldo_pendiente ?? t.valor_total) || 0) > 0)
      .forEach(t => ids.add(t.paciente_id));
    citas
      .filter((c) => c.estado_pago === 'pendiente_pago' && !c.plan_id && c.fecha && c.fecha <= hoyStr)
      .forEach(c => ids.add(c.paciente_id));
    return ids.size;
  }, [compras, citas, hoyStr]);

  // Arrays derivados para las tabs de "Quién Debe"
  const planesPendientesLista = useMemo(() => compras.filter(t => {
    if (t.estado !== 'activo') return false;
    const deuda = t.saldo_pendiente ?? (t.valor_total ?? 0);
    return deuda > 0 && (t.estado_pago === 'pendiente' || t.saldo_pendiente > 0);
  }), [compras]);
  
  const citasPendientesLista = useMemo(() => citas.filter(c => {
    if (c.estado_pago !== 'pendiente_pago') return false;
    if (c.plan_id) return false;
    if (!c.fecha || c.fecha > hoyStr) return false;
    return true;
  }).map(c => {
    const arancel = getArancel(c.pacientes?.categoria_tarifa);
    const valorTotal = Number(c.monto_cobrado) || arancel.sesion_individual;
    return { ...c, valorRealCalculado: valorTotal };
  }), [citas, hoyStr]);
  
  const planesActivosLista = useMemo(() => {
    return compras.filter(t => t.estado === 'activo' && (t.total_sesiones > t.sesiones_usadas));
  }, [compras]);

  const handleCobrarCita = (telefono: string, nombre: string, monto: number, fecha: string) => {
    const cleanPhone = (telefono || '').replace(/\D/g, '').slice(-9);
    if (!cleanPhone) { toast.error('Paciente sin teléfono'); return; }
    
    const texto = `Hola ${nombre.split(' ')[0]}, te saludamos de Kiromov Centro Clínico.
Esperamos que tu tratamiento vaya muy bien. Te recordamos que mantienes un saldo pendiente de ${formatCLP(monto)} correspondiente a tu atención del día ${fecha}.

Puedes transferir a los datos de la clínica:
• Banco: Santander
• Tipo de Cuenta: Corriente
• N° Cuenta: 7654321
• Rut: 76.543.210-9
• Correo: pagos@kiromov.cl

Si ya realizaste la transferencia, por favor envíanos el comprobante por este medio. ¡Muchas gracias!`;

    window.open(`https://wa.me/56${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
  };


  return (
    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">
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

                {/* 3. QUIÉN DEBE */}
                {activeTab === 'deben' && (
                  <div className="overflow-x-auto">
                    {planesPendientesLista.length === 0 && citasPendientesLista.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-base font-bold text-slate-700">¡Todo al día!</p>
                        <p className="text-sm mt-1 text-slate-500">No hay cuentas por cobrar en este período.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-amber-50 text-amber-700 border-b border-amber-100 text-xs uppercase tracking-wider font-bold">
                          <tr>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Teléfono</th>
                            <th className="py-3 px-4">Adeuda</th>
                            <th className="py-3 px-4 text-right">Total</th>
                            <th className="py-3 px-4 text-right">Pagado</th>
                            <th className="py-3 px-4 text-right">Debe</th>
                            <th className="py-3 px-4 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {planesPendientesLista.map((c) => {
                            const valorTotal = c.valor_total ?? 0;
                            const pagado = c.monto_pagado ?? 0;
                            const deuda = c.saldo_pendiente ?? valorTotal;
                            return (
                            <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.pacientes?.nombre_completo}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{formatRut(c.pacientes?.rut)}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-xs">{c.pacientes?.telefono || 'N/A'}</td>
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] mr-1 uppercase">Plan</span>
                                {c.nombre_plan}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500 font-medium">
                                {formatCLP(valorTotal)}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                                {formatCLP(pagado)}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-rose-600 text-base">
                                {formatCLP(deuda)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    onClick={() => handleCobrarCita(c.pacientes?.telefono, c.pacientes?.nombre_completo, deuda, c.fecha_compra)} 
                                    variant="outline" 
                                    className="min-h-[44px] sm:min-h-0 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-2xs h-auto py-2 px-3 cursor-pointer"
                                  >
                                    💬 WhatsApp
                                  </Button>
                                  <Button 
                                    onClick={() => setDeudaItemToCobrar({
                                      tipo: 'plan',
                                      id: c.id,
                                      paciente_id: c.paciente_id,
                                      paciente_nombre: c.pacientes?.nombre_completo,
                                      concepto: c.nombre_plan || 'Plan Kinésico',
                                      deuda: deuda,
                                      fecha: c.fecha_compra || c.created_at
                                    })} 
                                    className="min-h-[44px] sm:min-h-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm h-auto py-2 px-3 cursor-pointer"
                                  >
                                    💵 Registrar Pago
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                          {citasPendientesLista.map((c) => {
                            const valorTotal = c.valorRealCalculado;
                            return (
                            <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.pacientes?.nombre_completo}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{formatRut(c.pacientes?.rut)}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-xs">{c.pacientes?.telefono || 'N/A'}</td>
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] mr-1 uppercase">Cita</span>
                                {c.motivo_consulta}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500 font-medium">
                                {formatCLP(valorTotal)}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                                $0
                              </td>
                              <td className="py-3 px-4 text-right font-black text-rose-600 text-base">
                                {formatCLP(valorTotal)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    onClick={() => handleCobrarCita(c.pacientes?.telefono, c.pacientes?.nombre_completo, valorTotal, c.fecha)} 
                                    variant="outline" 
                                    className="min-h-[44px] sm:min-h-0 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-2xs h-auto py-2 px-3 cursor-pointer"
                                  >
                                    💬 WhatsApp
                                  </Button>
                                  <Button 
                                    onClick={() => setDeudaItemToCobrar({
                                      tipo: 'cita',
                                      id: c.id,
                                      paciente_id: c.paciente_id,
                                      paciente_nombre: c.pacientes?.nombre_completo,
                                      concepto: c.motivo_consulta || 'Sesión Kinésica',
                                      deuda: valorTotal,
                                      fecha: c.fecha
                                    })} 
                                    className="min-h-[44px] sm:min-h-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm h-auto py-2 px-3 cursor-pointer"
                                  >
                                    💵 Registrar Pago
                                  </Button>
                                </div>
                              </td>
                            </tr>
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

      <SettlePaymentModal 
        isOpen={!!settlingPlan} 
        onClose={() => setSettlingPlan(null)} 
        planEnUso={settlingPlan}
        onSuccess={() => { setSettlingPlan(null); loadData(); }}
      />
      
      <CobrarDeudaModal 
        isOpen={!!deudaItemToCobrar}
        onClose={() => setDeudaItemToCobrar(null)}
        item={deudaItemToCobrar}
        onSuccess={() => {
          setDeudaItemToCobrar(null);
          loadData();
        }}
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
