'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { PatientModal } from '@/components/patients/PatientModal';
import { SaleModal } from '@/components/sales/SaleModal';
import { PayPlanModal } from '@/components/patients/PayPlanModal';
import { PatientDrawer } from '@/components/patients/PatientDrawer';
import { createClient } from '@/utils/supabase/client';
import { formatRut } from '@/lib/utils';
import { ResumenPaciente } from '@/types/paciente';
import {
  UserPlus,
  Search,
  ShoppingCart,
  CalendarDays,
  Activity,
  PackageCheck,
  AlertTriangle,
  Clock,
  Stethoscope,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<ResumenPaciente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'todos' | 'vigentes' | 'por_renovar' | 'finalizados' | 'sin_plan'>('todos');
  const [loading, setLoading] = useState(true);

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

  const [atencionesHoy, setAtencionesHoy] = useState(0);

  const fetchPacientes = async (showToast = false) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('vista_resumen_pacientes')
        .select('*')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setPacientes((data as ResumenPaciente[]) || []);

      // Fetch atenciones hoy for KPI
      const today = new Date().toISOString().split('T')[0];
      const { count: countHoy, error: errorHoy } = await supabase
        .from('citas_atenciones')
        .select('*', { count: 'exact', head: true })
        .eq('fecha', today)
        .in('estado', ['asistio', 'atendido', 'asistió']);
      
      if (!errorHoy && countHoy !== null) {
        setAtencionesHoy(countHoy);
      }

      if (showToast) toast.success('Directorio de pacientes actualizado');
    } catch (err: any) {
      console.error("Error al cargar pacientes:", err);
      toast.error("Error de conexión con el directorio de pacientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vigentesCount = pacientes.filter(p => p.estado_plan === 'vigente').length;
  const porRenovarCount = pacientes.filter(p => p.estado_plan === 'por_renovar').length;
  const finalizadosCount = pacientes.filter(p => p.estado_plan === 'finalizado').length;
  const sinPlanCount = pacientes.filter(p => !p.estado_plan || p.estado_plan === 'sin_plan').length;

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      // Pestaña
      const estado = p.estado_plan || 'sin_plan';
      if (activeFilterTab === 'vigentes' && estado !== 'vigente') return false;
      if (activeFilterTab === 'por_renovar' && estado !== 'por_renovar') return false;
      if (activeFilterTab === 'finalizados' && estado !== 'finalizado') return false;
      if (activeFilterTab === 'sin_plan' && estado !== 'sin_plan') return false;

      // Buscador
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
      return (
        p.nombre_completo.toLowerCase().includes(q) ||
        (q.replace(/[^0-9kK]/g, '').length >= 2 && rutClean.includes(q.replace(/[^0-9kK]/g, ''))) ||
        (p.telefono && p.telefono.includes(q))
      );
    });
  }, [pacientes, activeFilterTab, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-6">
        
        {/* Encabezado y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Directorio de Pacientes</h1>
            <p className="text-slate-500 mt-1">Gestión integral de pacientes y planes de tratamiento</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => {
                setPatientTargetSale(null);
                setIsSaleModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Vender Plan
            </Button>
            <Button 
              onClick={() => {
                setPatientToEdit(null);
                setIsPatientModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Paciente
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-500 block">Atenciones Hoy</span>
              <span className="text-3xl font-extrabold text-slate-900">{atencionesHoy}</span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-500 block">Planes Vigentes</span>
              <span className="text-3xl font-extrabold text-emerald-600">{vigentesCount}</span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-500 block">Por Renovar (1 ses. restante)</span>
              <span className="text-3xl font-extrabold text-amber-600">{porRenovarCount}</span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filtros y Buscador */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-nowrap overflow-x-auto gap-1 w-full md:w-auto p-1 bg-slate-100/50 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveFilterTab('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeFilterTab === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({pacientes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('vigentes')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeFilterTab === 'vigentes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planes Vigentes ({vigentesCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('por_renovar')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeFilterTab === 'por_renovar' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Renovar ({porRenovarCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('finalizados')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeFilterTab === 'finalizados' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Finalizados ({finalizadosCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('sin_plan')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeFilterTab === 'sin_plan' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sin Plan ({sinPlanCount})
            </button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Tabla de Pacientes */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 font-semibold text-slate-500">PACIENTE</th>
                  <th className="px-5 py-4 font-semibold text-slate-500">RUT / CONTACTO</th>
                  <th className="px-5 py-4 font-semibold text-slate-500">PREVISIÓN</th>
                  <th className="px-5 py-4 font-semibold text-slate-500">SALDO DE SESIONES</th>
                  <th className="px-5 py-4 font-semibold text-slate-500">ESTADO</th>
                  <th className="px-5 py-4 font-semibold text-slate-500 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                      <td className="px-5 py-4 text-right"><div className="h-8 bg-slate-100 rounded w-32 inline-block"></div></td>
                    </tr>
                  ))
                ) : filteredPacientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <UserPlus className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-600">No se encontraron pacientes</p>
                        <p className="text-sm">Intenta ajustar tu búsqueda o agregar uno nuevo.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPacientes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientForDrawer(p);
                            setIsDrawerOpen(true);
                          }}
                          className="text-left font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {p.nombre_completo}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-700">{formatRut(p.rut || '') || '—'}</span>
                          <span className="font-mono text-slate-500 text-xs">{p.telefono || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {p.prevision || 'Particular'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {p.estado_plan && p.estado_plan !== 'sin_plan' && p.sesiones_totales > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <span>{p.sesiones_usadas ?? 0}/{p.sesiones_totales} ses.</span>
                              <span className="text-slate-400 font-normal">({p.sesiones_restantes ?? 0} rest.)</span>
                            </div>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all" 
                                style={{ width: `${Math.min(100, (((p.sesiones_usadas ?? 0) / p.sesiones_totales) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Sin plan activo</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {p.estado_plan === 'vigente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Vigente
                            </span>
                          )}
                          {p.estado_plan === 'por_renovar' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Por Renovar
                            </span>
                          )}
                          {p.estado_plan === 'finalizado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Finalizado
                            </span>
                          )}
                          {(!p.estado_plan || p.estado_plan === 'sin_plan') && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          {p.estado_pago === 'pendiente' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Pago Pendiente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.estado_pago === 'pendiente' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPlanToPay({ id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp });
                                setPatientNameToPay(p.nombre_completo);
                                setIsPayPlanOpen(true);
                              }}
                              className="h-8 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 rounded-lg shadow-2xs"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Cobrar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPatientTargetSale(p);
                                setIsSaleModalOpen(true);
                              }}
                              className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 rounded-lg shadow-2xs"
                            >
                              Venta
                            </Button>
                          )}
                          <Link
                            href={`/agenda?pacienteId=${p.id}`}
                            className="h-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 rounded-lg transition-colors shadow-2xs"
                          >
                            Agendar
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPatientForDrawer(p);
                              setIsDrawerOpen(true);
                            }}
                            className="h-8 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold px-3 rounded-lg shadow-2xs"
                          >
                            <Stethoscope className="w-3.5 h-3.5 mr-1" />
                            Ficha →
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Patient Create / Edit Modal */}
      <PatientModal
        open={isPatientModalOpen}
        onOpenChange={setIsPatientModalOpen}
        patientToEdit={patientToEdit}
        onPatientSaved={() => fetchPacientes(true)}
      />

      {/* Sale / Billing Modal */}
      <SaleModal
        open={isSaleModalOpen}
        onOpenChange={setIsSaleModalOpen}
        initialPatient={patientTargetSale}
        onSaleCompleted={() => fetchPacientes(true)}
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
          onSuccess={() => fetchPacientes(true)}
        />
      )}

      {/* Patient Clinical Drawer */}
      <PatientDrawer
        patient={selectedPatientForDrawer}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onAttendanceRegistered={() => fetchPacientes(true)}
      />
    </div>
  );
}
