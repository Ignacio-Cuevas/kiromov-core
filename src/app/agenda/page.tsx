'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import SaleModal from "@/components/sales/SaleModal";
import { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";
import { CancelPlanModal } from "@/components/sales/CancelPlanModal";
import { PostSessionModal } from "@/components/sales/PostSessionModal";
import { AssignTreatmentModal } from "@/components/sales/AssignTreatmentModal";
import ClinicalRecordView from "@/components/clinical/ClinicalRecordView";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { markAppointmentNoShow, markAppointmentAttended } from '@/actions/appointments';
import { CitaAtencion, Paciente, VistaResumenPaciente, CompraPlan } from '@/types/database';
import { requiereReevaluacion, getResumenPlan, getCitaColorTokens } from '@/lib/clinical';

type CitaExtendida = CitaAtencion & {
  pacientes?: (Paciente & VistaResumenPaciente & { numero_boleta?: string | null }) | any;
  paciente_id?: string;
};
import { formatRut, formatCLP } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, User, MessageCircle,
  Stethoscope, Edit2, Trash2, Plus, CheckCircle2, Loader2, Search,
  Lock, Settings,
} from 'lucide-react';
import { BlockTimeModal, BloqueoAgenda } from '@/components/agenda/BlockTimeModal';
import { AgendaHeader } from '@/components/agenda/AgendaHeader';
import { TimeGridWeekly } from '@/components/agenda/TimeGridWeekly';
import { MedicalTimeGrid } from '@/components/agenda/MedicalTimeGrid';
import { BoxScheduleView } from '@/components/agenda/BoxScheduleView';
import {
  SemanaHorariosBox,
  DEFAULT_SEMANA_HORARIOS,
  DIAS_ORDENADOS
} from '@/lib/availability';
import { ScheduleAppointmentModal } from '@/components/appointments/ScheduleAppointmentModal';

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
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  
  const [fechaBase, setFechaBase] = useState<Date>(new Date());
  const [vista, setVista] = useState<VistaAgenda>('semana');

  const [citas, setCitas] = useState<CitaExtendida[]>([]);
  const [showNoSessionsAlert, setShowNoSessionsAlert] = useState<{isOpen: boolean, pacienteId: string, reason?: string} | null>(null);
  const [modalPostAtencion, setModalPostAtencion] = useState<{isOpen: boolean, paciente: Paciente, motivo: string} | null>(null);
  const [assignTreatmentModal, setAssignTreatmentModal] = useState<{isOpen: boolean, paciente: Paciente} | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [settlingPlan, setSettlingPlan] = useState<any>(null);
  const [cancelingPlan, setCancelingPlan] = useState<any>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<Paciente | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showClinicalSuite, setShowClinicalSuite] = useState(false);
  const [selectedCitaForSuite, setSelectedCitaForSuite] = useState<CitaExtendida | null>(null);

  // Modal Nueva Cita
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [newCita, setNewCita] = useState({
    pacienteId: '',
    fecha: getFormattedLocalDate(new Date()),
    hora: '09:00',
    motivo: 'Sesión Kinésica',
    profesional: 'Klgo. Ignacio Cuevas'
  });

  // Edición y Eliminación
  const [editingCita, setEditingCita] = useState<CitaExtendida | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', hora: '', motivo: '', profesional: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingCita, setDeletingCita] = useState<CitaExtendida | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Bloqueos de Horario y Configuración de Jornada
  const [activeTab, setActiveTab] = useState<'agenda' | 'disponibilidad'>('agenda');
  const [semanaConfig, setSemanaConfig] = useState<SemanaHorariosBox>(DEFAULT_SEMANA_HORARIOS);
  const [duracionPredeterminada, setDuracionPredeterminada] = useState<number>(45);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>([]);

  const handleDesbloquearDirecto = async (bloqueo: BloqueoAgenda) => {
    if (!window.confirm(`¿Deseas desbloquear "${bloqueo.titulo}"?`)) return;
    try {
      if (bloqueo.google_event_id) {
        await fetch('/api/calendar/delete-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: bloqueo.google_event_id })
        }).catch(console.warn);
      }
      if (supabase) {
        try {
          await supabase.from('bloqueos_agenda').delete().eq('id', bloqueo.id);
        } catch (e) {
          console.warn('Error al borrar bloqueo en supabase:', e);
        }
      }
      const localBlk = localStorage.getItem('kiromov_bloqueos_agenda');
      if (localBlk) {
        const filtrados = JSON.parse(localBlk).filter((b: BloqueoAgenda) => b.id !== bloqueo.id);
        localStorage.setItem('kiromov_bloqueos_agenda', JSON.stringify(filtrados));
      }
      toast.success('Horario desbloqueado correctamente');
      loadAgenda();
    } catch (err: any) {
      toast.error('Error al desbloquear horario');
    }
  };

  const handleSincronizarCalendario = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al sincronizar con Google Calendar');
      }
      if (data.totalSincronizadas > 0) {
        toast.success(`¡Sincronización exitosa! Se sincronizaron ${data.totalSincronizadas} citas con Google Calendar.`);
      } else {
        toast.info('Todas las citas vigentes ya estaban sincronizadas con Google Calendar.');
      }
      loadAgenda();
    } catch (err: any) {
      console.error('Error sincronizando calendario:', err);
      toast.error(err.message || 'Error al conectar con el servicio de calendario');
    } finally {
      setIsSyncing(false);
    }
  };

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
      finSemana.setDate(finSemana.getDate() + 6); // Lunes a Domingo (7 días completos)
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
          id, fecha, hora, profesional, estado, motivo_consulta, paciente_id, google_event_id,
          pacientes:paciente_id ( id, nombre_completo, rut, telefono, email, prevision, motivo_consulta, alertas_seguridad, antecedentes_morbidos )
        `)
        .gte('fecha', fechaInicioStr)
        .lte('fecha', fechaFinStr)
        .order('hora', { ascending: true });

      if (citasError) throw citasError;

      const { data: pacData, error: pacError } = await supabase
        .from('pacientes')
        .select('id, nombre_completo, rut, telefono')
        .order('nombre_completo', { ascending: true });

      if (!pacError && pacData) setPacientes(pacData as Paciente[]);

      const pacIds = Array.from(new Set(citasData?.map(c => c.paciente_id).filter(Boolean)));
      if (pacIds.length > 0) {
        const { data: vistaData } = await supabase.from('vista_resumen_pacientes').select('*').in('id', pacIds);
        
        // Obtener planes reales directamente desde compras_planes para asegurar consistencia
        const { data: rawPlans } = await supabase
          .from('compras_planes')
          .select('*')
          .in('paciente_id', pacIds)
          .order('created_at', { ascending: false });

        if (vistaData) {
          citasData?.forEach(c => {
            const vistaP = vistaData.find(v => v.id === c.paciente_id);
            if (vistaP && c.pacientes) {
              const patientPlans = rawPlans?.filter(p => p.paciente_id === c.paciente_id) || [];
              const activePlan = patientPlans.find(p => p.estado === 'activo');
              const latestPlan = patientPlans[0];
              const planElegido = activePlan || latestPlan;

              let enriched = { ...(c.pacientes as any), ...vistaP };
              if (planElegido) {
                const tot = planElegido.sesiones_totales ?? planElegido.total_sesiones ?? 1;
                const us = planElegido.sesiones_usadas ?? 0;
                const rest = Math.max(0, tot - us);
                const estPlan = (planElegido.estado === 'completado' || planElegido.estado === 'finalizado' || us >= tot)
                  ? 'finalizado'
                  : 'vigente';

                enriched = {
                  ...enriched,
                  plan_id: planElegido.id,
                  nombre_plan: planElegido.nombre_plan || planElegido.plan_nombre || vistaP.nombre_plan || 'Plan Kinésico',
                  sesiones_totales: tot,
                  sesiones_usadas: us,
                  sesiones_restantes: rest,
                  estado_plan: estPlan,
                  estado_pago: planElegido.estado_pago || vistaP.estado_pago || 'pendiente',
                  monto_clp: planElegido.monto_clp ?? planElegido.total_final_clp ?? vistaP.monto_clp ?? 0,
                  numero_boleta: planElegido.numero_boleta || null
                };
              }
              c.pacientes = enriched;
            }
          });
        }
      }

      // Cargar bloqueos de agenda
      try {
        let listaBloqueos: BloqueoAgenda[] = [];
        const { data: bData, error: bError } = await supabase
          .from('bloqueos_agenda')
          .select('*')
          .order('fecha_inicio', { ascending: true });

        if (!bError && bData) {
          listaBloqueos = bData;
        }

        const localBlk = localStorage.getItem('kiromov_bloqueos_agenda');
        if (localBlk) {
          const parsed = JSON.parse(localBlk);
          parsed.forEach((pb: BloqueoAgenda) => {
            if (!listaBloqueos.some(b => b.id === pb.id)) {
              listaBloqueos.push(pb);
            }
          });
        }
        setBloqueos(listaBloqueos);
      } catch (blkErr) {
        console.warn('Aviso cargando bloqueos:', blkErr);
        const localBlk = localStorage.getItem('kiromov_bloqueos_agenda');
        if (localBlk) setBloqueos(JSON.parse(localBlk));
      }

      // Cargar configuración de horarios de box y disponibilidad
      try {
        let loadedBox = false;
        const { data: boxData } = await supabase
          .from('configuracion_horarios_box')
          .select('*')
          .order('dia_semana', { ascending: true });

        if (boxData && boxData.length > 0) {
          const nuevaSemana: SemanaHorariosBox = { ...DEFAULT_SEMANA_HORARIOS };
          let dur = 45;
          boxData.forEach((row: any) => {
            const diaId = Number(row.dia_semana);
            dur = Number(row.duracion_bloque_min) || dur;
            const mananaActiva =
              row.manana_activa !== undefined && row.manana_activa !== null
                ? Boolean(row.manana_activa)
                : true;

            const tardeActiva =
              row.tarde_activa !== undefined && row.tarde_activa !== null
                ? Boolean(row.tarde_activa)
                : (row.tarde_fin || '') > (row.tarde_inicio || '');

            nuevaSemana[diaId] = {
              dia_semana: diaId,
              nombre: DIAS_ORDENADOS.find((d) => d.id === diaId)?.label || `Día ${diaId}`,
              activo: Boolean(row.activo),
              manana_activa: mananaActiva,
              manana_inicio: (row.manana_inicio || '09:00').slice(0, 5),
              manana_fin: (row.manana_fin || '13:00').slice(0, 5),
              colacion_activa: Boolean(row.colacion_activa),
              colacion_inicio: (row.colacion_inicio || '13:00').slice(0, 5),
              colacion_fin: (row.colacion_fin || '14:00').slice(0, 5),
              tarde_activa: tardeActiva,
              tarde_inicio: (row.tarde_inicio || '14:00').slice(0, 5),
              tarde_fin: (row.tarde_fin || '20:00').slice(0, 5),
              duracion_bloque_min: dur,
            };
          });
          setSemanaConfig(nuevaSemana);
          setDuracionPredeterminada(dur);
          loadedBox = true;
        }

        if (!loadedBox) {
          const cached = localStorage.getItem('kiromov_horarios_box');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.semana) setSemanaConfig(parsed.semana);
            if (parsed.duracionGlobal) setDuracionPredeterminada(parsed.duracionGlobal);
          }
        }
      } catch (boxErr) {
        console.warn('Aviso cargando disponibilidad en agenda:', boxErr);
      }

      setCitas((citasData as CitaExtendida[]) || []);
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
    const confirmadas = citas.filter(c => String(c?.estado || '').toLowerCase() === 'confirmada').length;
    const enSala = citas.filter(c => String(c?.estado || '').toLowerCase() === 'en_sala').length;
    const asistio = citas.filter(c => ['asistio', 'asistió', 'atendido'].includes(String(c?.estado || '').toLowerCase())).length;
    const pendientes = citas.filter(c => String(c?.estado || '').toLowerCase() === 'pendiente').length;
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
      const fin = new Date(inicio); fin.setDate(fin.getDate() + 6);
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const diaIni = inicio.getDate();
      const mesIni = meses[inicio.getMonth()];
      const diaFin = fin.getDate();
      const mesFin = meses[fin.getMonth()];
      const ano = fin.getFullYear();

      if (mesIni === mesFin) {
        return `Semana del ${diaIni} al ${diaFin} de ${mesFin} de ${ano}`;
      }
      return `Semana del ${diaIni} de ${mesIni} al ${diaFin} de ${mesFin} de ${ano}`;
    } else {
      return fechaBase.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
    }
  }, [fechaBase, vista]);

  // Actions
    const handleRegistrarInasistencia = async (citaId: string, pacienteId: string) => {
    if (!confirm('¿Marcar como No Asistió? Se descontará 1 sesión del plan del paciente si aplica.')) return;
    const toastId = toast.loading('Registrando inasistencia...');
    try {
      const res = await markAppointmentNoShow(citaId, pacienteId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        loadAgenda();
      } else toast.error(res.error || 'Error', { id: toastId });
    } catch (err) { toast.error('Ocurrió un error inesperado', { id: toastId }); }
  };

  const handleRegistrarAsistencia = async (cita: CitaExtendida) => {
    if (!supabase) return;
    if (cita.estado === 'asistio') {
      toast.info('Esta cita ya está registrada como asistida');
      return;
    }

    try {
      // A. Marcar cita como asistio en Supabase
      const { error: errCita } = await supabase
        .from('citas_atenciones')
        .update({ estado: 'asistio' })
        .eq('id', cita.id);

      if (errCita) throw errCita;

      const resumen = cita.pacientes;
      const quedanSesiones = (resumen?.sesiones_restantes || 1) - 1;

      // B. Descontar 1 sesión en compras_planes si tiene plan activo
      // PROHIBICIÓN ESTRICTA: NUNCA autoasignar plan ni insertar en compras_planes.
      // Si consume la última sesión (quedanSesiones <= 0), marcar estado = 'completado'.
      if (resumen?.plan_id && (resumen?.sesiones_restantes || 0) > 0) {
        const nuevasUsadas = (resumen.sesiones_usadas || 0) + 1;
        const finalizaPlan = nuevasUsadas >= (resumen.sesiones_totales || 1) || quedanSesiones <= 0;

        const updatePayload: Record<string, any> = {
          sesiones_usadas: nuevasUsadas
        };
        if (finalizaPlan) {
          updatePayload.estado = 'completado';
        }

        const { error: errPlan } = await supabase
          .from('compras_planes')
          .update(updatePayload)
          .eq('id', resumen.plan_id);

        if (errPlan) throw errPlan;
      }

      // C. Actualizar estado local reactivo en pantalla INMEDIATAMENTE
      setCitas((prev) =>
        prev.map((c) => (c.id === cita.id ? {
          ...c,
          estado: 'asistio',
          pacientes: c.pacientes ? {
            ...c.pacientes,
            sesiones_usadas: (c.pacientes.sesiones_usadas || 0) + 1,
            sesiones_restantes: Math.max(0, (c.pacientes.sesiones_restantes || 1) - 1),
            estado_plan: quedanSesiones <= 0 ? 'finalizado' : c.pacientes.estado_plan
          } : c.pacientes
        } : c))
      );

      toast.success('¡Asistencia confirmada exitosamente!');
      loadAgenda();
    } catch (err) {
      console.error('Error al registrar asistencia:', err);
      toast.error(`Error: ${(err as Error).message}`);
    }
  };

  const handleCambiarEstadoCita = async (cita: CitaExtendida, nuevoEstado: string) => {
    if (!supabase) return;
    const estadoAnterior = cita.estado;
    if (estadoAnterior === nuevoEstado) return;

    try {
      // 1. Actualizar estado de la cita en Supabase
      const { error: errCita } = await supabase
        .from('citas_atenciones')
        .update({ estado: nuevoEstado })
        .eq('id', cita.id);

      if (errCita) throw errCita;

      const resumen = cita.pacientes;
      // 2. Lógica inteligente de ajuste de saldo en compras_planes:
      // A. Si se REVIERTE de 'asistio' o 'no_asistio' a 'pendiente' o 'cancelada' -> DEVOLVER 1 sesión
      const restabaSesionAnterior = ['asistio', 'no_asistio'].includes(estadoAnterior);
      const restaSesionNuevo = ['asistio', 'no_asistio'].includes(nuevoEstado);

      if (restabaSesionAnterior && !restaSesionNuevo && resumen?.plan_id) {
        const nuevasUsadas = Math.max(0, (resumen.sesiones_usadas || 1) - 1);
        await supabase
          .from('compras_planes')
          .update({ sesiones_usadas: nuevasUsadas, estado: 'activo' })
          .eq('id', resumen.plan_id);

        toast.success(`Cita cambiada a ${nuevoEstado}. 1 sesión devuelta al plan del paciente.`);
      } 
      // B. Si pasa a 'asistio' o 'no_asistio' desde un estado que no descontaba -> DESCONTAR 1 sesión
      else if (!restabaSesionAnterior && restaSesionNuevo && resumen?.plan_id) {
        const nuevasUsadas = (resumen.sesiones_usadas || 0) + 1;
        await supabase
          .from('compras_planes')
          .update({ sesiones_usadas: nuevasUsadas })
          .eq('id', resumen.plan_id);

        toast.success(`Cita marcada como ${nuevoEstado}. 1 sesión descontada del plan.`);
      } else {
        toast.success(`Estado de la cita actualizado a ${nuevoEstado}`);
      }

      // 3. Sincronizar cancelación en Google Calendar si aplica
      if (nuevoEstado === 'cancelada' && cita.google_event_id) {
        try {
          const { syncEventToGoogleCalendar } = await import('@/actions/calendar');
          await syncEventToGoogleCalendar({
            action: 'cancel_event',
            cita_id: cita.id,
            google_event_id: cita.google_event_id
          });
        } catch (syncErr) {
          console.error('Error al sincronizar cancelación con Google Calendar:', syncErr);
        }
      }

      // 4. Actualizar estado local reactivo inmediatamente
      setCitas(prev =>
        prev.map(c => (c.id === cita.id ? { ...c, estado: nuevoEstado } : c))
      );
      loadAgenda(); // Refrescar en segundo plano
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error(`Error: ${(err as Error).message}`);
    }
  };

  const handleUpdateCita = async () => {
    if (!supabase || !editingCita) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('citas_atenciones').update({
        fecha: editForm.fecha, hora: editForm.hora, motivo_consulta: editForm.motivo, profesional: editForm.profesional
      }).eq('id', editingCita.id);
      if (error) throw error;

      if (editingCita.google_event_id) {
        try {
          const { syncEventToGoogleCalendar } = await import('@/actions/calendar');
          const syncRes = await syncEventToGoogleCalendar({
            action: 'update_event',
            cita_id: editingCita.id,
            google_event_id: editingCita.google_event_id,
            fecha: editForm.fecha,
            hora: editForm.hora,
            paciente_nombre: editingCita.pacientes?.nombre_completo,
            paciente_telefono: editingCita.pacientes?.telefono,
            motivo_consulta: editForm.motivo
          });
          if (syncRes?.google_event_id && syncRes.google_event_id !== editingCita.google_event_id) {
            await supabase.from('citas_atenciones').update({ google_event_id: syncRes.google_event_id }).eq('id', editingCita.id);
          }
        } catch (syncErr) {
          console.error('Error al actualizar Google Calendar:', syncErr);
        }
      }

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
      if (deletingCita.google_event_id) {
        try {
          const { syncEventToGoogleCalendar } = await import('@/actions/calendar');
          await syncEventToGoogleCalendar({
            action: 'cancel_event',
            cita_id: deletingCita.id,
            google_event_id: deletingCita.google_event_id,
          });
        } catch (syncErr) {
          console.error('Error al eliminar evento en Google Calendar:', syncErr);
        }
      }

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

  const formatearFechaChilena = (fechaStr: string) => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
      const [year, month, day] = partes;
      return `${day}/${month}/${year}`;
    }
    return fechaStr;
  };

  const formatearNombre = (nombreCompleto?: string | null) => {
    if (!nombreCompleto) return 'Estimado/a';
    const primerNombre = String(nombreCompleto).trim().split(' ')[0];
    if (!primerNombre) return 'Estimado/a';
    return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
  };

  const generarMensajeConfirmacion = (cita: CitaExtendida) => {
    const nombre = formatearNombre(cita?.pacientes?.nombre_completo);
    const fechaCL = formatearFechaChilena(cita?.fecha || '');
    const hora = cita?.hora?.slice(0, 5) || '16:00';
    const telefonoLimpio = cita?.pacientes?.telefono ? String(cita.pacientes.telefono).replace(/\D/g, '').slice(-9) : '';

    const texto = `Hola ${nombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${fechaCL} a las ${hora} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;

    return `https://wa.me/56${telefonoLimpio}?text=${encodeURIComponent(texto)}`;
  };

  const renderCardCita = (cita: CitaExtendida, compact = false) => {
    const p = cita.pacientes || {
      id: cita.paciente_id || '',
      nombre_completo: cita.motivo_consulta || 'Paciente Externo (Sin Ficha)',
      rut: '',
      telefono: '',
      email: '',
      prevision: 'Sin registrar',
      motivo_consulta: cita.motivo_consulta || '',
      alertas_seguridad: '',
      antecedentes_morbidos: '',
      estado_plan: 'sin_plan',
      sesiones_usadas: 0,
      sesiones_totales: 0,
      estado_pago: 'al_dia',
      monto_clp: 0,
    };
    
    const s = String(cita?.estado || 'pendiente').toLowerCase();
    const tokens = getCitaColorTokens(s);
    const cleanPhone = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';

    if (compact) {
        const { tienePlan: tienePlanCompact, sesionesUsadas, sesionesTotales } = getResumenPlan(p);

        return (
            <div key={cita.id} className={`rounded-xl border p-3 space-y-2 transition-all hover:shadow-sm mb-2 ${tokens.cardBg}`}>
                {/* Nivel 1: Hora y Badge de Estado con dot */}
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                    <span className={`font-bold text-xs font-mono ${tokens.hora}`}>{cita.hora?.slice(0, 5)}</span>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tokens.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tokens.dot}`} />
                      <select
                        value={['asistió', 'atendido'].includes(s) ? 'asistio' : s}
                        onChange={(e) => handleCambiarEstadoCita(cita, e.target.value)}
                        className="bg-transparent border-none cursor-pointer focus:outline-none text-[10px] font-semibold"
                      >
                        <option value="pendiente" className="bg-white text-ink-navy">⏳ Pendiente</option>
                        <option value="confirmada" className="bg-white text-ink-navy">✓ Confirmada</option>
                        <option value="asistio" className="bg-white text-ink-navy">✓ Asistió</option>
                        <option value="no_asistio" className="bg-white text-ink-navy">⚠️ No Asistió</option>
                        <option value="cancelada" className="bg-white text-ink-navy">✕ Cancelada</option>
                      </select>
                    </div>
                </div>

                {/* Nivel 2: Nombre y Saldo */}
                <div>
                    <p className="font-bold text-ink-navy text-xs truncate" title={p.nombre_completo}>
                      {p.nombre_completo}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="font-semibold text-slate-gray">
                        {p.prevision || 'Particular'}
                      </span>
                      <span className="font-bold text-ink-navy">
                        {tienePlanCompact ? `${sesionesUsadas}/${sesionesTotales} ses.` : 'Sin plan'}
                      </span>
                    </div>
                </div>

                {/* Nivel 3: Botones Rápidos */}
                <div className="flex items-center justify-between pt-1 border-t border-black/10">
                    <a
                      href={cleanPhone ? generarMensajeConfirmacion(cita) : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-slate-gray hover:text-signal-blue font-medium transition-colors"
                      title="WhatsApp"
                    >
                      💬 WhatsApp
                    </a>
                    <button
                      onClick={() => {
                        if (p.id) {
                          setSelectedPatientForDrawer(p);
                          setSelectedCitaForSuite(cita);
                          setIsDrawerOpen(true);
                        } else {
                          toast.info('Cita sin ficha clínica vinculada.');
                        }
                      }}
                      className="text-[11px] text-signal-blue font-semibold hover:underline"
                    >
                      Ficha →
                    </button>
                </div>
            </div>
        );
    }

    const tienePlan = p.estado_plan !== 'sin_plan' && (p.sesiones_totales || 0) > 0;
    const pct = tienePlan ? Math.min(100, Math.round(((p.sesiones_usadas || 0) / (p.sesiones_totales || 1)) * 100)) : 0;
    const debePago = p.estado_pago === 'pendiente';
    const montoPendiente = formatCLP(p.monto_clp || 0);

    return (
      <div key={cita.id} className={`rounded-cards border p-4 sm:p-5 space-y-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg mb-3 shadow-calendly ${tokens.cardBg}`}>
        {/* Cabecera y acciones de gestión */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg sm:text-xl font-mono px-3 py-1.5 rounded-inputs shadow-xs ${tokens.hora}`}>
              {cita.hora?.slice(0, 5)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-ink-navy text-sm sm:text-base">{cita.pacientes?.nombre_completo || p.nombre_completo}</h4>
                {p.prevision && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    String(p.prevision || '').toLowerCase().includes('convenio')
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : String(p.prevision || '').toLowerCase().includes('isapre')
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : String(p.prevision || '').toLowerCase().includes('fonasa')
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-pebble text-slate-gray'
                  }`}>
                    {p.prevision}
                  </span>
                )}
                {/* Badge de Estado con dot */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tokens.badge}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${tokens.dot}`} />
                  <select
                    value={['asistió', 'atendido'].includes(s) ? 'asistio' : s}
                    onChange={(e) => handleCambiarEstadoCita(cita, e.target.value)}
                    className="bg-transparent border-none cursor-pointer focus:outline-none font-semibold text-[11px]"
                  >
                    <option value="pendiente" className="bg-white text-ink-navy">⏳ Pendiente</option>
                    <option value="confirmada" className="bg-white text-ink-navy">✓ Confirmada</option>
                    <option value="asistio" className="bg-white text-ink-navy">✓ Asistió</option>
                    <option value="no_asistio" className="bg-white text-ink-navy">⚠️ No Asistió</option>
                    <option value="cancelada" className="bg-white text-ink-navy">✕ Cancelada</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-gray font-mono mt-1">
                {formatRut(p.rut) || 'Sin RUT'} • <span className="font-sans italic">{cita.motivo_consulta || 'Sesión Kinésica'}</span>
              </p>
              {(p.alertas_seguridad || p.antecedentes_morbidos) && (
                <div className="bg-rose-50/80 border border-rose-200 text-rose-900 p-2.5 rounded-xl text-xs space-y-0.5 mt-2">
                  <span className="font-bold flex items-center gap-1 text-[11px] text-rose-800 uppercase tracking-wider">
                    🚩 Alerta Seguridad TMO
                  </span>
                  <p className="text-xs text-rose-950 leading-relaxed whitespace-normal break-words font-medium">
                    {p.alertas_seguridad || p.antecedentes_morbidos}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={() => {
              setEditingCita(cita);
              setEditForm({ fecha: cita.fecha, hora: cita.hora, motivo: cita.motivo_consulta || '', profesional: cita.profesional || '' });
            }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors" title="Editar horario">✏️</button>
            <button onClick={() => { setDeletingCita(cita); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Cancelar cita">🗑️</button>
          </div>
        </div>

        {/* Panel Integrado de Tratamiento, Saldo y Estado */}
        <div className="bg-white/90 p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5 text-xs">

          {/* Fila 1: Tratamiento y Saldo de Sesiones */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tratamiento
              </span>
              <p className="font-bold text-slate-900 text-xs mt-0.5" title={p.nombre_plan || 'Plan'}>
                {tienePlan ? (p.nombre_plan || 'Plan Kinésico') : 'Sin plan activo'}
              </p>
            </div>

            {tienePlan && (p.sesiones_totales || 0) > 0 ? (
              <div className="text-right">
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {p.sesiones_usadas}/{p.sesiones_totales} ses.
                </span>
                <span className="text-[11px] text-slate-500 ml-1">
                  ({p.sesiones_restantes} rest.)
                </span>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 ml-auto">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-slate-400 text-[11px] italic">Sin sesiones prepagadas</span>
            )}
          </div>

          {/* Fila 2: Financiamiento y Estado Clínico */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">

            {/* Estado Financiero sin texto quebrado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Financiamiento:
              </span>

              {/* Caso 1: Si el plan está pagado */}
              {p?.plan_id && p?.estado_pago === 'pagado' && p?.estado_plan !== 'finalizado' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  ✓ Plan Pagado (Al día)
                  {p.numero_boleta && <span className="text-[10px] text-slate-500 ml-1 font-mono">(Bol: {p.numero_boleta})</span>}
                </span>
              )}

              {/* Caso 2: Si tiene cobro pendiente y el plan NO está finalizado */}
              {p?.plan_id && p?.estado_pago === 'pendiente' && p?.estado_plan !== 'finalizado' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                    🔴 Debe ({montoPendiente})
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSettlingPlan({ id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp, paciente_id: p.id }); }}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    💳 Cobrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelingPlan({
                        id: p.plan_id,
                        nombre_plan: p.nombre_plan,
                        sesiones_totales: p.sesiones_totales,
                        sesiones_usadas: p.sesiones_usadas,
                        monto_clp: p.monto_clp,
                        paciente_id: p.id,
                        pacientes: p
                      });
                    }}
                    className="px-1.5 py-0.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    title="Ajustar o cancelar plan"
                  >
                    ⚙️
                  </button>
                </div>
              )}

              {/* Caso 3: Si completó su plan */}
              {p?.estado_plan === 'finalizado' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                    ⚠️ Plan Finalizado
                  </span>
                  {p.estado_pago === 'pendiente' ? (
                    <button
                      type="button"
                      onClick={() => { setSettlingPlan({ id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp, paciente_id: p.id }); }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      💳 Cobrar ({montoPendiente})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAssignTreatmentModal({ isOpen: true, paciente: p }); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      + Nuevo Plan
                    </button>
                  )}
                </div>
              )}

              {/* Caso 4: Si no tiene plan */}
              {(!p?.plan_id || p?.estado_plan === 'sin_plan') && (
                <button
                  type="button"
                  onClick={() => { setAssignTreatmentModal({ isOpen: true, paciente: p }); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  + Asignar Tratamiento / Plan
                </button>
              )}
            </div>

            {/* Dolor ENA y Estado Clínico */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dolor:</span>
              <span className="font-bold text-slate-900 font-mono text-xs">
                ENA {p?.ultimo_dolor_ena !== undefined && p?.ultimo_dolor_ena !== null && p.ultimo_dolor_ena >= 0 ? `${p.ultimo_dolor_ena}/10` : '- / 10'}
              </span>
              {requiereReevaluacion(p) && (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap ml-1">
                  ⚠️ Reevaluación
                </span>
              )}
            </div>

          </div>

          {/* Alerta de última sesión si aplica */}
          {p.sesiones_restantes === 1 && (
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md block text-center animate-pulse">
                🎯 Hoy es su última sesión del plan
              </span>
            </div>
          )}

        </div>

        {/* Botonera Operativa Inferior */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {cleanPhone && (
              <a href={generarMensajeConfirmacion(cita)} target="_blank" rel="noreferrer" className="min-h-[44px] px-3.5 py-2 rounded-buttons border border-hairline bg-paper hover:bg-pebble text-slate-gray text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-calendly-btn transition-colors cursor-pointer">
                💬 Solicitar Confirmación
              </a>
            )}
            {s === 'pendiente' && (
              <button onClick={() => handleMarcarConfirmada(cita.id)} className="min-h-[44px] px-3.5 py-2 rounded-buttons bg-signal-blue hover:bg-deep-cobalt text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-calendly-btn flex items-center justify-center">
                ✓ Confirmar
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!['asistio', 'asistió', 'atendido', 'no_asistio', 'cancelada'].includes(s) && (
              <>
                <button onClick={() => handleRegistrarAsistencia(cita)} className="min-h-[44px] px-3.5 py-2 rounded-buttons bg-signal-blue hover:bg-deep-cobalt text-white text-[12px] font-semibold flex items-center justify-center gap-1 shadow-calendly-btn transition-colors cursor-pointer">
                  ✓ Registrar Asistencia
                </button>
                <button
                  onClick={() => {
                    if (p.id) {
                      handleRegistrarInasistencia(cita.id, p.id);
                    } else {
                      handleCambiarEstadoCita(cita, 'no_asistio');
                    }
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-buttons border border-hairline bg-pebble hover:bg-mist-gray/30 text-slate-gray text-[12px] font-semibold transition-colors cursor-pointer flex items-center justify-center"
                >
                  🚫 No Asistió
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (p.id) {
                  setSelectedPatientForDrawer(p);
                  setSelectedCitaForSuite(cita);
                  setIsDrawerOpen(true);
                } else {
                  toast.info('Cita sin ficha clínica vinculada en base de datos.');
                }
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-buttons bg-ink-navy hover:bg-slate-gray text-white text-[12px] font-semibold flex items-center justify-center gap-1 shadow-calendly-btn transition-colors cursor-pointer"
            >
              Ficha & SOAP →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDia = () => {
    const diaActualStr = getFormattedLocalDate(fechaBase);
    const bloqueosDia = bloqueos.filter(b => b.fecha_inicio <= diaActualStr && b.fecha_fin >= diaActualStr);

    return (
      <div className="p-4 sm:p-6 space-y-4 min-h-[400px]">
        {/* Franjas Bloqueadas con Rayado Diagonal */}
        {bloqueosDia.length > 0 && (
          <div className="space-y-3">
            {bloqueosDia.map(b => (
              <div
                key={b.id}
                className="rounded-2xl border-2 border-dashed border-amber-300 bg-[repeating-linear-gradient(45deg,#fffdf7,#fffdf7_12px,#fef3c7_12px,#fef3c7_24px)] p-4 sm:p-5 flex items-center justify-between shadow-xs transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold text-lg border border-amber-300">
                    🔒
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-950 text-sm sm:text-base">
                        {b.titulo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase border border-amber-200">
                        {b.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 font-mono font-medium mt-0.5">
                      {b.dia_completo
                        ? `Bloqueo de día completo (${b.fecha_inicio} al ${b.fecha_fin})`
                        : `Horario Bloqueado: ${b.hora_inicio || '09:00'} - ${b.hora_fin || '10:00'} hrs`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDesbloquearDirecto(b)}
                  className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}

        {citas.length === 0 && bloqueosDia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-gray">
            <CalendarDays className="w-12 h-12 mb-3 text-hairline" />
            <p className="text-[16px] font-semibold text-slate-gray">No hay citas para este día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {citas.map(c => renderCardCita(c, false))}
          </div>
        )}
      </div>
    );
  };

  const renderSemana = () => {
    const inicioSemana = getMonday(fechaBase);
    const dias = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="p-3 sm:p-5 bg-slate-50 min-h-[400px]">
        <TimeGridWeekly
          dias={dias}
          citas={citas}
          bloqueos={bloqueos}
          semanaConfig={semanaConfig}
          duracionPredeterminada={duracionPredeterminada}
          onSelectEmptySlot={(fecha, hora) => {
            setNewCita((prev) => ({ ...prev, fecha, hora, pacienteId: '' }));
            setShowNewCitaModal(true);
          }}
          onSelectCita={(cita) => {
            if (cita.pacientes?.id) {
              setSelectedPatientForDrawer(cita.pacientes);
              setSelectedCitaForSuite(cita);
              setIsDrawerOpen(true);
            } else {
              toast.info('Cita sin ficha clínica vinculada en el sistema.');
            }
          }}
          onDesbloquear={(b) => handleDesbloquearDirecto(b)}
          onCambiarEstadoCita={(c, nuevoEstado) => handleCambiarEstadoCita(c, nuevoEstado)}
        />
      </div>
    );
  };

  const renderMes = () => {
    const year = fechaBase.getFullYear();
    const month = fechaBase.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calcular días para la grilla (Lunes a Domingo)
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Si es domingo, índice 6
    
    const daysArray: (Date|null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) daysArray.push(new Date(year, month, i));
    while (daysArray.length % 7 !== 0) daysArray.push(null);

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="p-3 sm:p-6 bg-paper min-h-[500px] overflow-x-auto">
            <div className="grid grid-cols-7 border-t border-l border-hairline rounded-cards overflow-hidden min-w-[700px] lg:min-w-0">
                {weekDays.map(wd => (
                    <div key={wd} className="p-2 sm:p-3 border-b border-r border-hairline text-center bg-cloud text-[11px] sm:text-[12px] font-bold uppercase text-slate-gray tracking-wider">
                        {wd}
                    </div>
                ))}
                {daysArray.map((dia, idx) => {
                    if (!dia) return <div key={idx} className="border-b border-r border-hairline bg-cloud/50 min-h-[110px] sm:min-h-[130px]"></div>;
                    
                    const diaStr = getFormattedLocalDate(dia);
                    const isToday = diaStr === getFormattedLocalDate(new Date());
                    const citasDia = citas.filter(c => c.fecha === diaStr);
                    const bloqueosDia = bloqueos.filter(b => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr);
                    const citasToShow = citasDia.slice(0, 3);
                    const hasMore = (citasDia.length + bloqueosDia.length) > 3;

                    return (
                        <div 
                            key={idx} 
                            onClick={() => {
                                setFechaBase(dia);
                                setVista('dia');
                            }}
                            className={`p-1.5 sm:p-2 border-b border-r border-hairline min-h-[110px] sm:min-h-[130px] overflow-hidden relative cursor-pointer hover:bg-pebble transition-colors ${isToday ? 'bg-signal-blue/5' : 'bg-paper'}`}
                        >
                            <div className="text-right mb-1 sm:mb-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[12px] sm:text-[14px] font-bold ${isToday ? 'bg-signal-blue text-white' : 'text-slate-gray'}`}>{dia.getDate()}</span>
                            </div>
                            <div className="space-y-1 sm:space-y-1.5">
                                {/* Bloqueos en celda de mes */}
                                {bloqueosDia.map(b => (
                                  <div
                                    key={b.id}
                                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_6px,#fde68a_6px,#fde68a_12px)] text-amber-950 border border-amber-300 truncate shadow-2xs"
                                    title={`🔒 ${b.titulo} (${b.dia_completo ? 'Día completo' : `${b.hora_inicio || '09:00'}-${b.hora_fin || '10:00'}`})`}
                                  >
                                    🔒 {b.titulo}
                                  </div>
                                ))}

                                {citasToShow.map(c => {
                                    const s = String(c?.estado || 'pendiente').toLowerCase();
                                    const tokens = getCitaColorTokens(s);
                                    
                                    const primerNombre = c.pacientes?.nombre_completo?.split(' ')[0] || (c.motivo_consulta ? c.motivo_consulta.replace(/^Atención Kinésica - /i, '').split(' ')[0] : 'Externo');
                                    const { tienePlan, sesionesUsadas, sesionesTotales } = getResumenPlan(c.pacientes || {});
                                    const planStr = tienePlan ? `${c.pacientes?.nombre_plan} (${sesionesUsadas}/${sesionesTotales} ses)` : 'Sin plan';

                                    return (
                                        <div key={c.id} className={`px-1.5 py-0.5 rounded-md text-[10px] truncate relative group font-medium ${tokens.pillMensual}`}>
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${tokens.dot}`} />
                                            {c.hora?.slice(0,5)} • {primerNombre}
                                            
                                            {/* Hover Tooltip */}
                                            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-48 bg-ink-navy text-paper p-3 rounded-inputs shadow-calendly-lg z-[60] text-[12px] whitespace-normal pointer-events-none">
                                                <p className="font-bold text-[14px]">{c.pacientes?.nombre_completo || c.motivo_consulta || 'Paciente Sin Ficha'}</p>
                                                <p className="text-mist-gray text-[11px] mt-1">{c.pacientes?.prevision || 'Particular'} • {c.pacientes?.telefono || 'Sin tel.'}</p>
                                                <p className="text-signal-blue text-[11px] mt-1.5 font-semibold">{planStr}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {hasMore && (
                                    <div className="text-[10px] sm:text-[11px] text-center font-bold text-mist-gray mt-1 sm:mt-2 hover:text-slate-gray transition-colors">+{citasDia.length + bloqueosDia.length - 3} más</div>
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
    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 sm:space-y-8 print:hidden">
        
        {/* Pestañas Principales: Agenda / Disponibilidad de Box */}
        {/* Barra Superior Unificada Médica: AgendaHeader */}
        <AgendaHeader
          fechaBase={fechaBase}
          vista={vista}
          onVistaChange={(v) => setVista(v)}
          onChangeDate={(dir) => changeDate(dir)}
          onToday={setToday}
          kpis={kpis}
          onNuevaCita={() => setShowNewCitaModal(true)}
          onBloquearHorario={() => setShowBlockModal(true)}
          onSincronizarCalendario={handleSincronizarCalendario}
          isSyncing={isSyncing}
          onHorariosBox={() => setActiveTab('disponibilidad')}
          activeTab={activeTab}
          onActiveTabChange={(tab) => setActiveTab(tab)}
        />

        {activeTab === 'disponibilidad' ? (
          <BoxScheduleView
            onBackToAgenda={() => setActiveTab('agenda')}
            onSavedSuccess={() => {
              setActiveTab('agenda');
              loadAgenda();
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-mist-gray min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-signal-blue" />
                <p className="text-[16px] font-medium text-slate-gray">Cargando agenda clínica...</p>
              </div>
            ) : (
              vista === 'dia' ? renderDia() : vista === 'semana' ? renderSemana() : renderMes()
            )}
          </div>
        )}
      
      <Dialog open={!!showNoSessionsAlert} onOpenChange={(open) => !open && setShowNoSessionsAlert(null)}>
        <DialogHeader>
          <DialogTitle className="text-amber-600">
            {showNoSessionsAlert?.reason === 'completed' ? '¡Plan Completado!' : 'Sesiones Agotadas / Sin Plan'}
          </DialogTitle>
          <DialogDescription>
            {showNoSessionsAlert?.reason === 'completed' 
              ? 'El paciente ha consumido su última sesión del plan.'
              : 'El paciente no tiene un plan activo con saldo.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <p className="text-sm font-medium text-slate-700 text-center">
            {showNoSessionsAlert?.reason === 'completed' 
              ? '¿Deseas Asignar Renovación de Plan o Emitir Certificado de Alta?'
              : '¿Deseas Asignar un Nuevo Plan / Venta o tienes un Cobro Pendiente que registrar?'}
          </p>
        </DialogBody>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowNoSessionsAlert(null)}>Cerrar</Button>
          {showNoSessionsAlert?.reason === 'completed' && (
            <Button variant="outline" onClick={() => { 
                const paciente = pacientes.find(p => p.id === showNoSessionsAlert.pacienteId) || citas.find(c => c.paciente_id === showNoSessionsAlert.pacienteId)?.pacientes;
                if (paciente) {
                  setSelectedPatientForDrawer(paciente); 
                  setIsDrawerOpen(true); 
                }
                setShowNoSessionsAlert(null); 
              }} className="border-blue-200 text-blue-700 hover:bg-blue-50">
              Emitir Certificado
            </Button>
          )}
          <Button onClick={() => { setIsSaleModalOpen(true); setShowNoSessionsAlert(null); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto">
            {showNoSessionsAlert?.reason === 'completed' ? '+ Asignar Renovación de Plan' : '+ Asignar Nuevo Plan / Venta'}
          </Button>
        </DialogFooter>
      </Dialog>

      <SaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={() => loadAgenda()} 
      />

      <SettlePaymentModal 
        isOpen={!!settlingPlan} 
        onClose={() => setSettlingPlan(null)} 
        planEnUso={settlingPlan}
        onSuccess={() => { setSettlingPlan(null); loadAgenda(); }}
      />

      <CancelPlanModal
        isOpen={!!cancelingPlan}
        plan={cancelingPlan}
        patientName={cancelingPlan?.pacientes?.nombre_completo}
        onClose={() => setCancelingPlan(null)}
        onSuccess={() => { setCancelingPlan(null); loadAgenda(); }}
      />

      {modalPostAtencion && (
        <PostSessionModal
          isOpen={modalPostAtencion.isOpen}
          paciente={modalPostAtencion.paciente}
          motivo={modalPostAtencion.motivo}
          onClose={() => setModalPostAtencion(null)}
          onSuccess={() => {
            setModalPostAtencion(null);
            loadAgenda();
          }}
        />
      )}

      {assignTreatmentModal && (
        <AssignTreatmentModal
          isOpen={assignTreatmentModal.isOpen}
          paciente={assignTreatmentModal.paciente}
          onClose={() => setAssignTreatmentModal(null)}
          onSuccess={() => {
            setAssignTreatmentModal(null);
            loadAgenda();
          }}
        />
      )}
</main>
      {isDrawerOpen && (
        <ClinicalRecordView 
          onClose={() => setIsDrawerOpen(false)} 
          pacienteId={selectedPatientForDrawer?.id || ''} 
          citaId={selectedCitaForSuite?.id || ''}
          onSuccess={() => loadAgenda()} 
        />
      )}
      {/* Modal Unificado de Cita Rápida Medilink */}
      {showNewCitaModal && (
        <ScheduleAppointmentModal
          isOpen={showNewCitaModal}
          onClose={() => {
            setShowNewCitaModal(false);
            setNewCita(prev => ({ ...prev, pacienteId: '' }));
          }}
          onSuccess={() => {
            setShowNewCitaModal(false);
            setNewCita(prev => ({ ...prev, pacienteId: '' }));
            loadAgenda();
          }}
          preselectedPatient={pacientes.find(p => p.id === newCita.pacienteId) || null}
          initialDate={newCita.fecha}
          initialTime={newCita.hora}
          initialMotivo={newCita.motivo}
        />
      )}

      {/* Modal Editar Cita */}
      <Dialog open={!!editingCita} onOpenChange={(open) => !open && setEditingCita(null)}>
        <DialogHeader><DialogTitle>Editar Horario de Cita</DialogTitle><DialogDescription>Modifica la fecha, hora o profesional asignado.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Fecha</label><Input type="date" value={editForm.fecha} onChange={e => setEditForm({...editForm, fecha: e.target.value})} className="bg-slate-50/50" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Hora</label><select value={editForm.hora} onChange={e => setEditForm({...editForm, hora: e.target.value})} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10">{timeBlocks.map(t => {
              const isOccupied = citas.some(c => c.id !== editingCita?.id && c.fecha === editForm.fecha && c.hora?.startsWith(t) && c.estado !== 'cancelada');
              const isBlocked = bloqueos.some(b => {
                if (b.fecha_inicio <= editForm.fecha && b.fecha_fin >= editForm.fecha) {
                  if (b.dia_completo) return true;
                  return t >= (b.hora_inicio || '00:00') && t < (b.hora_fin || '23:59');
                }
                return false;
              });
              const disabled = isOccupied || isBlocked;
              return <option key={t} value={t} disabled={disabled}>{t} {isOccupied ? '(Ocupado)' : isBlocked ? '🔒 (Bloqueado)' : ''}</option>;
            })}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Motivo</label><Input value={editForm.motivo} onChange={e => setEditForm({...editForm, motivo: e.target.value})} className="bg-slate-50/50" /></div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => setEditingCita(null)}>Cancelar</Button><Button onClick={handleUpdateCita} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">{savingEdit ? 'Actualizando...' : 'Guardar Cambios'}</Button></DialogFooter>
      </Dialog>

      {/* Modal Eliminar Cita */}
      <Dialog open={!!deletingCita} onOpenChange={(open) => !open && setDeletingCita(null)}>
        <DialogHeader><DialogTitle className="text-red-600">Cancelar Cita</DialogTitle><DialogDescription>¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
        <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setDeletingCita(null)}>Atrás</Button><Button onClick={handleDeleteCita} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">{isDeleting ? 'Eliminando...' : 'Sí, cancelar cita'}</Button></DialogFooter>
      </Dialog>

      <BlockTimeModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onSuccess={() => loadAgenda()}
        initialDate={getFormattedLocalDate(fechaBase)}
        bloqueosExistentes={bloqueos}
      />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <AgendaContent />
    </Suspense>
  );
}
