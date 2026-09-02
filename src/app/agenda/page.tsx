'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Header } from '@/components/dashboard/Header';
import { PatientDrawer } from '@/components/patients/PatientDrawer';
import { markAppointmentAttended } from '@/actions/appointments';
import { formatRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, User, MessageCircle,
  Stethoscope, Edit2, Trash2, Plus, CheckCircle2, Loader2, Search,
} from 'lucide-react';

function getFormattedLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(d: Date) {
  const dCopy = new Date(d);
  const day = dCopy.getDay(),
      diff = dCopy.getDate() - day + (day == 0 ? -6:1);
  return new Date(dCopy.setDate(diff));
}

const timeBlocks: string[] = [];
for (let i = 8; i <= 20; i++) {
  timeBlocks.push(`${String(i).padStart(2, '0')}:00`);
  timeBlocks.push(`${String(i).padStart(2, '0')}:30`);
}

type VistaAgenda = 'dia' | 'semana' | 'mes';

function AgendaContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [fechaBase, setFechaBase] = useState<Date>(new Date());
  const [vista, setVista] = useState<VistaAgenda>('dia');

  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal Nueva Cita
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [newCita, setNewCita] = useState({
    pacienteId: '',
    fecha: getFormattedLocalDate(new Date()),
    hora: '09:00',
    profesional: 'Klgo. Ignacio Cuevas',
    motivo: 'Tratamiento Kinésico / TMO',
  });
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [savingCita, setSavingCita] = useState(false);

  // Modal Editar Cita
  const [editingCita, setEditingCita] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', hora: '', motivo: '', profesional: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Eliminar Cita
  const [deletingCita, setDeletingCita] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAgenda = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    let fechaInicioStr: string;
    let fechaFinStr: string;

    if (vista === 'dia') {
      fechaInicioStr = getFormattedLocalDate(fechaBase);
      fechaFinStr = fechaInicioStr;
    } else if (vista === 'semana') {
      const inicioSemana = getMonday(fechaBase);
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(finSemana.getDate() + 5); // Lunes a Sábado
      fechaInicioStr = getFormattedLocalDate(inicioSemana);
      fechaFinStr = getFormattedLocalDate(finSemana);
    } else {
      // Mes completo
      const primerDiaMes = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
      const ultimoDiaMes = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0);
      fechaInicioStr = getFormattedLocalDate(primerDiaMes);
      fechaFinStr = getFormattedLocalDate(ultimoDiaMes);
    }

    try {
      const { data: citasData, error: citasError } = await supabase
        .from('citas_atenciones')
        .select(`
          id, fecha, hora, profesional, estado, motivo_consulta, paciente_id,
          pacientes ( id, nombre_completo, rut, telefono, email, prevision )
        `)
        .gte('fecha', fechaInicioStr)
        .lte('fecha', fechaFinStr)
        .order('hora', { ascending: true });

      if (citasError) throw citasError;

      const { data: pacData, error: pacError } = await supabase
        .from('pacientes')
        .select('id, nombre_completo, rut')
        .order('nombre_completo', { ascending: true });

      if (!pacError && pacData) setPacientes(pacData);
      setCitas(citasData || []);
    } catch (err) {
      console.error('Error cargando agenda:', err);
      toast.error('Error al cargar la agenda');
    } finally {
      setLoading(false);
    }
  }, [fechaBase, vista, supabase]);

  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  useEffect(() => {
    const pacienteIdParam = searchParams.get('pacienteId');
    const openFicha = searchParams.get('ficha');
    if (pacienteIdParam && pacientes.length > 0) {
      if (openFicha === 'true') {
        const p = pacientes.find(p => p.id === pacienteIdParam);
        if (p) {
          setSelectedPatientForDrawer(p);
          setIsDrawerOpen(true);
        }
      } else {
        setNewCita(prev => ({ ...prev, pacienteId: pacienteIdParam }));
        setShowNewCitaModal(true);
      }
      window.history.replaceState({}, '', '/agenda');
    }
  }, [searchParams, pacientes]);

  const kpis = useMemo(() => {
    const citadosHoy = citas.length;
    const confirmadas = citas.filter(c => c.estado?.toLowerCase() === 'confirmada').length;
    const enSala = citas.filter(c => c.estado?.toLowerCase() === 'en_sala').length;
    const asistio = citas.filter(c => ['asistio', 'asistió', 'atendido'].includes(c.estado?.toLowerCase())).length;
    const pendientes = citas.filter(c => c.estado?.toLowerCase() === 'pendiente').length;
    return { citadosHoy, confirmadas, enSala, asistio, pendientes };
  }, [citas]);

  const changeDate = (dir: number) => {
    const next = new Date(fechaBase);
    if (vista === 'dia') {
      next.setDate(next.getDate() + dir);
    } else if (vista === 'semana') {
      next.setDate(next.getDate() + (dir * 7));
    } else if (vista === 'mes') {
      next.setMonth(next.getMonth() + dir);
    }
    setFechaBase(next);
  };
  const setToday = () => setFechaBase(new Date());

  const formattedTitleDate = useMemo(() => {
    if (vista === 'dia') {
      return fechaBase.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (vista === 'semana') {
      const inicio = getMonday(fechaBase);
      const fin = new Date(inicio); fin.setDate(fin.getDate() + 5);
      return `Semana del ${inicio.getDate()} al ${fin.getDate()} de ${inicio.toLocaleDateString('es-CL', {month: 'long', year: 'numeric'})}`;
    } else {
      return fechaBase.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    }
  }, [fechaBase, vista]);

  // Actions
  const handleRegistrarAsistencia = async (citaId: string, pacienteId: string) => {
    const toastId = toast.loading('Registrando asistencia...');
    try {
      const res = await markAppointmentAttended(citaId, pacienteId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        loadAgenda();
      } else toast.error(res.error || 'Error', { id: toastId });
    } catch (err) { toast.error('Ocurrió un error inesperado', { id: toastId }); }
  };

  const handleCreateCita = async () => {
    if (!supabase) return;
    if (!newCita.pacienteId || !newCita.fecha || !newCita.hora) { toast.error('Completa los campos'); return; }
    setSavingCita(true);
    try {
      const { error } = await supabase.from('citas_atenciones').insert([{
        paciente_id: newCita.pacienteId, fecha: newCita.fecha, hora: newCita.hora,
        profesional: newCita.profesional, motivo_consulta: newCita.motivo, estado: 'pendiente'
      }]);
      if (error) throw error;
      toast.success('Cita agendada');
      setShowNewCitaModal(false);
      loadAgenda();
    } catch (err) { toast.error('Error al agendar cita'); } finally { setSavingCita(false); }
  };

  const handleUpdateCita = async () => {
    if (!supabase || !editingCita) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('citas_atenciones').update({
        fecha: editForm.fecha, hora: editForm.hora, motivo_consulta: editForm.motivo, profesional: editForm.profesional
      }).eq('id', editingCita.id);
      if (error) throw error;
      toast.success('Cita actualizada');
      setEditingCita(null);
      loadAgenda();
    } catch (err) { toast.error('Error al actualizar'); } finally { setSavingEdit(false); }
  };

  const handleDeleteCita = async () => {
    if (!supabase || !deletingCita) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('citas_atenciones').delete().eq('id', deletingCita.id);
      if (error) throw error;
      toast.success('Cita eliminada');
      setDeletingCita(null);
      loadAgenda();
    } catch (err) { toast.error('Error eliminando'); } finally { setIsDeleting(false); }
  };

  const handleMarcarConfirmada = async (citaId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('citas_atenciones').update({ estado: 'confirmada' }).eq('id', citaId);
    if (error) { toast.error('Error al actualizar estado'); return; }
    toast.success('Cita confirmada correctamente');
    loadAgenda();
  };

  const generarMensajeConfirmacion = (cita: any) => {
    const nombre = cita.pacientes?.nombre_completo?.split(' ')[0] || 'Estimado/a';
    const telefonoLimpio = cita.pacientes?.telefono ? cita.pacientes.telefono.replace(/\D/g, '').slice(-9) : '';
    const texto = `Hola ${nombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${cita.fecha} a las ${cita.hora?.slice(0,5)} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;
    return `https://wa.me/56${telefonoLimpio}?text=${encodeURIComponent(texto)}`;
  };

  const pacientesOptions = useMemo(() => {
    if (!pacienteSearch.trim()) return pacientes.slice(0, 50);
    const q = pacienteSearch.toLowerCase();
    return pacientes.filter(p => p.nombre_completo?.toLowerCase().includes(q) || p.rut?.toLowerCase().includes(q)).slice(0, 50);
  }, [pacientes, pacienteSearch]);

  const renderCardCita = (cita: any, compact = false) => {
    const p = cita.pacientes;
    if (!p) return null;
    
    const s = cita.estado?.toLowerCase() || 'pendiente';
    let stateColors = 'bg-slate-50 text-slate-600 border-slate-200';
    let stateLabel = 'Pendiente';
    if (s === 'en_sala') { stateColors = 'bg-amber-50 text-amber-700 border-amber-200'; stateLabel = 'En Sala'; }
    else if (['asistio', 'asistió', 'atendido'].includes(s)) { stateColors = 'bg-emerald-50 text-emerald-700 border-emerald-200'; stateLabel = 'Asistió'; }
    else if (s === 'confirmada') { stateColors = 'bg-indigo-50 text-indigo-700 border-indigo-200'; stateLabel = 'Confirmada'; }
    else if (s === 'cancelada') { stateColors = 'bg-red-50 text-red-700 border-red-200 line-through'; stateLabel = 'Cancelada'; }
    const cleanPhone = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';

    if (compact) {
        return (
            <div key={cita.id} className={`p-2 rounded-xl border mb-2 text-left bg-white shadow-sm flex flex-col hover:shadow-md transition-shadow group ${stateColors.replace('bg-', 'border-').replace('text-', '')}`}>
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-slate-900">{cita.hora?.substring(0,5)}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stateColors}`}>{stateLabel}</span>
                </div>
                <div className="font-bold text-xs text-slate-800 leading-tight mb-0.5">{p.nombre_completo.split(' ')[0]} {p.nombre_completo.split(' ')[1] || ''}</div>
                <div className="text-[10px] text-slate-500 truncate">{cita.motivo_consulta}</div>
                <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {s === 'pendiente' && <button onClick={() => handleMarcarConfirmada(cita.id)} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold py-1 rounded">Confir.</button>}
                    {!['asistio', 'asistió', 'atendido'].includes(s) && s !== 'cancelada' && <button onClick={() => handleRegistrarAsistencia(cita.id, p.id)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold py-1 rounded">Asistió</button>}
                    <button onClick={() => { setSelectedPatientForDrawer(p); setIsDrawerOpen(true); }} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold py-1 rounded">Ficha</button>
                    {cleanPhone && <a href={generarMensajeConfirmacion(cita)} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold py-1 rounded text-center">Wsp</a>}
                </div>
            </div>
        );
    }

    return (
      <div key={cita.id} className="flex flex-col md:flex-row bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow overflow-hidden group mb-3">
        <div className="bg-slate-50 p-4 md:w-32 flex flex-row md:flex-col items-center justify-between md:justify-center border-b md:border-b-0 md:border-r border-slate-100">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{cita.hora?.substring(0,5)}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${stateColors}`}>{stateLabel}</span>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-center">
          <h4 className="text-lg font-bold text-slate-900 mb-0.5">{p.nombre_completo}</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="font-mono text-xs">{formatRut(p.rut) || 'Sin RUT'}</span>
            <span>•</span>
            <span className="text-blue-600 font-medium truncate max-w-xs">{cita.motivo_consulta}</span>
          </div>
        </div>
        <div className="p-4 border-t md:border-t-0 md:border-l border-slate-100 flex flex-row items-center gap-2 bg-slate-50/50 justify-end md:w-auto overflow-x-auto">
          {s === 'pendiente' && (
            <Button onClick={() => handleMarcarConfirmada(cita.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar Cita
            </Button>
          )}
          {!['asistio', 'asistió', 'atendido'].includes(s) && s !== 'cancelada' && (
            <Button onClick={() => handleRegistrarAsistencia(cita.id, p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Registrar Asistencia
            </Button>
          )}
          {cleanPhone && (
            <a href={generarMensajeConfirmacion(cita)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-9 px-3 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-sm flex-shrink-0 transition-colors">
              <MessageCircle className="w-4 h-4 mr-1.5" /> Solicitar Confirmación
            </a>
          )}
          <Button variant="outline" onClick={() => { setSelectedPatientForDrawer(p); setIsDrawerOpen(true); }} className="h-9 px-3 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs shadow-sm flex-shrink-0">
            <Stethoscope className="w-4 h-4 mr-1.5" /> Ficha & SOAP →
          </Button>
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-1">
            <button onClick={() => {
              setEditingCita(cita);
              setEditForm({ fecha: cita.fecha, hora: cita.hora?.substring(0,5), motivo: cita.motivo_consulta || '', profesional: cita.profesional || '' });
            }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => setDeletingCita(cita)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  };

  const renderDia = () => {
    return (
      <div className="p-4 space-y-0 min-h-[400px]">
        {citas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CalendarDays className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-base font-semibold text-slate-600">No hay citas para este día</p>
          </div>
        ) : citas.map(c => renderCardCita(c, false))}
      </div>
    );
  };

  const renderSemana = () => {
    const inicioSemana = getMonday(fechaBase);
    const dias = Array.from({length: 6}).map((_, i) => {
        const d = new Date(inicioSemana);
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <div className="overflow-x-auto min-h-[400px] bg-slate-50/50">
            <div className="flex divide-x divide-slate-200 border-b border-slate-200 min-w-[900px]">
                {dias.map((dia, idx) => {
                    const isToday = getFormattedLocalDate(dia) === getFormattedLocalDate(new Date());
                    const diaStr = getFormattedLocalDate(dia);
                    const citasDia = citas.filter(c => c.fecha === diaStr);
                    return (
                        <div key={idx} className={`flex-1 min-w-[220px] ${isToday ? 'bg-blue-50/30' : ''}`}>
                            <div className={`p-3 text-center border-b border-slate-200 sticky top-0 bg-white shadow-sm z-10 ${isToday ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-widest">{dia.toLocaleDateString('es-CL', { weekday: 'short' })}</p>
                                <p className="text-xl font-black">{dia.getDate()}</p>
                            </div>
                            <div className="p-3">
                                {citasDia.length === 0 ? (
                                    <div className="text-center text-xs text-slate-400 py-4 italic">Sin citas</div>
                                ) : citasDia.map(c => renderCardCita(c, true))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderMes = () => {
    const year = fechaBase.getFullYear();
    const month = fechaBase.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calcular días para la grilla (Lunes a Domingo)
    // getDay() => Sun=0, Mon=1...
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Si es domingo, índice 6
    
    const daysArray: (Date|null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) daysArray.push(new Date(year, month, i));
    while (daysArray.length % 7 !== 0) daysArray.push(null);

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="p-4 bg-white min-h-[500px]">
            <div className="grid grid-cols-7 border-t border-l border-slate-200">
                {weekDays.map(wd => (
                    <div key={wd} className="p-2 border-b border-r border-slate-200 text-center bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        {wd}
                    </div>
                ))}
                {daysArray.map((dia, idx) => {
                    if (!dia) return <div key={idx} className="border-b border-r border-slate-200 bg-slate-50/50 min-h-[100px]"></div>;
                    
                    const diaStr = getFormattedLocalDate(dia);
                    const isToday = diaStr === getFormattedLocalDate(new Date());
                    const citasDia = citas.filter(c => c.fecha === diaStr);
                    const citasToShow = citasDia.slice(0, 3);
                    const hasMore = citasDia.length > 3;

                    return (
                        <div 
                            key={idx} 
                            onClick={() => {
                                setFechaBase(dia);
                                setVista('dia');
                            }}
                            className={`p-1 border-b border-r border-slate-200 min-h-[100px] cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/20' : ''}`}
                        >
                            <div className="text-right p-1 mb-1">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{dia.getDate()}</span>
                            </div>
                            <div className="space-y-1">
                                {citasToShow.map(c => {
                                    const s = c.estado?.toLowerCase() || 'pendiente';
                                    let bg = 'bg-slate-100 text-slate-600';
                                    if (s === 'en_sala') bg = 'bg-amber-100 text-amber-700';
                                    else if (['asistio', 'asistió', 'atendido'].includes(s)) bg = 'bg-emerald-100 text-emerald-700';
                                    else if (s === 'confirmada') bg = 'bg-indigo-100 text-indigo-700';
                                    else if (s === 'cancelada') bg = 'bg-red-100 text-red-700 line-through';
                                    
                                    return (
                                        <div key={c.id} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold truncate ${bg}`} title={c.pacientes?.nombre_completo}>
                                            {c.hora?.slice(0,5)} {c.pacientes?.nombre_completo.split(' ')[0]}
                                        </div>
                                    );
                                })}
                                {hasMore && (
                                    <div className="text-[10px] text-center font-bold text-slate-400 mt-1">+{citasDia.length - 3} más</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-6">
        
        {/* Barra de Navegación de Fecha */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={setToday} className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-colors">
              Hoy
            </button>
            <button onClick={() => changeDate(1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center md:text-left flex-1 md:pl-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{formattedTitleDate}</h2>
          </div>
          
          <div className="flex items-center gap-2 border border-slate-200 p-1 rounded-xl bg-slate-50/50">
            <button onClick={() => setVista('dia')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vista === 'dia' ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}>Día</button>
            <button onClick={() => setVista('semana')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vista === 'semana' ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}>Semana</button>
            <button onClick={() => setVista('mes')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vista === 'mes' ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}>Mes</button>
          </div>
        </div>

        {/* KPIs del Rango */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Citados</span><span className="text-2xl font-bold text-slate-900 mt-1">{kpis.citadosHoy}</span></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendientes</span><span className="text-2xl font-bold text-slate-400 mt-1">{kpis.pendientes}</span></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmadas</span><span className="text-2xl font-bold text-indigo-600 mt-1">{kpis.confirmadas}</span></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Box / Sala</span><span className="text-2xl font-bold text-amber-600 mt-1">{kpis.enSala}</span></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atendidos</span><span className="text-2xl font-bold text-emerald-600 mt-1">{kpis.asistio}</span></div>
        </div>

        {/* Contenedor Principal Agenda */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-500" /> Citas Programadas
            </h3>
            <Button onClick={() => setShowNewCitaModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" /> Agendar Cita
            </Button>
          </div>

          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                <p className="text-sm font-medium">Cargando agenda clínica...</p>
              </div>
          ) : (
              vista === 'dia' ? renderDia() : vista === 'semana' ? renderSemana() : renderMes()
          )}
        </div>
      </main>

      <PatientDrawer patient={selectedPatientForDrawer} isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} onAttendanceRegistered={() => loadAgenda()} />

      {/* Modal Nueva Cita */}
      <Dialog open={showNewCitaModal} onOpenChange={setShowNewCitaModal}>
        <DialogHeader><DialogTitle>Agendar Nueva Cita</DialogTitle><DialogDescription>Selecciona un paciente y un horario para agendar.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Paciente</label>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por nombre o RUT..." value={pacienteSearch} onChange={e => setPacienteSearch(e.target.value)} className="pl-9 bg-slate-50" /></div>
            <select value={newCita.pacienteId} onChange={e => setNewCita({ ...newCita, pacienteId: e.target.value })} className="w-full mt-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm" size={4}>
              {pacientesOptions.map(p => <option key={p.id} value={p.id}>{p.nombre_completo} - {formatRut(p.rut)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Fecha</label><Input type="date" value={newCita.fecha} onChange={e => setNewCita({...newCita, fecha: e.target.value})} className="bg-slate-50" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Hora</label><select value={newCita.hora} onChange={e => setNewCita({...newCita, hora: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10">{timeBlocks.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Motivo de Consulta</label><Input value={newCita.motivo} onChange={e => setNewCita({...newCita, motivo: e.target.value})} className="bg-slate-50" /></div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => setShowNewCitaModal(false)}>Cancelar</Button><Button onClick={handleCreateCita} disabled={savingCita} className="bg-blue-600 hover:bg-blue-700 text-white">{savingCita ? 'Guardando...' : 'Agendar Cita'}</Button></DialogFooter>
      </Dialog>

      {/* Modal Editar Cita */}
      <Dialog open={!!editingCita} onOpenChange={(open) => !open && setEditingCita(null)}>
        <DialogHeader><DialogTitle>Editar Horario de Cita</DialogTitle><DialogDescription>Modifica la fecha, hora o profesional asignado.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Fecha</label><Input type="date" value={editForm.fecha} onChange={e => setEditForm({...editForm, fecha: e.target.value})} className="bg-slate-50" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Hora</label><select value={editForm.hora} onChange={e => setEditForm({...editForm, hora: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10">{timeBlocks.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Motivo</label><Input value={editForm.motivo} onChange={e => setEditForm({...editForm, motivo: e.target.value})} className="bg-slate-50" /></div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => setEditingCita(null)}>Cancelar</Button><Button onClick={handleUpdateCita} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">{savingEdit ? 'Actualizando...' : 'Guardar Cambios'}</Button></DialogFooter>
      </Dialog>

      {/* Modal Eliminar Cita */}
      <Dialog open={!!deletingCita} onOpenChange={(open) => !open && setDeletingCita(null)}>
        <DialogHeader><DialogTitle className="text-red-600">Cancelar Cita</DialogTitle><DialogDescription>¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
        <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setDeletingCita(null)}>Atrás</Button><Button onClick={handleDeleteCita} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">{isDeleting ? 'Eliminando...' : 'Sí, cancelar cita'}</Button></DialogFooter>
      </Dialog>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <AgendaContent />
    </Suspense>
  );
}
