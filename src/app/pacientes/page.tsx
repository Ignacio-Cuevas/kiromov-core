'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface PacienteResumen {
  id: string;
  nombre_completo: string;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  prevision: string;
  estado: string;
  plan_id: string | null;
  nombre_plan: string | null;
  sesiones_totales: number;
  sesiones_usadas: number;
  sesiones_restantes: number;
  estado_plan: 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan';
  estado_pago: 'pagado' | 'pendiente' | null;
  monto_clp: number | null;
}

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTab, setFiltroTab] = useState<'todos' | 'vigentes' | 'renovar' | 'finalizados'>('todos');
  const [busqueda, setBusqueda] = useState('');

  // 1. Carga de datos directa y limpia desde la vista de Supabase
  const cargarPacientes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vista_resumen_pacientes')
        .select('*')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setPacientes((data as PacienteResumen[]) || []);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  // 2. Métricas y KPIs Superiores
  const kpis = useMemo(() => {
    const vigentes = pacientes.filter(p => p.estado_plan === 'vigente').length;
    const porRenovar = pacientes.filter(p => p.estado_plan === 'por_renovar').length;
    const finalizados = pacientes.filter(p => p.estado_plan === 'finalizado').length;
    return { vigentes, porRenovar, finalizados, total: pacientes.length };
  }, [pacientes]);

  // 3. Filtrado por Búsqueda y Pestañas
  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
      // Filtro de texto (nombre, rut o teléfono)
      const term = busqueda.toLowerCase().trim();
      const matchText = 
        (p.nombre_completo && p.nombre_completo.toLowerCase().includes(term)) ||
        (p.rut && p.rut.toLowerCase().includes(term)) ||
        (p.telefono && p.telefono.includes(term));

      if (!matchText) return false;

      // Filtro de pestañas
      if (filtroTab === 'vigentes') return p.estado_plan === 'vigente';
      if (filtroTab === 'renovar') return p.estado_plan === 'por_renovar';
      if (filtroTab === 'finalizados') return p.estado_plan === 'finalizado';
      return true; // 'todos'
    });
  }, [pacientes, busqueda, filtroTab]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      
      {/* Header Clínico Superior */}
      

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 print:hidden">
        
        {/* Título y Acciones Globales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio Clínico y Pacientes</h1>
            <p className="text-sm text-slate-500 mt-1">Control de tratamientos activos, saldos de sesiones y fichas clínicas.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => cargarPacientes()}
              className="px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50/50 text-xs font-semibold transition-colors shadow-sm"
            >
              ⟳ Actualizar
            </button>
            <Link 
              href="/agenda" 
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              + Registrar Venta
            </Link>
            <button 
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
            >
              + Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Tarjetas KPI Superiores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Planes Vigentes</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.vigentes}</p>
              <p className="text-xs text-slate-400 mt-0.5">En tratamiento activo</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              ✓
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por Renovar</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.porRenovar}</p>
              <p className="text-xs text-slate-400 mt-0.5">1 sesión restante</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pacientes</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.total}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpis.finalizados} planes finalizados</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg">
              👥
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Pestañas */}
          <div className="flex items-center gap-1 overflow-x-auto p-1">
            <button
              onClick={() => setFiltroTab('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filtroTab === 'todos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Todos ({kpis.total})
            </button>
            <button
              onClick={() => setFiltroTab('vigentes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filtroTab === 'vigentes' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Vigentes ({kpis.vigentes})
            </button>
            <button
              onClick={() => setFiltroTab('renovar')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filtroTab === 'renovar' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Por Renovar ({kpis.porRenovar})
            </button>
            <button
              onClick={() => setFiltroTab('finalizados')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filtroTab === 'finalizados' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Finalizados ({kpis.finalizados})
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

        {/* Tabla de Pacientes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Paciente</th>
                  <th className="px-5 py-3.5">RUT / Contacto</th>
                  <th className="px-5 py-3.5">Previsión</th>
                  <th className="px-5 py-3.5">Saldo Sesiones</th>
                  <th className="px-5 py-3.5">Estado Plan</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <div className="space-y-3 px-2">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : pacientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No se encontraron pacientes con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  pacientesFiltrados.map((p) => {
                    const tienePlan = p.estado_plan !== 'sin_plan' && p.sesiones_totales > 0;
                    const pct = tienePlan ? Math.min(100, Math.round((p.sesiones_usadas / p.sesiones_totales) * 100)) : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Paciente con Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200/80">
                              {p.nombre_completo ? p.nombre_completo.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {p.nombre_completo}
                              </p>
                              {p.email && <p className="text-[11px] text-slate-400">{p.email}</p>}
                            </div>
                          </div>
                        </td>

                        {/* RUT y WhatsApp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="font-mono text-xs text-slate-700">{p.rut || '—'}</p>
                          {p.telefono && (
                            <a
                              href={`https://wa.me/56${p.telefono.replace(/\D/g, '').slice(-9)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>💬 {p.telefono}</span>
                            </a>
                          )}
                        </td>

                        {/* Previsión */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {p.prevision || 'Particular'}
                          </span>
                        </td>

                        {/* Saldo de Sesiones */}
                        <td className="px-5 py-3.5">
                          {tienePlan ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                <span>{p.sesiones_usadas}/{p.sesiones_totales} ses.</span>
                                <span className="text-slate-400 font-normal">({p.sesiones_restantes} rest.)</span>
                              </div>
                              <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    p.estado_plan === 'por_renovar' ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Sin plan activo</span>
                          )}
                        </td>

                        {/* Estado del Plan */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {p.estado_plan === 'vigente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Plan Vigente
                            </span>
                          )}
                          {p.estado_plan === 'por_renovar' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Por Renovar (1 rest.)
                            </span>
                          )}
                          {p.estado_plan === 'finalizado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Finalizado
                            </span>
                          )}
                          {p.estado_plan === 'sin_plan' && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Acciones Rápidas */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/agenda?pacienteId=${p.id}`}
                              className="px-2.5 py-1 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/50 text-slate-700 text-[11px] font-semibold transition-colors"
                            >
                              Agendar
                            </Link>
                            <Link
                              href={`/agenda?pacienteId=${p.id}&ficha=true`}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors"
                            >
                              Ficha →
                            </Link>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
