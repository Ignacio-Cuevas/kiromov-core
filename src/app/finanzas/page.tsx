'use client';

import { Suspense, useEffect, useState, useMemo } from "react";
import { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";
import { createClient } from "@/utils/supabase/client";
import { formatCLP, formatRut } from "@/lib/utils";
import { Loader2, Plus, CreditCard, TrendingUp, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Componentes UI dummy para no romper dependencias
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PeriodoFiltro = 'este_mes' | 'mes_anterior' | 'este_semestre' | 'este_ano' | 'todo';
type TabName = 'asistencias' | 'pagados' | 'deben' | 'egresos';

function FinanzasContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('este_mes');
  const [activeTab, setActiveTab] = useState<TabName>('asistencias');

  // Datos
  const [citas, setCitas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);

  // Modal Egresos
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [savingEgreso, setSavingEgreso] = useState(false);
  const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito', fecha: '' });

  // Modal Settle
  const [settlingPlan, setSettlingPlan] = useState<any>(null);

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

  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [resCitas, resCompras, resEgresos] = await Promise.all([
        supabase.from('citas_atenciones')
          .select('*, pacientes(nombre_completo, rut)')
          .in('estado', ['asistio', 'atendido'])
          .order('fecha', { ascending: false }),
        supabase.from('compras_planes')
          .select('*, pacientes(nombre_completo, rut)')
          .order('fecha_compra', { ascending: false }),
        supabase.from('egresos_caja')
          .select('*')
          .order('fecha', { ascending: false })
      ]);

      setCitas(resCitas.data || []);
      setCompras(resCompras.data || []);
      setEgresos(resEgresos.data || []);
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
      metodo_pago: egresoForm.formaPago || 'Débito / Transbank',
      monto_clp: parseInt(String(egresoForm.monto).replace(/\D/g, ''), 10) || 0,
      fecha: egresoForm.fecha || new Date().toISOString().split('T')[0],
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

  // Filtrado dinámico por fecha
  const asistenciasFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return citas.filter(a => {
      const fechaRaw = a.fecha || a.created_at;
      if (!fechaRaw) return false;
      
      // Manejo estricto de string para evitar desfases de UTC si es YYYY-MM-DD
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [citas, periodo]);

  const transaccionesFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return compras.filter((t) => {
      const fechaRaw = t.fecha_compra || t.created_at || t.fecha;
      if (!fechaRaw) return false;
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [compras, periodo]);

  const egresosFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return egresos.filter((e) => {
      const fechaRaw = e.fecha || e.created_at;
      if (!fechaRaw) return false;
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [egresos, periodo]);

  // KPIs
  const kpisCalculados = useMemo(() => {
    const ingresos = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pagado')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);

    const porCobrar = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);

    const deudoresCount = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente').length;

    const totalEgresos = egresosFiltrados
      .reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);

    const flujoNeto = ingresos - totalEgresos;

    return { ingresos, porCobrar, deudoresCount, totalEgresos, flujoNeto };
  }, [transaccionesFiltradas, egresosFiltrados]);

  // Arrays derivados para las tabs de "Quién Debe"
  const pendientes = useMemo(() => transaccionesFiltradas.filter(t => t.estado_pago === 'pendiente'), [transaccionesFiltradas]);


  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-6 print:hidden">
        
        {/* HEADER Y FILTRO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finanzas & Caja</h1>
            <p className="text-sm text-slate-500">Gestión de ingresos, egresos y cuentas por cobrar.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
              className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="este_mes">Este Mes</option>
              <option value="mes_anterior">Mes Anterior</option>
              <option value="este_semestre">Este Semestre</option>
              <option value="este_ano">Este Año</option>
              <option value="todo">Todo el Historial</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="w-4 h-4"/></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase">Ingresos Reales</h3>
            </div>
            <p className="text-2xl font-black text-slate-800">{formatCLP(kpisCalculados.ingresos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><TrendingDown className="w-4 h-4"/></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase">Egresos</h3>
            </div>
            <p className="text-2xl font-black text-slate-800">{formatCLP(kpisCalculados.totalEgresos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><DollarSign className="w-4 h-4"/></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase">Flujo Neto</h3>
            </div>
            <p className={`text-2xl font-black ${kpisCalculados.flujoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCLP(kpisCalculados.flujoNeto)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><CreditCard className="w-4 h-4"/></div>
              <h3 className="text-xs font-bold text-amber-700 uppercase">Por Cobrar</h3>
            </div>
            <p className="text-2xl font-black text-amber-600">{formatCLP(kpisCalculados.porCobrar)}</p>
            <p className="text-[10px] font-bold text-amber-600/70 uppercase mt-1">{kpisCalculados.deudoresCount} PACIENTES PENDIENTES</p>
          </div>
        </div>

        {/* TABS Y TABLAS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="border-b border-slate-200/80 flex overflow-x-auto">
            <button onClick={() => setActiveTab('asistencias')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'asistencias' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>🗓️ Quién Asistió</button>
            <button onClick={() => setActiveTab('pagados')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'pagados' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>💰 Quién Pagó</button>
            <button onClick={() => setActiveTab('deben')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'deben' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>⚠️ Quién Debe {kpisCalculados.deudoresCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">{kpisCalculados.deudoresCount}</span>}</button>
            <button onClick={() => setActiveTab('egresos')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'egresos' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>📉 Egresos</button>
          </div>

          <div className="p-0 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="font-semibold">Cargando registros...</p>
              </div>
            ) : (
              <>
                {/* 1. QUIÉN ASISTIÓ */}
                {activeTab === 'asistencias' && (
                  <div className="overflow-x-auto">
                    {asistenciasFiltradas.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">No hay asistencias en este período.</p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/80 text-xs uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Fecha / Hora</th>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">RUT</th>
                            <th className="py-3 px-4">Motivo / Tratamiento</th>
                            <th className="py-3 px-4">Profesional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {asistenciasFiltradas.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">{c.fecha} {c.hora?.slice(0,5)}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{c.pacientes?.nombre_completo}</td>
                              <td className="py-3 px-4 text-xs text-slate-500 font-mono">{formatRut(c.pacientes?.rut)}</td>
                              <td className="py-3 px-4 text-xs text-slate-600">{c.motivo_consulta}</td>
                              <td className="py-3 px-4 text-xs text-slate-500">{c.profesional}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 2. QUIÉN PAGÓ */}
                {activeTab === 'pagados' && (
                  <div className="overflow-x-auto">
                    {transaccionesFiltradas.filter(c => c.estado_pago === 'pagado').length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">No hay pagos registrados en este período.</p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-emerald-50 text-emerald-700 border-b border-emerald-100 text-xs uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Fecha Pago</th>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Plan Adquirido</th>
                            <th className="py-3 px-4">Medio / Boleta</th>
                            <th className="py-3 px-4 text-right">Monto CLP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transaccionesFiltradas.filter(c => c.estado_pago === 'pagado').map((c) => (
                            <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-3 px-4 text-slate-500 text-xs">{c.fecha_compra}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{c.pacientes?.nombre_completo}</td>
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">{c.nombre_plan}</td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {c.metodo_pago || c.medio_pago || 'N/A'} {c.numero_boleta ? `(Bol: ${c.numero_boleta})` : ''}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600">
                                {formatCLP(Number(c.monto_clp || c.valor_total) || 0)}
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
                    {pendientes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-base font-bold text-slate-700">¡Todo al día!</p>
                        <p className="text-sm mt-1 text-slate-500">No hay cuentas por cobrar en este período.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-amber-50 text-amber-700 border-b border-amber-100 text-xs uppercase tracking-wider font-bold">
                          <tr>
                            <th className="py-3 px-4">Origen</th>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Plan Adeudado</th>
                            <th className="py-3 px-4 text-right">Monto Deuda</th>
                            <th className="py-3 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendientes.map((c) => (
                            <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-4 text-slate-500 text-xs">{c.fecha_compra}</td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.pacientes?.nombre_completo}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{formatRut(c.pacientes?.rut)}</div>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700 text-xs">{c.nombre_plan}</td>
                              <td className="py-3 px-4 text-right font-black text-amber-600 text-lg">
                                {formatCLP(Number(c.monto_clp || c.valor_total) || 0)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button onClick={() => setSettlingPlan(c)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm h-8">
                                  <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Registrar Cobro
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 4. EGRESOS */}
                {activeTab === 'egresos' && (
                  <div>
                    <div className="p-4 border-b border-slate-100 flex justify-end bg-slate-50/50">
                      <Button onClick={() => setShowEgresoModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm h-9">
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
