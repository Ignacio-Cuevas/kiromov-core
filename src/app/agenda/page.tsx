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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MessageCircle,
  Stethoscope,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';

// Helper exacto para obtener fecha local YYYY-MM-DD
function getFormattedLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Opciones de Hora
const timeBlocks: string[] = [];
for (let i = 8; i <= 20; i++) {
  timeBlocks.push(`${String(i).padStart(2, '0')}:00`);
  timeBlocks.push(`${String(i).padStart(2, '0')}:30`);
}

function AgendaContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const activeDateString = getFormattedLocalDate(selectedDate);
  const [vista, setVista] = useState<'dia' | 'semana'>('dia');

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
    fecha: activeDateString,
    hora: '09:00',
    profesional: 'Klgo. Ignacio Cuevas',
    motivo: 'Tratamiento Kinésico / TMO',
  });
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [savingCita, setSavingCita] = useState(false);

  // Modal Editar Cita
  const [editingCita, setEditingCita] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    fecha: '',
    hora: '',
    motivo: '',
    profesional: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Eliminar Cita
  const [deletingCita, setDeletingCita] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Cargar Datos
  const loadAgenda = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: citasData, error: citasError } = await supabase
        .from('citas_atenciones')
        .select(`
          id,
          fecha,
          hora,
          profesional,
          estado,
          motivo_consulta,
          paciente_id,
          pacientes (
            id,
            nombre_completo,
            rut,
            telefono,
            email,
            prevision
          )
        `)
        .eq('fecha', activeDateString)
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
  }, [activeDateString, supabase]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  // Manejo SearchParams (Agendar desde paciente)
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

  // 2. KPIs
  const kpis = useMemo(() => {
    const citadosHoy = citas.length;
    const enSala = citas.filter(c => c.estado?.toLowerCase() === 'en_sala').length;
    const asistio = citas.filter(c => ['asistio', 'asistió', 'atendido'].includes(c.estado?.toLowerCase())).length;
    const pendientes = citas.filter(c => c.estado?.toLowerCase() === 'pendiente').length;
    return { citadosHoy, enSala, asistio, pendientes };
  }, [citas]);

  // Navegación Fechas
  const changeDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };
  const setToday = () => setSelectedDate(new Date());

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedTitleDate = selectedDate.toLocaleDateString('es-CL', dateOptions);

  // 3. Actions
  const handleRegistrarAsistencia = async (citaId: string, pacienteId: string) => {
    const toastId = toast.loading('Registrando asistencia...');
    try {
      const res = await markAppointmentAttended(citaId, pacienteId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        loadAgenda();
      } else {
        toast.error(res.error || 'Error', { id: toastId });
      }
    } catch (err) {
      toast.error('Ocurrió un error inesperado', { id: toastId });
    }
  };

  const handleCreateCita = async () => {
    if (!supabase) return;
    if (!newCita.pacienteId || !newCita.fecha || !newCita.hora) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSavingCita(true);
    try {
      const { error } = await supabase.from('citas_atenciones').insert([{
        paciente_id: newCita.pacienteId,
        fecha: newCita.fecha,
        hora: newCita.hora,
        profesional: newCita.profesional,
        motivo_consulta: newCita.motivo,
        estado: 'pendiente'
      }]);
      if (error) throw error;
      toast.success('Cita agendada exitosamente');
      setShowNewCitaModal(false);
      loadAgenda();
    } catch (err) {
      toast.error('Error al agendar cita');
    } finally {
      setSavingCita(false);
    }
  };

  const handleUpdateCita = async () => {
    if (!supabase || !editingCita) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('citas_atenciones').update({
        fecha: editForm.fecha,
        hora: editForm.hora,
        motivo_consulta: editForm.motivo,
        profesional: editForm.profesional
      }).eq('id', editingCita.id);
      
      if (error) throw error;
      toast.success('Cita actualizada');
      setEditingCita(null);
      loadAgenda();
    } catch (err) {
      toast.error('Error al actualizar cita');
    } finally {
      setSavingEdit(false);
    }
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
    } catch (err) {
      toast.error('Error eliminando cita');
    } finally {
      setIsDeleting(false);
    }
  };

  const pacientesOptions = useMemo(() => {
    if (!pacienteSearch.trim()) return pacientes.slice(0, 50);
    const q = pacienteSearch.toLowerCase();
    return pacientes.filter(p => 
      p.nombre_completo?.toLowerCase().includes(q) || 
      p.rut?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [pacientes, pacienteSearch]);

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
            <h2 className="text-xl font-extrabold text-slate-900 capitalize tracking-tight">{formattedTitleDate}</h2>
          </div>
          
          <div className="flex items-center gap-2 border border-slate-200 p-1 rounded-xl bg-slate-50/50">
            <button 
              onClick={() => setVista('dia')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vista === 'dia' ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Día
            </button>
            <button 
              onClick={() => setVista('semana')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vista === 'semana' ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Semana
            </button>
          </div>
        </div>

        {/* KPIs del Día */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Citados Hoy</span>
            <span className="text-2xl font-bold text-slate-900 mt-1">{kpis.citadosHoy}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Box / Sala</span>
            <span className="text-2xl font-bold text-amber-600 mt-1">{kpis.enSala}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atendidos</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1">{kpis.asistio}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendientes</span>
            <span className="text-2xl font-bold text-blue-600 mt-1">{kpis.pendientes}</span>
          </div>
        </div>

        {/* Contenedor Principal Agenda */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Tarjetas */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-500" />
              Citas Programadas
            </h3>
            <Button onClick={() => setShowNewCitaModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Agendar Cita
            </Button>
          </div>

          <div className="p-4 space-y-3 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                <p className="text-sm font-medium">Cargando agenda clínica...</p>
              </div>
            ) : citas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <CalendarDays className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-base font-semibold text-slate-600">No hay citas para este día</p>
                <p className="text-sm">Agrega una cita usando el botón superior.</p>
              </div>
            ) : (
              citas.map((cita) => {
                const p = cita.pacientes;
                if (!p) return null;
                
                const s = cita.estado?.toLowerCase() || 'pendiente';
                let stateColors = 'bg-slate-50 text-slate-600 border-slate-200';
                let stateLabel = 'Pendiente';
                if (s === 'en_sala') { stateColors = 'bg-amber-50 text-amber-700 border-amber-200'; stateLabel = 'En Sala'; }
                else if (['asistio', 'asistió', 'atendido'].includes(s)) { stateColors = 'bg-emerald-50 text-emerald-700 border-emerald-200'; stateLabel = 'Asistió'; }
                else if (s === 'cancelada') { stateColors = 'bg-red-50 text-red-700 border-red-200 line-through'; stateLabel = 'Cancelada'; }

                const cleanPhone = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';
                const wpLink = `https://wa.me/56${cleanPhone}?text=${encodeURIComponent(`Hola ${p.nombre_completo.split(' ')[0]}, te recordamos tu sesión en Kiromov Centro Clínico hoy a las ${cita.hora?.substring(0,5)} hrs.`)}`;

                return (
                  <div key={cita.id} className="flex flex-col md:flex-row bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow overflow-hidden group">
                    {/* Hora */}
                    <div className="bg-slate-50 p-4 md:w-32 flex flex-row md:flex-col items-center justify-between md:justify-center border-b md:border-b-0 md:border-r border-slate-100">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{cita.hora?.substring(0,5)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${stateColors}`}>
                        {stateLabel}
                      </span>
                    </div>

                    {/* Datos Paciente */}
                    <div className="p-4 flex-1 flex flex-col justify-center">
                      <h4 className="text-lg font-bold text-slate-900 mb-0.5">{p.nombre_completo}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="font-mono text-xs">{formatRut(p.rut) || 'Sin RUT'}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium truncate max-w-xs">{cita.motivo_consulta}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="p-4 border-t md:border-t-0 md:border-l border-slate-100 flex flex-row items-center gap-2 bg-slate-50/50 justify-end md:w-auto overflow-x-auto">
                      {!['asistio', 'asistió', 'atendido'].includes(s) && s !== 'cancelada' && (
                        <Button 
                          onClick={() => handleRegistrarAsistencia(cita.id, p.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Registrar Asistencia
                        </Button>
                      )}
                      
                      {cleanPhone && (
                        <a href={wpLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-9 px-3 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-sm flex-shrink-0 transition-colors">
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          WhatsApp
                        </a>
                      )}

                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedPatientForDrawer(p);
                          setIsDrawerOpen(true);
                        }}
                        className="h-9 px-3 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs shadow-sm flex-shrink-0"
                      >
                        <Stethoscope className="w-4 h-4 mr-1.5" />
                        Ficha & SOAP →
                      </Button>

                      {/* Botones de Icono */}
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-1">
                        <button onClick={() => {
                          setEditingCita(cita);
                          setEditForm({
                            fecha: cita.fecha,
                            hora: cita.hora?.substring(0,5),
                            motivo: cita.motivo_consulta || '',
                            profesional: cita.profesional || ''
                          });
                        }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingCita(cita)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar Cita">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Drawer Ficha */}
      <PatientDrawer
        patient={selectedPatientForDrawer}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onAttendanceRegistered={() => loadAgenda()}
      />

      {/* Modal Nueva Cita */}
      <Dialog open={showNewCitaModal} onOpenChange={setShowNewCitaModal}>
        <DialogHeader>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
          <DialogDescription>Selecciona un paciente y un horario para agendar.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Paciente</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o RUT..."
                value={pacienteSearch}
                onChange={e => setPacienteSearch(e.target.value)}
                className="pl-9 bg-slate-50"
              />
            </div>
            <select
              value={newCita.pacienteId}
              onChange={e => setNewCita({ ...newCita, pacienteId: e.target.value })}
              className="w-full mt-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
              size={4}
            >
              {pacientesOptions.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_completo} - {formatRut(p.rut)}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fecha</label>
              <Input type="date" value={newCita.fecha} onChange={e => setNewCita({...newCita, fecha: e.target.value})} className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hora</label>
              <select value={newCita.hora} onChange={e => setNewCita({...newCita, hora: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10">
                {timeBlocks.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Motivo de Consulta</label>
            <Input value={newCita.motivo} onChange={e => setNewCita({...newCita, motivo: e.target.value})} className="bg-slate-50" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewCitaModal(false)}>Cancelar</Button>
          <Button onClick={handleCreateCita} disabled={savingCita} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingCita ? 'Guardando...' : 'Agendar Cita'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal Editar Cita */}
      <Dialog open={!!editingCita} onOpenChange={(open) => !open && setEditingCita(null)}>
        <DialogHeader>
          <DialogTitle>Editar Horario de Cita</DialogTitle>
          <DialogDescription>Modifica la fecha, hora o profesional asignado.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fecha</label>
              <Input type="date" value={editForm.fecha} onChange={e => setEditForm({...editForm, fecha: e.target.value})} className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hora</label>
              <select value={editForm.hora} onChange={e => setEditForm({...editForm, hora: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10">
                {timeBlocks.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Motivo</label>
            <Input value={editForm.motivo} onChange={e => setEditForm({...editForm, motivo: e.target.value})} className="bg-slate-50" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingCita(null)}>Cancelar</Button>
          <Button onClick={handleUpdateCita} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingEdit ? 'Actualizando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal Eliminar Cita */}
      <Dialog open={!!deletingCita} onOpenChange={(open) => !open && setDeletingCita(null)}>
        <DialogHeader>
          <DialogTitle className="text-red-600">Cancelar Cita</DialogTitle>
          <DialogDescription>¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setDeletingCita(null)}>Atrás</Button>
          <Button onClick={handleDeleteCita} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
            {isDeleting ? 'Eliminando...' : 'Sí, cancelar cita'}
          </Button>
        </DialogFooter>
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
