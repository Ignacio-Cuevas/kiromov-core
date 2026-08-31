'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { fetchHistorialVentas, fetchEgresosCaja, crearEgresoCaja } from '@/lib/supabase';
import { RegisterSaleDialog } from '@/components/finanzas/RegisterSaleDialog';
import { formatCLP } from '@/lib/utils';
import { ShoppingCart, Plus, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';

type PeriodoFiltro = 'mes' | 'semestre' | 'ano' | 'todo';

export default function FinanzasPage() {
  const supabase = createClient();
  const [compras, setCompras] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de período seleccionado
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');

  // Modal nuevo egreso
  const [showModal, setShowModal] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('Insumos');
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('Débito');
  const [saving, setSaving] = useState(false);

  // Modal nueva venta
  const [isRegisterSaleOpen, setIsRegisterSaleOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    let cList: any[] = [];
    let eList: any[] = [];

    if (supabase) {
      try {
        const { data: cData } = await supabase
          .from('compras_planes')
          .select('*, pacientes(nombre_completo, rut)')
          .order('fecha_compra', { ascending: false });

        const { data: eData } = await supabase
          .from('egresos_caja')
          .select('*')
          .order('fecha', { ascending: false });

        if (cData && cData.length > 0) cList = cData;
        if (eData && eData.length > 0) eList = eData;
      } catch (err) {
        console.warn('Supabase fetch exception:', err);
      }
    }

    if (cList.length === 0) {
      cList = await fetchHistorialVentas();
    }
    if (eList.length === 0) {
      eList = await fetchEgresosCaja();
    }

    setCompras(cList);
    setEgresos(eList);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Función para determinar si una fecha está dentro del período seleccionado
  function estaEnPeriodo(fechaStr: string) {
    if (!fechaStr) return false;
    if (periodo === 'todo') return true;

    const fecha = new Date(fechaStr);
    const hoy = new Date();

    if (periodo === 'mes') {
      return (
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth()
      );
    }

    if (periodo === 'semestre') {
      const mesActual = hoy.getMonth();
      const esPrimerSemestre = mesActual < 6;
      const mesFecha = fecha.getMonth();
      const fechaPrimerSemestre = mesFecha < 6;

      return (
        fecha.getFullYear() === hoy.getFullYear() &&
        esPrimerSemestre === fechaPrimerSemestre
      );
    }

    if (periodo === 'ano') {
      return fecha.getFullYear() === hoy.getFullYear();
    }

    return true;
  }

  // Filtrar compras y egresos según el período
  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => estaEnPeriodo(c.fecha_compra));
  }, [compras, periodo]);

  const egresosFiltrados = useMemo(() => {
    return egresos.filter((e) => estaEnPeriodo(e.fecha));
  }, [egresos, periodo]);

  // Cálculos dinámicos
  const totalIngresos = useMemo(() => {
    return comprasFiltradas.reduce((acc, curr) => {
      const val = curr.total_final_clp ?? curr.valor_total ?? 0;
      return acc + (Number(val) || 0);
    }, 0);
  }, [comprasFiltradas]);

  const totalEgresos = useMemo(() => {
    return egresosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);
  }, [egresosFiltrados]);

  const flujoNeto = totalIngresos - totalEgresos;

  // Cuentas por cobrar (compras en estado 'Pendiente de Pago')
  const cuentasPorCobrar = useMemo(() => {
    return comprasFiltradas
      .filter((c) => c.estado_pago === 'Pendiente de Pago')
      .reduce((acc, curr) => acc + (Number(curr.total_final_clp ?? curr.valor_total) || 0), 0);
  }, [comprasFiltradas]);

  // Etiqueta del período
  const etiquetaPeriodo = useMemo(() => {
    const hoy = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    if (periodo === 'mes') {
      return `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
    }
    if (periodo === 'semestre') {
      const sem = hoy.getMonth() < 6 ? '1° Semestre' : '2° Semestre';
      return `${sem} ${hoy.getFullYear()}`;
    }
    if (periodo === 'ano') {
      return `Año ${hoy.getFullYear()}`;
    }
    return 'Historial Completo';
  }, [periodo]);

  async function handleAddEgreso(e: React.FormEvent) {
    e.preventDefault();
    if (!concepto || !monto) return;
    setSaving(true);

    const nuevoEgreso = {
      concepto,
      categoria: categoria as any,
      monto_clp: parseInt(monto, 10),
      medio_pago: (formaPago === 'Débito' ? 'Débito / Transbank' : 'Transferencia') as any,
      fecha: new Date().toISOString().split('T')[0],
      responsable: 'Klgo. Ignacio Cuevas Silva',
    };

    if (supabase) {
      try {
        await supabase.from('egresos_caja').insert([nuevoEgreso]);
      } catch (err) {
        console.warn('Error guardando egreso en Supabase:', err);
      }
    } else {
      await crearEgresoCaja(nuevoEgreso);
    }

    setShowModal(false);
    setConcepto('');
    setMonto('');
    setSaving(false);
    loadData();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Global */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 font-bold text-lg text-slate-800 group">
            <img 
              src="https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:logo.png" 
              alt="Kiromov Centro Clínico" 
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <span className="text-blue-700 tracking-tight flex items-center gap-1.5">
              <span>KIROMOV</span>
              <span className="text-slate-400 font-normal text-xs bg-slate-100 px-2 py-0.5 rounded-md">Core</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              📋 Pacientes
            </Link>
            <Link href="/agenda" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              📅 Agenda
            </Link>
            <Link href="/finanzas" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50">
              📊 Finanzas & Caja
            </Link>
            <Link href="/planes" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              ⚙️ Tarifas & Planes
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            Klgo. Ignacio Cuevas
          </div>
          <button
            type="button"
            onClick={async () => {
              if (supabase) await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="text-xs font-bold text-slate-500 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1.5 rounded-full transition-colors"
            title="Cerrar sesión"
          >
            🚪 Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Top bar con Título y Selector de Períodos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Finanzas & Balance de Caja</h1>
            <p className="text-sm text-slate-500">
              Mostrando período: <span className="font-semibold text-slate-700 capitalize">{etiquetaPeriodo}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented Control de Períodos */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setPeriodo('mes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'mes' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setPeriodo('semestre')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'semestre' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semestre
              </button>
              <button
                onClick={() => setPeriodo('ano')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'ano' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Este Año
              </button>
              <button
                onClick={() => setPeriodo('todo')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'todo' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Histórico
              </button>
            </div>

            {/* Botón Nueva Venta */}
            <button
              onClick={() => setIsRegisterSaleOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>+ Registrar Venta</span>
            </button>

            {/* Botón Registrar Gasto */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>

        {/* KPIs Dinámicos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos Totales</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {formatCLP(totalIngresos)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block font-medium">{comprasFiltradas.length} ventas en período</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Egresos / Gastos</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {formatCLP(totalEgresos)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block font-medium">{egresosFiltrados.length} gastos registrados</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flujo Neto</span>
            <div className={`text-2xl font-extrabold mt-1 ${flujoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCLP(flujoNeto)}
            </div>
            <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded ${flujoNeto >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {flujoNeto >= 0 ? '✓ Superávit Operacional' : '⚠️ Déficit en Período'}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cuentas por Cobrar</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {formatCLP(cuentasPorCobrar)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block font-medium">Saldos pendientes de pago</span>
          </div>
        </div>

        {/* Tablas de Ingresos y Egresos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Listado de Ventas / Ingresos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                Ventas y Planes ({comprasFiltradas.length})
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {formatCLP(totalIngresos)}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Cargando ventas...</p>
            ) : comprasFiltradas.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay ventas registradas en este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Paciente / Detalle</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comprasFiltradas.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{c.fecha_compra}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">
                            {c.pacientes?.nombre_completo || c.paciente_nombre || 'Paciente'}
                          </div>
                          <div className="text-[11px] text-slate-500">{c.nombre_plan} ({c.total_sesiones} ses.)</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {c.medio_pago || 'Transferencia'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                          {formatCLP(c.total_final_clp ?? c.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Listado de Egresos / Gastos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-rose-600" />
                Egresos y Gastos ({egresosFiltrados.length})
              </h3>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                {formatCLP(totalEgresos)}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Cargando egresos...</p>
            ) : egresosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay egresos registrados en este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Concepto / Categoría</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {egresosFiltrados.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{e.fecha}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{e.concepto}</div>
                          <div className="text-[11px] text-slate-500">{e.categoria}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {e.medio_pago || 'Débito'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-700">
                          {formatCLP(e.monto_clp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Registrar Gasto */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800">Registrar Nuevo Gasto de Caja</h3>
            <form onSubmit={handleAddEgreso} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Concepto / Descripción</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Insumos de punción seca, cinta kinesiotape..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white"
                  >
                    <option value="Insumos Clínicos">Insumos Clínicos</option>
                    <option value="Servicios Básicos">Servicios Básicos</option>
                    <option value="Arriendo">Arriendo</option>
                    <option value="Marketing">Marketing / Publicidad</option>
                    <option value="Equipamiento">Equipamiento</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Monto CLP</label>
                  <input
                    type="number"
                    required
                    min="100"
                    step="1000"
                    placeholder="Ej: 25000"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Medio de Pago</label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white"
                >
                  <option value="Débito">Débito / Transbank</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:bg-slate-300"
                >
                  {saving ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Venta */}
      <RegisterSaleDialog
        open={isRegisterSaleOpen}
        onOpenChange={setIsRegisterSaleOpen}
        onSaleRegistered={loadData}
      />
    </div>
  );
}
