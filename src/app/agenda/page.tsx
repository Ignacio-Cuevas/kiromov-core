'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PatientDrawer from '@/components/patients/PatientDrawer';
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
import { Header } from '@/components/dashboard/Header';
import { formatRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Stethoscope,
  Search,
  Loader2,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

type VistaAgenda = 'dia' | 'semana' | 'mes';

// Helper exacto para obtener fecha local en formato YYYY-MM-DD sin desfase UTC
function getFormattedLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function AgendaContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialPacienteIdParam = searchParams.get('pacienteId');

  const [vista, setVista] = useState<VistaAgenda>('dia');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Control de WhatsApp Menu abierto
  const [openWhatsappId, setOpenWhatsappId] = useState<string | null>(null);

  // Drawer de paciente
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal Nueva Cita
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [fechaCita, setFechaCita] = useState(getFormattedLocalDate(new Date()));
  const [horaCita, setHoraCita] = useState('09:00');
  const [profesional, setProfesional] = useState('Klgo. Ignacio Cuevas');
  const [motivo, setMotivo] = useState('Sesión de Tratamiento Kinésico');
  const [savingCita, setSavingCita] = useState(false);

  // Modal Editar Cita
  const [editingCita, setEditingCita] = useState<any | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('09:00');
  const [editMotivo, setEditMotivo] = useState('');
  const [editProfesional, setEditProfesional] = useState('Klgo. Ignacio Cuevas');
  const [savingEditCita, setSavingEditCita] = useState(false);

  // Modal Eliminar / Cancelar Cita
  const [deletingCita, setDeletingCita] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Cargar Citas y Pacientes de forma robusta
  const loadAgenda = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setLoading(true);

      let pDataList: any[] = [];
      let citasDataList: any[] = [];

      if (supabase) {
        // A. Cargar Pacientes para indexar por ID
        try {
          const { data: pData } = await supabase
            .from('pacientes')
            .select(`
              id,
              nombre_completo,
              rut,
              telefono,
              email,
              prevision,
              prevision_salud,
              diagnostico_principal,
              diagnostico_medico
            `)
            .order('nombre_completo', { ascending: true });

          if (pData && pData.length > 0) {
            pDataList = pData;
          }
        } catch (e) {
          console.warn('Error al cargar pacientes:', e);
        }

        const pacientesMap = new Map(pDataList.map((p) => [p.id, p]));

        // B. Consultar citas_atenciones con join resiliente
        try {
          let { data: citasData, error: errCitas } = await supabase
            .from('citas_atenciones')
            .select(`
              id,
              paciente_id,
              fecha,
              hora,
              profesional,
              estado,
              motivo_consulta,
              google_event_id,
              paciente:pacientes (
                id,
                nombre_completo,
                rut,
                telefono,
                email,
                prevision
              )
            `)
            .order('hora', { ascending: true });

          // Si el join con alias 'paciente' arroja error de foreign key cache, reintentar directo
          if (errCitas || !citasData) {
            const { data: rawCitas, error: rawErr } = await supabase
              .from('citas_atenciones')
              .select('*')
              .order('hora', { ascending: true });

            if (!rawErr && rawCitas) {
              citasData = rawCitas;
            }
          }

          if (citasData) {
            // Mapear asegurando que 'paciente' y 'pacientes' siempre estén disponibles
            citasDataList = citasData.map((c: any) => {
              const pac =
                c.paciente ||
                c.pacientes ||
                pacientesMap.get(c.paciente_id) || {
                  id: c.paciente_id,
                  nombre_completo: 'Paciente Clínico',
                  rut: '',
                };

              return {
                ...c,
                paciente: pac,
                pacientes: pac,
              };
            });
          }
        } catch (err) {
          console.error('Error al cargar citas de la agenda:', err);
        }
      }

      setPacientes(pDataList);
      setCitas(citasDataList);
      if (showToast) toast.success('Agenda actualizada con éxito');
    } catch (err) {
      console.error('Error general en loadAgenda:', err);
      toast.error('Error al conectar con la base de datos de agenda');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  // Ejecutar carga al montar o cambiar de fecha
  useEffect(() => {
    loadAgenda();
  }, [loadAgenda, selectedDate]);

  // Si viene con pacienteId en query params, pre-abrir modal
  useEffect(() => {
    if (initialPacienteIdParam && pacientes.length > 0) {
      setPacienteId(initialPacienteIdParam);
      const found = pacientes.find((p) => p.id === initialPacienteIdParam);
      if (found) setPacienteSearch(found.nombre_completo);
      setFechaCita(getFormattedLocalDate(selectedDate));
      setShowNewCitaModal(true);
    }
  }, [initialPacienteIdParam, pacientes.length, selectedDate]);

  // Navegación de Fechas Reactiva
  const handleNav = (direction: number) => {
    const d = new Date(selectedDate);
    if (vista === 'dia') d.setDate(d.getDate() + direction);
    else if (vista === 'semana') d.setDate(d.getDate() + direction * 7);
    else if (vista === 'mes') d.setMonth(d.getMonth() + direction);
    setSelectedDate(d);
  };

  const handleGoToday = () => {
    setSelectedDate(new Date());
  };

  // Fecha del día seleccionado en formato YYYY-MM-DD
  const selectedDateStr = getFormattedLocalDate(selectedDate);

  // 2. Citas del día seleccionado
  const citasDelDia = useMemo(() => {
    return citas.filter((c) => c.fecha === selectedDateStr);
  }, [citas, selectedDateStr]);

  // Citas de la semana actual (Lunes a Sábado)
  const diasSemana = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
    const lunes = new Date(d.getFullYear(), d.getMonth(), diff);

    const arr = [];
    for (let i = 0; i < 6; i++) {
      const dayDate = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      const dateStr = getFormattedLocalDate(dayDate);
      arr.push({
        date: dayDate,
        dateStr,
        nombre: dayDate.toLocaleDateString('es-CL', { weekday: 'short' }),
        citas: citas.filter((c) => c.fecha === dateStr),
      });
    }
    return arr;
  }, [selectedDate, citas]);

  // Citas del Mes
  const diasDelMes = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const primerDiaMes = new Date(y, m, 1);
    const ultimoDiaMes = new Date(y, m + 1, 0);

    const arr = [];
    const offset = primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1;
    for (let i = 0; i < offset; i++) {
      arr.push({ dayNumber: '', dateStr: '', citas: [], isCurrentMonth: false });
    }

    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      const d = new Date(y, m, i);
      const dateStr = getFormattedLocalDate(d);
      arr.push({
        dayNumber: i,
        dateStr,
        citas: citas.filter((c) => c.fecha === dateStr),
        isCurrentMonth: true,
      });
    }
    return arr;
  }, [selectedDate, citas]);

  // Actualizar estado de cita
  const updateEstadoCita = async (citaId: string, nuevoEstado: string, pacienteInfo?: any) => {
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)));

    if (nuevoEstado === 'Inasistencia (Descuenta Sesión)') {
      toast.error('Inasistencia registrada', {
        description: 'Se ha descontado 1 sesión del plan del paciente según política clínica.',
      });
    } else if (nuevoEstado === 'Asistió' || nuevoEstado === 'atendido') {
      toast.success('Atención completada', {
        description: 'Sesión registrada como atendida en box.',
      });
    } else {
      toast.info(`Estado actualizado a: ${nuevoEstado}`);
    }

    if (supabase) {
      try {
        await supabase.from('citas_atenciones').update({ estado: nuevoEstado }).eq('id', citaId);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      }
    }
  };

  // Crear nueva cita
  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !horaCita) {
      toast.error('Selecciona un paciente y una hora');
      return;
    }
    setSavingCita(true);

    const horaNormalizada = horaCita.length === 5 ? horaCita + ':00' : horaCita;
    const pSeleccionado = pacientes.find((p) => p.id === pacienteId);

    const payload = {
      paciente_id: pacienteId,
      fecha: fechaCita,
      hora: horaNormalizada,
      profesional: profesional || 'Klgo. Ignacio Cuevas',
      estado: 'pendiente',
      motivo_consulta: motivo || 'Sesión de Tratamiento Kinésico',
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('citas_atenciones')
          .insert([payload])
          .select()
          .single();

        if (!error) {
          toast.success('¡Cita agendada con éxito!', {
            description: `${pSeleccionado?.nombre_completo} — ${fechaCita} a las ${horaCita}`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });
          setPacienteId('');
          setPacienteSearch('');
          setShowNewCitaModal(false);
          await loadAgenda();
          setSavingCita(false);
          return;
        } else {
          toast.error('Error al agendar cita: ' + error.message);
        }
      } catch (err: any) {
        toast.error('Error de conexión al agendar cita');
      }
    }

    // Local fallback
    const nuevaCitaLocal = {
      id: 'cita-' + Date.now(),
      ...payload,
      paciente: pSeleccionado,
      pacientes: pSeleccionado,
    };

    setCitas((prev) => [...prev, nuevaCitaLocal].sort((a, b) => a.hora.localeCompare(b.hora)));
    setPacienteId('');
    setPacienteSearch('');
    setShowNewCitaModal(false);
    setSavingCita(false);
    toast.success('Cita agendada');
  };

  // Abrir Modal de Edición
  const handleOpenEditCita = (cita: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCita(cita);
    setEditFecha(cita.fecha);
    setEditHora(cita.hora?.slice(0, 5) || '09:00');
    setEditMotivo(cita.motivo_consulta || '');
    setEditProfesional(cita.profesional || 'Klgo. Ignacio Cuevas');
  };

  // Guardar Cambios de Edición
  const handleSaveEditCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCita) return;

    setSavingEditCita(true);
    const horaNormalizada = editHora.length === 5 ? editHora + ':00' : editHora;

    const updates = {
      fecha: editFecha,
      hora: horaNormalizada,
      motivo_consulta: editMotivo.trim() || 'Sesión de Tratamiento Kinésico',
      profesional: editProfesional,
    };

    if (supabase) {
      try {
        const { error } = await supabase
          .from('citas_atenciones')
          .update(updates)
          .eq('id', editingCita.id);

        if (!error) {
          toast.success('Cita actualizada correctamente');
          setEditingCita(null);
          await loadAgenda();
          setSavingEditCita(false);
          return;
        } else {
          toast.error('Error al actualizar cita: ' + error.message);
        }
      } catch (err) {
        toast.error('Error de conexión al actualizar cita');
      }
    }

    // Local fallback
    setCitas((prev) =>
      prev.map((c) => (c.id === editingCita.id ? { ...c, ...updates } : c))
    );
    setEditingCita(null);
    setSavingEditCita(false);
    toast.success('Cita actualizada');
  };

  // Abrir Modal de Eliminación
  const handleOpenDeleteCita = (cita: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCita(cita);
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!deletingCita) return;
    setIsDeleting(true);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('citas_atenciones')
          .delete()
          .eq('id', deletingCita.id);

        if (!error) {
          toast.success('Cita eliminada de la agenda');
          setCitas((prev) => prev.filter((c) => c.id !== deletingCita.id));
          setDeletingCita(null);
          setIsDeleting(false);
          return;
        } else {
          toast.error('Error al eliminar: ' + error.message);
        }
      } catch {
        toast.error('Error de conexión al eliminar cita');
      }
    }

    setCitas((prev) => prev.filter((c) => c.id !== deletingCita.id));
    setDeletingCita(null);
    setIsDeleting(false);
    toast.success('Cita cancelada y eliminada');
  };

  const handleOpenPatient = (p: any) => {
    const fullPatient = pacientes.find((item) => item.id === p?.id) || p;
    setSelectedPatient(fullPatient);
    setIsDrawerOpen(true);
  };

  // Título de fecha
  const tituloFecha = useMemo(() => {
    if (vista === 'dia') {
      return selectedDate.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else if (vista === 'semana') {
      return `Semana del ${diasSemana[0]?.dateStr} al ${diasSemana[diasSemana.length - 1]?.dateStr}`;
    }
    return selectedDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  }, [vista, selectedDate, diasSemana]);

  // Pacientes filtrados para selector
  const filteredPacientes = pacientes.filter((p) => {
    if (!pacienteSearch.trim()) return true;
    const q = pacienteSearch.toLowerCase().trim();
    const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
    const qClean = q.replace(/[^0-9kK]/g, '');
    return (
      (p.nombre_completo || '').toLowerCase().includes(q) ||
      (qClean.length >= 2 && rutClean.includes(qClean)) ||
      (p.telefono && p.telefono.includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" onClick={() => setOpenWhatsappId(null)}>
      {/* Header Global */}
      <Header isSupabaseOnline={true} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Barra Superior con Selector de Vistas y Fecha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 capitalize tracking-tight">
              {tituloFecha}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Control de citas, registro en box y confirmaciones vía WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector de Vistas */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setVista('dia')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'dia'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setVista('semana')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'semana'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'mes'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mes
              </button>
            </div>

            {/* Controles de Navegación Reactivos */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleNav(-1)}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                title="Día anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Ant</span>
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleNav(1)}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                title="Día siguiente"
              >
                <span>Sig</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Botón Refrescar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAgenda(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
              <span>Actualizar</span>
            </Button>

            {/* Botón Agendar Cita */}
            <button
              onClick={() => {
                setFechaCita(selectedDateStr);
                setShowNewCitaModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Agendar Cita</span>
            </button>
          </div>
        </div>

        {/* VISTA 1: DÍA */}
        {vista === 'dia' && (
          <div className="space-y-6">
            {/* KPIs del Día */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-400">Total Citados</span>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">{citasDelDia.length}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-amber-600">En Sala</span>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">
                  {citasDelDia.filter((c) => c.estado === 'En Sala' || c.estado === 'en_sala').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-emerald-600">Atendidos</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {
                    citasDelDia.filter(
                      (c) => c.estado === 'Asistió' || c.estado === 'Atendido' || c.estado === 'atendido'
                    ).length
                  }
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-400">Pendientes</span>
                <div className="text-2xl font-extrabold text-slate-600 mt-1">
                  {citasDelDia.filter((c) => c.estado === 'Pendiente' || c.estado === 'pendiente').length}
                </div>
              </div>
            </div>

            {/* Lista Horaria */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs relative">
              <div className="px-6 py-4 border-b border-slate-100 font-extrabold text-slate-800 flex items-center justify-between">
                <span>Horario de Atenciones ({citasDelDia.length})</span>
                <span className="text-xs font-normal text-slate-400 font-mono">{selectedDateStr}</span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <span className="text-sm font-semibold">Cargando citas de la agenda...</span>
                </div>
              ) : citasDelDia.length === 0 ? (
                /* Estado Vacío Limpio */
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">
                      No hay citas programadas para este día
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedDateStr} no tiene atenciones agendadas en box.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFechaCita(selectedDateStr);
                      setShowNewCitaModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-2 inline-flex items-center gap-2 text-xs shadow-xs transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Agendar Cita</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {citasDelDia.map((cita) => {
                    const p = cita.paciente || cita.pacientes;
                    const horaStr = cita.hora?.slice(0, 5) || '09:00';
                    const telClean = p?.telefono ? p.telefono.replace(/\D/g, '') : '';
                    const waPhone = telClean.startsWith('56') ? telClean : `56${telClean}`;

                    const t1 = encodeURIComponent(
                      `Hola ${p?.nombre_completo || ''}, te confirmamos tu sesión en Kiromov Centro Clínico para el ${tituloFecha} a las ${horaStr} hrs con el ${cita.profesional || 'Klgo. Ignacio Cuevas'}.\n\n📍 Bulnes 470, Oficina 75, Chillán.`
                    );
                    const t2 = encodeURIComponent(
                      `Hola ${p?.nombre_completo || ''}, te recordamos tu sesión hoy a las ${horaStr} hrs en Kiromov Centro Clínico con el ${cita.profesional || 'Klgo. Ignacio Cuevas'}.\n\n📍 Bulnes 470, Of. 75, Chillán.`
                    );

                    const isMenuOpen = openWhatsappId === cita.id;

                    return (
                      <div
                        key={cita.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors relative"
                      >
                        {/* Paciente y Hora */}
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="text-base sm:text-lg font-extrabold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl min-w-[70px] text-center border border-blue-100 shrink-0">
                            {horaStr}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                              <span>{p?.nombre_completo || 'Paciente Registrado'}</span>
                              {(p?.prevision || p?.prevision_salud) && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                  {p.prevision || p.prevision_salud}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                              <span className="font-mono">RUT: {p?.rut ? formatRut(p.rut) : 'Sin RUT'}</span>
                              {p?.telefono && <span>• Tel: {p.telefono}</span>}
                              {cita.motivo_consulta && (
                                <span className="italic text-blue-800 bg-blue-50/70 px-2 py-0.5 rounded-md font-medium">
                                  {cita.motivo_consulta}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {/* Botón WhatsApp Flotante */}
                          {telClean && (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenWhatsappId(isMenuOpen ? null : cita.id)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>WhatsApp ▾</span>
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 text-xs divide-y divide-slate-100">
                                  <div className="px-2.5 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                    Mensajes Rápidos
                                  </div>
                                  <div className="py-1 space-y-0.5">
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${t1}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg font-medium transition-colors"
                                    >
                                      <span>📩</span>
                                      <span>Confirmar Agendamiento</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${t2}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg font-medium transition-colors"
                                    >
                                      <span>⏰</span>
                                      <span>Recordatorio de Hoy</span>
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Selector de Estado */}
                          <select
                            value={cita.estado}
                            onChange={(e) => updateEstadoCita(cita.id, e.target.value, p)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer transition-colors ${
                              cita.estado === 'Asistió' || cita.estado === 'atendido'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : cita.estado === 'Inasistencia (Descuenta Sesión)'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : cita.estado === 'En Sala' || cita.estado === 'en_sala'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : cita.estado === 'Cancelado con Aviso' || cita.estado === 'cancelada'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="en_sala">🛋️ En Sala de Espera</option>
                            <option value="atendido">✓ Atendido (Asistió)</option>
                            <option value="Inasistencia (Descuenta Sesión)">🔴 Inasistencia (Descuenta Sesión)</option>
                            <option value="cancelada">⚪ Cancelada</option>
                          </select>

                          {/* Botón [ ✏️ Editar ] */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditCita(cita, e)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors"
                            title="Editar fecha, hora o motivo de la cita"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Botón [ 🗑️ Cancelar / Eliminar ] */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteCita(cita, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                            title="Cancelar o eliminar cita de la agenda"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Botón Ver Ficha */}
                          {p && (
                            <button
                              onClick={() => handleOpenPatient(p)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
                            >
                              Ficha →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: SEMANA */}
        {vista === 'semana' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {diasSemana.map((col, idx) => {
              const isToday = col.dateStr === getFormattedLocalDate(new Date());
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs flex flex-col min-h-[420px] ${
                    isToday ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="border-b pb-2 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400">{col.nombre}</span>
                      <div className="font-extrabold text-slate-800 text-sm">{col.date.getDate()}</div>
                    </div>
                    {isToday && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Hoy
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {col.citas.length === 0 ? (
                      <span className="text-xs text-slate-300 block text-center py-8">Sin citas</span>
                    ) : (
                      col.citas.map((c) => {
                        const pac = c.paciente || c.pacientes;
                        return (
                          <div
                            key={c.id}
                            onClick={() => pac && handleOpenPatient(pac)}
                            className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-700">{c.hora?.slice(0, 5)}</span>
                              <span className="text-[10px] font-semibold text-slate-400">{c.estado}</span>
                            </div>
                            <div className="font-bold text-slate-800 truncate">
                              {pac?.nombre_completo || 'Paciente'}
                            </div>
                            {c.motivo_consulta && (
                              <div className="text-[11px] text-slate-500 truncate italic">
                                {c.motivo_consulta}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VISTA 3: MES */}
        {vista === 'mes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600 uppercase">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {diasDelMes.map((dia, idx) => {
                const isToday = dia.dateStr === getFormattedLocalDate(new Date());
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-2 flex flex-col justify-between ${
                      !dia.isCurrentMonth
                        ? 'bg-slate-50/40 text-slate-300'
                        : isToday
                        ? 'bg-blue-50/30 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isToday ? 'text-blue-700 font-extrabold' : 'text-slate-700'}`}>
                        {dia.dayNumber}
                      </span>
                      {dia.citas.length > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                          {dia.citas.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dia.citas.slice(0, 2).map((c) => {
                        const pac = c.paciente || c.pacientes;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedDate(new Date(dia.dateStr + 'T12:00:00'));
                              setVista('dia');
                            }}
                            className="text-[10px] bg-blue-50 text-blue-900 truncate px-1 py-0.5 rounded cursor-pointer hover:bg-blue-100 font-medium"
                          >
                            {c.hora?.slice(0, 5)} {pac?.nombre_completo}
                          </div>
                        );
                      })}
                      {dia.citas.length > 2 && (
                        <span className="text-[9px] text-slate-400 block text-right font-bold">
                          +{dia.citas.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Agendar Nueva Cita */}
      <Dialog open={showNewCitaModal} onOpenChange={setShowNewCitaModal} maxWidth="max-w-lg">
        <DialogHeader onClose={() => setShowNewCitaModal(false)}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 border border-blue-100 shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Agendar Nueva Cita en Box</DialogTitle>
              <DialogDescription>
                Guarda la cita en la tabla citas_atenciones de Supabase.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreateCita} className="flex flex-col flex-1 min-h-0">
          <DialogBody className="space-y-4">
            {/* Selección de Paciente */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Paciente <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar paciente por Nombre o RUT..."
                  value={pacienteSearch}
                  onChange={(e) => setPacienteSearch(e.target.value)}
                  className="pl-9 bg-white rounded-xl text-sm"
                />
              </div>

              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {filteredPacientes.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPacienteId(p.id);
                      setPacienteSearch(p.nombre_completo);
                    }}
                    className={`w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between ${
                      pacienteId === p.id
                        ? 'bg-blue-50 font-bold text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{p.nombre_completo}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{formatRut(p.rut)}</span>
                    </div>
                    {pacienteId === p.id && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Fecha (YYYY-MM-DD) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={fechaCita}
                  onChange={(e) => setFechaCita(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hora <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="time"
                  required
                  value={horaCita}
                  onChange={(e) => setHoraCita(e.target.value)}
                  className="bg-white rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            {/* Profesional */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Profesional Responsable
              </label>
              <Input
                value={profesional}
                onChange={(e) => setProfesional(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>

            {/* Motivo de Consulta */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Motivo de Consulta / Pauta
              </label>
              <Input
                placeholder="Ej: Sesión de Tratamiento Kinésico Lumbar"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewCitaModal(false)}
              disabled={savingCita}
              className="rounded-xl text-xs font-bold h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingCita}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
            >
              {savingCita ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Agendando...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Confirmar Cita</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal 2: Editar Cita Existente */}
      <Dialog open={Boolean(editingCita)} onOpenChange={() => setEditingCita(null)} maxWidth="max-w-lg">
        <DialogHeader onClose={() => setEditingCita(null)}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 border border-blue-100 shrink-0">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Editar Cita Programada</DialogTitle>
              <DialogDescription>
                Paciente: <strong className="text-slate-800">{(editingCita?.paciente || editingCita?.pacientes)?.nombre_completo}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveEditCita} className="flex flex-col flex-1 min-h-0">
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Fecha <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hora <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="time"
                  required
                  value={editHora}
                  onChange={(e) => setEditHora(e.target.value)}
                  className="bg-white rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Profesional
              </label>
              <Input
                value={editProfesional}
                onChange={(e) => setEditProfesional(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Motivo de Consulta
              </label>
              <Input
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCita(null)}
              disabled={savingEditCita}
              className="rounded-xl text-xs font-bold h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingEditCita}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
            >
              {savingEditCita ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal 3: Confirmar Cancelación / Eliminación */}
      <Dialog open={Boolean(deletingCita)} onOpenChange={() => setDeletingCita(null)} maxWidth="max-w-md">
        <DialogHeader onClose={() => setDeletingCita(null)}>
          <div className="flex items-center gap-3 text-rose-700">
            <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 border border-rose-100 shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-rose-900">Cancelar / Eliminar Cita</DialogTitle>
              <DialogDescription>
                Esta acción eliminará la atención de la tabla citas_atenciones.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 text-sm text-slate-700 space-y-2">
          <p>
            ¿Estás seguro de que deseas eliminar la cita de{' '}
            <strong className="text-slate-900">
              {(deletingCita?.paciente || deletingCita?.pacientes)?.nombre_completo || 'este paciente'}
            </strong>{' '}
            programada para el{' '}
            <strong className="text-slate-900">
              {deletingCita?.fecha} a las {deletingCita?.hora?.slice(0, 5)} hrs
            </strong>
            ?
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeletingCita(null)}
            disabled={isDeleting}
            className="rounded-xl text-xs font-bold h-9 px-4"
          >
            Volver
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Confirmar Eliminación</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Drawer Clínico del Paciente */}
      <PatientDrawer
        patient={selectedPatient}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAttendanceRegistered={() => loadAgenda()}
      />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Cargando Agenda Kiromov Core...</p>
          </div>
        </div>
      }
    >
      <AgendaContent />
    </Suspense>
  );
}
