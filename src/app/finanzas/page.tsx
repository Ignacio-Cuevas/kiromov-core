'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { fetchHistorialVentas, fetchEgresosCaja, crearEgresoCaja } from '@/lib/supabase';

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

  // Filtrado reactivo en memoria por período
  const { comprasFiltradas, egresosFiltrados, totalIngresos, totalEgresos, flujoNeto, etiquetaPeriodo } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let cFiltradas = compras;
    let eFiltradas = egresos;
    let etiqueta = 'Histórico Total';

    if (periodo === 'mes') {
      etiqueta = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      cFiltradas = compras.filter((c) => {
        const d = new Date(c.fecha_compra);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      eFiltradas = egresos.filter((e) => {
        const d = new Date(e.fecha + 'T12:00:00');
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    } else if (periodo === 'semestre') {
      const semestre = currentMonth < 6 ? '1er Semestre' : '2do Semestre';
      etiqueta = `${semestre} ${currentYear}`;
      const inicioMes = currentMonth < 6 ? 0 : 6;
      const finMes = currentMonth < 6 ? 5 : 11;

      cFiltradas = compras.filter((c) => {
        const d = new Date(c.fecha_compra);
        return d.getFullYear() === currentYear && d.getMonth() >= inicioMes && d.getMonth() <= finMes;
      });
      eFiltradas = egresos.filter((e) => {
        const d = new Date(e.fecha + 'T12:00:00');
        return d.getFullYear() === currentYear && d.getMonth() >= inicioMes && d.getMonth() <= finMes;
      });
    } else if (periodo === 'ano') {
      etiqueta = `Año ${currentYear}`;
      cFiltradas = compras.filter((c) => new Date(c.fecha_compra).getFullYear() === currentYear);
      eFiltradas = egresos.filter((e) => new Date(e.fecha + 'T12:00:00').getFullYear() === currentYear);
    }

    const sumIngresos = cFiltradas.reduce((acc, item) => acc + (Number(item.total_final_clp) || Number(item.valor_total) || 0), 0);
    const sumEgresos = eFiltradas.reduce((acc, item) => acc + (Number(item.monto_clp) || 0), 0);

    return {
      comprasFiltradas: cFiltradas,
      egresosFiltrados: eFiltradas,
      totalIngresos: sumIngresos,
      totalEgresos: sumEgresos,
      flujoNeto: sumIngresos - sumEgresos,
      etiquetaPeriodo: etiqueta,
    };
  }, [compras, egresos, periodo]);

  async function handleCreateEgreso(e: React.FormEvent) {
    e.preventDefault();
    if (!concepto || !monto) return;
    setSaving(true);

    const montoNum = parseInt(monto, 10);
    const today = new Date().toISOString().split('T')[0];

    if (supabase) {
      try {
        const { error } = await supabase.from('egresos_caja').insert({
          concepto,
          categoria,
          monto_clp: montoNum,
          forma_pago: formaPago,
          medio_pago: formaPago,
          fecha: today,
        });

        if (!error) {
          setConcepto('');
          setMonto('');
          setShowModal(false);
          await loadData();
          setSaving(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase error inserting expense:', err);
      }
    }

    // Fallback local
    await crearEgresoCaja({
      concepto,
      categoria: categoria as any,
      monto_clp: montoNum,
      medio_pago: formaPago as any,
      fecha: today,
    });

    setConcepto('');
    setMonto('');
    setShowModal(false);
    await loadData();
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-sm">
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
        <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
          Klgo. Ignacio Cuevas
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

          <div className="flex items-center gap-3">
            {/* Segmented Control de Períodos */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setPeriodo('mes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'mes' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setPeriodo('semestre')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'semestre' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semestre
              </button>
              <button
                onClick={() => setPeriodo('ano')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'ano' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Este Año
              </button>
              <button
                onClick={() => setPeriodo('todo')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodo === 'todo' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Histórico
              </button>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>

        {/* KPIs Dinámicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos ({periodo.toUpperCase()})</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              ${totalIngresos.toLocaleString('es-CL')} <span className="text-xs font-normal text-slate-400">CLP</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block font-medium">{comprasFiltradas.length} compras en este período</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Egresos ({periodo.toUpperCase()})</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              ${totalEgresos.toLocaleString('es-CL')} <span className="text-xs font-normal text-slate-400">CLP</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block font-medium">{egresosFiltrados.length} gastos registrados</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flujo Neto ({periodo.toUpperCase()})</span>
            <div className={`text-2xl font-bold mt-1 ${flujoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${flujoNeto.toLocaleString('es-CL')} <span className="text-xs font-normal text-slate-400">CLP</span>
            </div>
            <span className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded ${flujoNeto >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {flujoNeto >= 0 ? '✓ Superávit Operacional' : '⚠️ Déficit en Período'}
            </span>
          </div>
        </div>

        {/* Tablas Filtradas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabla de Ventas Filtradas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
              <span>Ventas de Planes ({comprasFiltradas.length})</span>
              <span className="text-xs font-normal text-slate-500 capitalize">{etiquetaPeriodo}</span>
            </div>
            <div className="overflow-x-auto max-h-96 flex-1">
              {comprasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Sin ventas registradas en este período.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comprasFiltradas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.fecha_compra ? new Date(c.fecha_compra).toLocaleDateString('es-CL') : '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{c.pacientes?.nombre_completo || c.paciente_nombre || 'Paciente'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.plan_nombre || c.nombre_plan || 'Plan'} ({c.total_sesiones || 0} ses)</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">${(Number(c.total_final_clp) || Number(c.valor_total) || 0).toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tabla de Egresos Filtrados */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
              <span>Gastos y Egresos ({egresosFiltrados.length})</span>
              <span className="text-xs font-normal text-slate-500 capitalize">{etiquetaPeriodo}</span>
            </div>
            <div className="overflow-x-auto max-h-96 flex-1">
              {egresosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Sin egresos registrados en este período.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Concepto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {egresosFiltrados.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 text-xs">{e.fecha}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{e.concepto}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">{e.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">-${Number(e.monto_clp).toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Registrar Egreso */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">Registrar Nuevo Gasto / Egreso</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateEgreso} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Insumos clínicos, Estacionamiento..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Insumos">Insumos Clínicos</option>
                    <option value="Traslado">Traslado / Estacionamiento</option>
                    <option value="Arriendo">Arriendo / Gastos Comunes</option>
                    <option value="Servicios">Servicios Básicos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Monto ($ CLP)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 15000"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Forma de Pago</label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Débito">Débito / Transbank</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
