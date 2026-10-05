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
import { ClinicalNavbar, FiltroEstadoCitas } from '@/components/agenda/ClinicalNavbar';
import { ClinicalTimeGrid } from '@/components/agenda/ClinicalTimeGrid';
import { AppointmentPopover, AppointmentPopoverData } from '@/components/agenda/AppointmentPopover';
import { BoxScheduleView } from '@/components/agenda/BoxScheduleView';
import {
  SemanaHorariosBox,
  DEFAULT_SEMANA_HORARIOS,
  DIAS_ORDENADOS
} from '@/lib/availability';
import { ScheduleAppointmentModal } from '@/components/appointments/ScheduleAppointmentModal';
import { CheckoutRapidoModal } from '@/components/agenda/CheckoutRapidoModal';

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

type VistaAgenda = 'dia' | 'semana';

function AgendaContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  
  const [fechaBase, setFechaBase] = useState<Date>(new Date());
  const [vista, setVista] = useState<VistaAgenda>('semana');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoCitas>('todas');
  const [selectedCitaForPopover, setSelectedCitaForPopover] = useState<any>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<any>(null);
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
  const [checkoutCita, setCheckoutCita] = useState<CitaExtendida | null>(null);
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
          id, fecha, hora, profesional, estado, motivo_consulta, notas, paciente_id, google_event_id,
          pacientes:paciente_id ( id, nombre_completo, rut, telefono, email, prevision, motivo_consulta, alertas_seguridad, antecedentes_morbidos )
        `)
        .gte('fecha', fechaInicioStr)
        .lte('fecha', fechaFinStr)
        .order('hora', { ascending: true });

      if (citasError) throw citasError;

      // FIX: Ensure future appointments are NOT 'asistio' or 'atendida'
      const todayStr = getFormattedLocalDate(new Date());
      citasData?.forEach(c => {
        if (c.fecha > todayStr && ['asistio', 'atendida', 'atendido'].includes(c.estado)) {
          c.estado = 'pendiente';
          // Auto-fix in DB asynchronously
          supabase.from('citas_atenciones').update({ estado: 'pendiente' }).eq('id', c.id).then();
        }
      });

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
                const tot = planElegido.total_sesiones ?? planElegido.total_sesiones ?? 1;
                const us = planElegido.sesiones_usadas ?? 0;
                const rest = Math.max(0, tot - us);
                const estPlan = (planElegido.estado === 'completado' || planElegido.estado === 'finalizado' || us >= tot)
                  ? 'finalizado'
                  : 'vigente';

                enriched = {
                  ...enriched,
                  plan_id: planElegido.id,
                  nombre_plan: planElegido.nombre_plan || planElegido.nombre_plan || vistaP.nombre_plan || 'Plan Kinésico',
                  total_sesiones: tot,
                  sesiones_usadas: us,
                  sesiones_restantes: rest,
                  estado_plan: estPlan,
                  estado_pago: planElegido.estado_pago || vistaP.estado_pago || 'pendiente',
                  monto_clp: planElegido.valor_total ?? vistaP.monto_clp ?? 0,
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

  const conteosFiltro = useMemo(() => {
    const todas = citas.length;
    const pendientes = citas.filter(c => String(c?.estado || 'pendiente').toLowerCase() === 'pendiente').length;
    const confirmadas = citas.filter(c => ['confirmada', 'asistio', 'asistió', 'atendida', 'atendido'].includes(String(c?.estado || '').toLowerCase())).length;
    return { todas, pendientes, confirmadas };
  }, [citas]);

  const citasFiltradas = useMemo(() => {
    if (filtroEstado === 'pendientes') {
      return citas.filter(c => String(c?.estado || 'pendiente').toLowerCase() === 'pendiente');
    }
    if (filtroEstado === 'confirmadas') {
      return citas.filter(c => ['confirmada', 'asistio', 'asistió', 'atendida', 'atendido'].includes(String(c?.estado || '').toLowerCase()));
    }
    return citas;
  }, [citas, filtroEstado]);

  React.useEffect(() => {
    if (vista === 'dia' && citasFiltradas.length > 0 && !selectedPatientForDrawer) {
      // Intentar buscar la cita mas cercana o la primera
      const first = citasFiltradas[0];
      const p = first.pacientes || { id: first.paciente_id };
      setSelectedPatientForDrawer(p);
      setSelectedCitaForSuite(first);
    }
  }, [vista, citasFiltradas]);

  const diasAMostrar = useMemo(() => {
    if (vista === 'dia') {
      return [fechaBase];
    }
    // Vista semana: Lunes a Sábado (6 días estándar, o 7 si Domingo está activo)
    const domingoActivo = semanaConfig[0]?.activo ?? false;
    const count = domingoActivo ? 7 : 6;
    const inicioSemana = getMonday(fechaBase);
    return Array.from({ length: count }).map((_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [fechaBase, vista, semanaConfig]);

  const changeDate = (dir: number) => {
    const next = new Date(fechaBase);
    if (vista === 'dia') {
      next.setDate(next.getDate() + dir);
    } else {
      next.setDate(next.getDate() + (dir * 7));
    }
    setFechaBase(next);
  };
  const setToday = () => setFechaBase(new Date());

  const handleGuardarNotaCita = async (citaId: string, nuevaNota: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('citas_atenciones')
      .update({ notas: nuevaNota })
      .eq('id', citaId);

    if (error) {
      console.error('Error guardando nota de cita:', error);
      throw error;
    }

    setCitas(prev =>
      prev.map(c => (c.id === citaId ? { ...c, notas: nuevaNota } : c))
    );
    if (selectedCitaForPopover && selectedCitaForPopover.id === citaId) {
      setSelectedCitaForPopover( (prev: any) => prev ? { ...prev, notas: nuevaNota } : null);
    }
  };

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
    const todayStr = new Date().toISOString().slice(0, 10);
    if (cita.fecha > todayStr) {
      toast.error('No se puede marcar como atendida una cita futura.');
      return;
    }
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
        const finalizaPlan = nuevasUsadas >= (resumen.total_sesiones || 1) || quedanSesiones <= 0;

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

    if (nuevoEstado === 'asistio' || nuevoEstado === 'atendida') {
      setCheckoutCita(cita);
      return;
    }

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
      estado_plan: 'sin_plan', sesiones_usadas: 0, total_sesiones: 0, estado_pago: 'al_dia', valor_total: 0,
    };
    
    const s = String(cita?.estado || 'pendiente').toLowerCase();
    
    // Semáforo de bordes
    let borderColor = 'border-l-slate-400 border-slate-200';
    let bgColor = 'bg-white';
    if (s === 'confirmada') { borderColor = 'border-l-emerald-500 border-slate-200'; bgColor = 'bg-emerald-50/20'; }
    else if (s === 'pendiente') { borderColor = 'border-l-amber-500 border-slate-200'; bgColor = 'bg-amber-50/20'; }
    else if (s === 'asistio' || s === 'asistió' || s === 'atendido') { borderColor = 'border-l-slate-400 border-slate-300'; bgColor = 'bg-slate-50'; }
    else if (s === 'cancelada' || s === 'no_asistio') { borderColor = 'border-l-rose-500 border-slate-200'; bgColor = 'bg-rose-50/20'; }

    const tienePlan = p.estado_plan !== 'sin_plan' && (p.total_sesiones || 0) > 0;
    const debePago = p.estado_pago === 'pendiente' && (p.valor_total || 0) > 0;
    const motivo = cita.motivo_consulta || 'Sesión Kinésica';

    // Rango horario monoespaciado
    const horaInicio = cita.hora?.slice(0, 5) || '00:00';
    const duracion = 45;
    const dateMock = new Date(`1970-01-01T${horaInicio}:00`);
    dateMock.setMinutes(dateMock.getMinutes() + duracion);
    const horaFin = dateMock.toTimeString().slice(0, 5);

    return (
      <div key={cita.id} className={`relative flex flex-col p-3 rounded-lg border border-l-4 ${borderColor} ${bgColor} hover:shadow-md transition-all cursor-pointer group`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col min-w-0 pr-10">
            <span className="font-mono text-xs text-slate-500 tabular-nums">{horaInicio} - {horaFin}</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 leading-tight">{p.nombre_completo}</span>
            <span className="text-xs text-slate-500 truncate mt-0.5" title={motivo}>{motivo}</span>
          </div>
          
          {/* Hover actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-100">
            <button onClick={(e) => { e.stopPropagation(); setSelectedPatientForDrawer(p); setSelectedCitaForSuite(cita); setIsDrawerOpen(true); }} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Ver Ficha">📋</button>
            <button onClick={(e) => { e.stopPropagation(); window.open(generarMensajeConfirmacion(cita), '_blank'); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600" title="WhatsApp">💬</button>
            <button onClick={(e) => { e.stopPropagation(); setCheckoutCita(cita); }} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Cobrar">💳</button>
            <button onClick={(e) => { e.stopPropagation(); handleCambiarEstadoCita(cita, 'asistio'); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600" title="Marcar Asistió">✓</button>
          </div>
        </div>

        {/* Badges inferiores */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100/50">
          {tienePlan && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-medium border border-blue-100">
              {p.sesiones_usadas}/{p.total_sesiones} ses.
            </span>
          )}
          {debePago ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-sm font-medium border border-rose-100">
              Debe {formatCLP(p.valor_total || 0)}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm font-medium border border-emerald-100">
              ✓ Pagado
            </span>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 sm:space-y-8 print:hidden">
        {activeTab === 'disponibilidad' ? (
          <BoxScheduleView
            onBackToAgenda={() => setActiveTab('agenda')}
            onSavedSuccess={() => { setActiveTab('agenda'); loadAgenda(); }}
          />
        ) : (
          <div className="flex flex-col gap-5 items-start">
            <div className="w-full space-y-4">
              <ClinicalNavbar
                fechaBase={fechaBase}
                vista={vista}
                onVistaChange={(v) => setVista(v)}
                onChangeDate={(dir) => changeDate(dir)}
                onToday={setToday}
                onNuevaCita={() => setShowNewCitaModal(true)}
                onBloquearHorario={() => setShowBlockModal(true)}
                filtroEstado={filtroEstado}
                onFiltroEstadoChange={(f) => setFiltroEstado(f)}
              />

              {loading ? (
                <div className="bg-white rounded-2xl p-16 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center min-h-[450px]">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-600">Cargando agenda clínica...</p>
                </div>
              ) : vista === 'dia' ? (
                // COCKPIT DE ATENCIÓN (VISTA DÍA)
                <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
                  {/* Panel Izquierdo: 40% */}
                  <div className="w-2/5 flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-800">Citas del Día</h3>
                    {citasFiltradas.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay citas registradas para hoy.</p>
                    ) : (
                      citasFiltradas.map((c) => (
                        <div key={c.id} onClick={() => {
                          const p = c.pacientes || { id: c.paciente_id };
                          setSelectedPatientForDrawer(p as any);
                          setSelectedCitaForSuite(c);
                        }}>
                          {renderCardCita(c, false)}
                        </div>
                      ))
                    )}
                  </div>
                  {/* Panel Derecho: 60% (Mini-Ficha del Box) */}
                  <div className="w-3/5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto relative p-6">
                    {selectedPatientForDrawer ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 1. Tarjeta de Identificación */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                            {selectedPatientForDrawer.nombre_completo?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-extrabold text-slate-900 truncate">
                              {selectedPatientForDrawer.nombre_completo}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm font-medium text-slate-600">
                              <span>RUT: {formatRut(selectedPatientForDrawer.rut) || 'Sin registrar'}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('fonasa') ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('isapre') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('convenio') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {selectedPatientForDrawer.prevision || 'Particular'}
                              </span>
                            </div>
                            
                            {selectedPatientForDrawer.telefono && (
                              <div className="mt-2.5">
                                <a 
                                  href={`https://wa.me/569${selectedPatientForDrawer.telefono.replace(/\D/g, '').slice(-8)}`}
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                                >
                                  💬 WhatsApp: +56 9 {selectedPatientForDrawer.telefono.replace(/\D/g, '').slice(-8).replace(/(\d{4})(\d{4})/, '$1 $2')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Alertas Clínicas / Banderas Rojas */}
                        {(selectedPatientForDrawer.alertas_seguridad || selectedPatientForDrawer.antecedentes_morbidos) && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
                            <h3 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-2 mb-1.5">
                              🚩 Banderas Rojas y Alertas
                            </h3>
                            <p className="text-sm font-medium text-rose-900 leading-relaxed">
                              {selectedPatientForDrawer.alertas_seguridad || selectedPatientForDrawer.antecedentes_morbidos}
                            </p>
                          </div>
                        )}

                        {/* 3. Tratamiento y Finanzas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Progreso del Tratamiento</h3>
                            {(selectedPatientForDrawer.total_sesiones || 0) > 0 ? (
                              <div>
                                <p className="text-lg font-extrabold text-slate-900">
                                  Sesión {selectedPatientForDrawer.sesiones_usadas || 0} <span className="text-slate-400 text-sm">de {selectedPatientForDrawer.total_sesiones}</span>
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((selectedPatientForDrawer.sesiones_usadas || 0) / (selectedPatientForDrawer.total_sesiones || 1)) * 100)}%` }}></div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-slate-700">Sin plan activo</p>
                            )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Estado de Cuenta</h3>
                            {selectedPatientForDrawer.estado_pago === 'pendiente' && (selectedPatientForDrawer.valor_total || 0) > 0 ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold text-rose-600">🔴 Debe {formatCLP(selectedPatientForDrawer.valor_total || 0)}</span>
                                <button 
                                  onClick={() => setSettlingPlan({ id: selectedPatientForDrawer.plan_id, nombre_plan: selectedPatientForDrawer.nombre_plan, monto_clp: selectedPatientForDrawer.valor_total, paciente_id: selectedPatientForDrawer.id })}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  💳 Cobrar
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-600">
                                ✓ Al día
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. Acciones de Box Inmediatas */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                          {selectedCitaForSuite && (
                            <button
                              onClick={() => handleCambiarEstadoCita(selectedCitaForSuite, 'asistio')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-sm transition-colors"
                            >
                              ✓ Marcar Asistió
                            </button>
                          )}
                          <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                            ↗ Ver SOAP Completo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <User className="w-12 h-12 mb-3 opacity-50 text-slate-300" />
                        <p className="text-sm font-medium">Seleccione un paciente de la lista para ver el Cockpit de Box.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // VISTA SEMANA
                <ClinicalTimeGrid
                  dias={diasAMostrar}
                  citas={citasFiltradas}
                  bloqueos={bloqueos}
                  semanaConfig={semanaConfig}
                  duracionPredeterminada={duracionPredeterminada}
                  onSelectEmptySlot={(fecha, hora) => { setNewCita((prev) => ({ ...prev, fecha, hora, pacienteId: '' })); setShowNewCitaModal(true); }}
                  onSelectCita={(cita) => { setSelectedCitaForPopover(cita); setIsPopoverOpen(true); }}
                  onDesbloquear={handleDesbloquearDirecto}
                />
              )}
            </div>
          </div>
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

      
      {/* Modal / Popover de Acciones Rápidas (Estilo Google Calendar) */}
      <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        {selectedCitaForPopover && (
          <>
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {selectedCitaForPopover.pacientes?.nombre_completo || selectedCitaForPopover.motivo_consulta?.replace(/^Atención Kinésica - /i, '') || 'Paciente sin registrar'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-slate-600 font-mono">
                      {formatRut(selectedCitaForPopover.pacientes?.rut || '') || 'Sin RUT'}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('fonasa') ? 'bg-purple-100 text-purple-700' :
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('isapre') ? 'bg-emerald-100 text-emerald-700' :
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('convenio') ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedCitaForPopover.pacientes?.prevision || 'Particular'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                    <span>📅 {selectedCitaForPopover.fecha}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>⏰ {selectedCitaForPopover.hora?.slice(0, 5)} - {(() => { const [h,m] = (selectedCitaForPopover.hora || '00:00').split(':').map(Number); const d = new Date(); d.setHours(h); d.setMinutes(m + 45); return d.toTimeString().slice(0,5); })()}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-6 pt-5">
              {/* Semáforo de Estado Rápido */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cambiar Estado</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'asistio'); setIsPopoverOpen(false); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${selectedCitaForPopover.estado === 'asistio' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    ✓ Asistió
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'confirmada'); setIsPopoverOpen(false); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${selectedCitaForPopover.estado === 'confirmada' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    Confirmada
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'pendiente'); setIsPopoverOpen(false); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${selectedCitaForPopover.estado === 'pendiente' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                  >
                    Pendiente
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'no_asistio'); setIsPopoverOpen(false); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${['no_asistio', 'cancelada'].includes(selectedCitaForPopover.estado || '') ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                  >
                    No asistió
                  </button>
                </div>
              </div>

              {/* Botones de Acción Inmediata */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Acciones Clínicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      if (selectedCitaForPopover.paciente_id) {
                        setSelectedPatientForDrawer(selectedCitaForPopover.pacientes || { id: selectedCitaForPopover.paciente_id });
                        setSelectedCitaForSuite(selectedCitaForPopover);
                        setIsDrawerOpen(true);
                      } else {
                        toast.error('Cita sin paciente vinculado');
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    📋 Ficha / Box
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      window.open(generarMensajeConfirmacion(selectedCitaForPopover), '_blank');
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold transition-all"
                  >
                    💬 WhatsApp
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setCheckoutCita(selectedCitaForPopover);
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold transition-all"
                  >
                    💳 Cobrar / Saldo
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setEditingCita(selectedCitaForPopover);
                        setEditForm({ fecha: selectedCitaForPopover.fecha || '', hora: selectedCitaForPopover.hora?.slice(0, 5) || '', motivo: selectedCitaForPopover.motivo_consulta || '', profesional: selectedCitaForPopover.profesional_id || '' });
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setDeletingCita(selectedCitaForPopover);
                      }}
                      className="flex-none flex items-center justify-center w-12 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold transition-all"
                      title="Cancelar Cita"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </DialogBody>
          </>
        )}
      </Dialog>

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

      <CheckoutRapidoModal
        isOpen={!!checkoutCita}
        onClose={() => setCheckoutCita(null)}
        cita={checkoutCita}
        onSuccess={() => {
          setCheckoutCita(null);
          loadAgenda();
        }}
      />

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
