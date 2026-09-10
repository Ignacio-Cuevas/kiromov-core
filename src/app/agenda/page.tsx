'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import SaleModal from "@/components/sales/SaleModal";
import { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";
import { PostSessionModal } from "@/components/sales/PostSessionModal";
import { AssignTreatmentModal } from "@/components/sales/AssignTreatmentModal";
import ClinicalBoxSuite from "@/components/clinical/ClinicalBoxSuite";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { markAppointmentNoShow, markAppointmentAttended } from '@/actions/appointments';
import { CitaAtencion, Paciente, VistaResumenPaciente, CompraPlan } from '@/types/database';
import { requiereReevaluacion, getResumenPlan } from '@/lib/clinical';

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

  const [citas, setCitas] = useState<CitaExtendida[]>([]);
  const [showNoSessionsAlert, setShowNoSessionsAlert] = useState<{isOpen: boolean, pacienteId: string, reason?: string} | null>(null);
  const [modalPostAtencion, setModalPostAtencion] = useState<{isOpen: boolean, paciente: Paciente, motivo: string} | null>(null);
  const [assignTreatmentModal, setAssignTreatmentModal] = useState<{isOpen: boolean, paciente: Paciente} | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [settlingPlan, setSettlingPlan] = useState<any>(null);
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
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [savingCita, setSavingCita] = useState(false);

  // Edición y Eliminación
  const [editingCita, setEditingCita] = useState<CitaExtendida | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', hora: '', motivo: '', profesional: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingCita, setDeletingCita] = useState<CitaExtendida | null>(null);
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
          pacientes:paciente_id ( id, nombre_completo, rut, telefono, email, prevision, motivo_consulta, alertas_seguridad, antecedentes_morbidos )
        `)
        .gte('fecha', fechaInicioStr)
        .lte('fecha', fechaFinStr)
        .order('hora', { ascending: true });

      if (citasError) throw citasError;

      const { data: pacData, error: pacError } = await supabase
        .from('pacientes')
        .select('id, nombre_completo, rut')
        .order('nombre_completo', { ascending: true });

      if (!pacError && pacData) setPacientes(pacData as Paciente[]);

      const pacIds = Array.from(new Set(citasData?.map(c => c.paciente_id).filter(Boolean)));
      if (pacIds.length > 0) {
        const { data: vistaData } = await supabase.from('vista_resumen_pacientes').select('*').in('id', pacIds);
        
        const planIds = vistaData?.map(v => v.plan_id).filter(Boolean) || [];
        const { data: planesData } = planIds.length > 0 
          ? await supabase.from('planes').select('id, numero_boleta, monto_clp').in('id', planIds)
          : { data: [] };

        if (vistaData) {
          citasData?.forEach(c => {
            const vistaP = vistaData.find(v => v.id === c.paciente_id);
            if (vistaP && c.pacientes) {
              const plan = planesData?.find(pl => pl.id === vistaP.plan_id);
              c.pacientes = { 
                ...(c.pacientes as any), 
                ...vistaP, 
                numero_boleta: plan?.numero_boleta || null 
              };
            }
          });
        }
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
      return fechaBase.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
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

      // B. Descontar 1 sesión en compras_planes si tiene plan activo
      if (resumen?.plan_id && (resumen?.sesiones_restantes || 0) > 0) {
        const { error: errPlan } = await supabase
          .from('compras_planes')
          .update({ sesiones_usadas: (resumen.sesiones_usadas || 0) + 1 })
          .eq('id', resumen.plan_id);

        if (errPlan) throw errPlan;
      }

      // C. Actualizar estado local reactivo en pantalla INMEDIATAMENTE
      setCitas((prev) =>
        prev.map((c) => (c.id === cita.id ? { ...c, estado: 'asistio' } : c))
      );

      toast.success('¡Asistencia confirmada exitosamente!');

      // D. Evaluar si completó su plan o no tiene plan
      const quedanSesiones = (resumen?.sesiones_restantes || 1) - 1;
      if (!resumen?.plan_id || quedanSesiones <= 0) {
        // Abrir modal unificado de Atención-Venta-Cobro
        if (cita.pacientes) {
          setModalPostAtencion({
            isOpen: true,
            paciente: cita.pacientes,
            motivo: quedanSesiones <= 0 ? 'plan_completado' : 'sin_plan'
          });
        }
      }
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

  const handleCreateCita = async () => {
    if (!supabase) return;
    if (!newCita.pacienteId || !newCita.fecha || !newCita.hora) { toast.error('Completa los campos obligatorios'); return; }
    
    setSavingCita(true);
    try {
      // 1. Verificación previa al agendar
      const { data: citaOcupada } = await supabase
        .from('citas_atenciones')
        .select('id, hora, pacientes(nombre_completo)')
        .eq('fecha', newCita.fecha)
        .eq('hora', newCita.hora)
        .neq('estado', 'cancelada')
        .maybeSingle();

      if (citaOcupada) {
        const nombre = Array.isArray(citaOcupada.pacientes) ? citaOcupada.pacientes[0]?.nombre_completo : (citaOcupada.pacientes as any)?.nombre_completo;
        toast.error(`⚠️ El horario de las ${newCita.hora.slice(0, 5)} ya está reservado para ${nombre}. Elige otro bloque.`);
        return;
      }
      const payload = {
         paciente_id: newCita.pacienteId,
         fecha: newCita.fecha, 
         hora: newCita.hora,
         profesional: newCita.profesional,
         motivo_consulta: newCita.motivo || 'Sesión de Tratamiento Kinésico',
         estado: 'pendiente'
      };

      const { data, error } = await supabase
         .from('citas_atenciones')
         .insert([payload])
         .select('id, pacientes(nombre_completo)')
         .single();

      if (error) {
         console.error('Error Supabase al agendar:', error);
         toast.error(`No se pudo agendar: ${error.message}`);
         return;
      }

      // Sincronizar hacia Google Calendar
      try {
        const paciente = pacientesOptions.find(p => p.id === newCita.pacienteId);
        const nombrePaciente = paciente?.nombre_completo || 
           (Array.isArray(data.pacientes) ? data.pacientes[0]?.nombre_completo : (data.pacientes as any)?.nombre_completo);

        const { syncEventToGoogleCalendar } = await import('@/actions/calendar');
        const syncRes = await syncEventToGoogleCalendar({
          action: 'create_event',
          cita_id: data.id,
          fecha: newCita.fecha,
          hora: newCita.hora,
          paciente_nombre: nombrePaciente || 'Paciente Kiromov',
          motivo_consulta: newCita.motivo
        });
        
        if (syncRes?.success && syncRes?.google_event_id) {
           await supabase.from('citas_atenciones').update({ google_event_id: syncRes.google_event_id }).eq('id', data.id);
        }
      } catch (syncErr) {
         console.error('Error al sincronizar con Google Calendar:', syncErr);
      }

      toast.success('¡Cita agendada exitosamente!');
      setShowNewCitaModal(false);
      loadAgenda();
    } catch (err) {
      console.error('Excepción al agendar:', err);
      toast.error((err as Error).message || 'Error inesperado al agendar cita');
    } finally {
      setSavingCita(false); // Garantiza que el formulario nunca quede congelado
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
          await syncEventToGoogleCalendar({
            action: 'update_event',
            cita_id: editingCita.id,
            google_event_id: editingCita.google_event_id,
            fecha: editForm.fecha,
            hora: editForm.hora,
            motivo_consulta: editForm.motivo
          });
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

  const formatearNombre = (nombreCompleto?: string) => {
    if (!nombreCompleto) return 'Estimado/a';
    const primerNombre = nombreCompleto.trim().split(' ')[0];
    return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
  };

  const generarMensajeConfirmacion = (cita: CitaExtendida) => {
    const nombre = formatearNombre(cita.pacientes?.nombre_completo);
    const fechaCL = formatearFechaChilena(cita.fecha);
    const hora = cita.hora?.slice(0, 5) || '16:00';
    const telefonoLimpio = cita.pacientes?.telefono ? cita.pacientes.telefono.replace(/\D/g, '').slice(-9) : '';

    const texto = `Hola ${nombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${fechaCL} a las ${hora} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;

    return `https://wa.me/56${telefonoLimpio}?text=${encodeURIComponent(texto)}`;
  };
  const pacientesOptions = useMemo(() => {
    if (!pacienteSearch.trim()) return pacientes.slice(0, 50);
    const q = pacienteSearch.toLowerCase();
    return pacientes.filter(p => p.nombre_completo?.toLowerCase().includes(q) || p.rut?.toLowerCase().includes(q)).slice(0, 50);
  }, [pacientes, pacienteSearch]);

  const getEstiloSemaforoSemanal = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada':
        return 'border-l-4 border-deep-cobalt bg-cloud text-ink-navy hover:bg-pebble';
      case 'pendiente':
        return 'border-l-4 border-slate-gray bg-cloud text-ink-navy hover:bg-pebble';
      case 'asistio':
      case 'asistió':
      case 'atendido':
      case 'en_sala':
        return 'border-l-4 border-signal-blue bg-cloud text-ink-navy hover:bg-pebble opacity-90';
      case 'cancelada':
      case 'no_asistio':
        return 'border-l-4 border-mist-gray bg-pebble text-slate-gray opacity-75 line-through';
      default:
        return 'border-l-4 border-hairline bg-paper text-ink-navy';
    }
  };

  const getCardSemaforoStyles = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada':
        return {
          card: 'bg-paper border-hairline hover:border-deep-cobalt shadow-calendly',
          hora: 'bg-cloud text-deep-cobalt border border-hairline'
        };
      case 'pendiente':
        return {
          card: 'bg-paper border-hairline hover:border-slate-gray shadow-calendly',
          hora: 'bg-cloud text-slate-gray border border-hairline'
        };
      case 'asistio':
      case 'asistió':
      case 'atendido':
      case 'en_sala':
        return {
          card: 'bg-paper border-hairline hover:border-signal-blue shadow-calendly opacity-95',
          hora: 'bg-cloud text-signal-blue border border-hairline'
        };
      case 'cancelada':
      case 'no_asistio':
        return {
          card: 'bg-pebble border-hairline opacity-75 grayscale hover:grayscale-0',
          hora: 'bg-mist-gray text-paper border border-hairline line-through'
        };
      default:
        return { card: 'bg-paper border-hairline', hora: 'bg-cloud text-ink-navy' };
    }
  };

  const renderCardCita = (cita: CitaExtendida, compact = false) => {
    const p = cita.pacientes;
    if (!p) return null;
    
    const s = cita.estado?.toLowerCase() || 'pendiente';
    let stateColors = 'bg-slate-50/50 text-slate-600 border-slate-200/80';
    let stateLabel = 'Pendiente';
    if (s === 'en_sala') { stateColors = 'bg-amber-50 text-amber-700 border-amber-200'; stateLabel = 'En Sala'; }
    else if (['asistio', 'asistió', 'atendido'].includes(s)) { stateColors = 'bg-emerald-50 text-emerald-700 border-emerald-200'; stateLabel = 'Asistió'; }
    else if (s === 'confirmada') { stateColors = 'bg-indigo-50 text-indigo-700 border-indigo-200'; stateLabel = 'Confirmada'; }
    else if (s === 'cancelada') { stateColors = 'bg-red-50 text-red-700 border-red-200 line-through'; stateLabel = 'Cancelada'; }
    const cleanPhone = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';

    if (compact) {
        const semaforoClass = getEstiloSemaforoSemanal(s);
        const { tienePlan: tienePlanCompact, sesionesUsadas, sesionesTotales } = getResumenPlan(p);
        
        let badgePrevision = '';
        if (p.prevision) {
          if (p.prevision.toLowerCase().includes('convenio')) badgePrevision = '[Conv]';
          else if (p.prevision.toLowerCase().includes('isapre')) badgePrevision = '[Isapre]';
          else if (p.prevision.toLowerCase().includes('fonasa')) badgePrevision = '[Fonasa]';
          else badgePrevision = '[Part]';
        }

        return (
            <div key={cita.id} className={`rounded-xl border p-3 space-y-2 transition-all hover:shadow-sm mb-2 ${semaforoClass}`}>
                {/* Nivel 1: Hora y Selector de Estado */}
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-bold text-xs font-mono text-slate-900">{cita.hora?.slice(0, 5)}</span>
                    <select
                      value={['asistió', 'atendido'].includes(s) ? 'asistio' : s}
                      onChange={(e) => handleCambiarEstadoCita(cita, e.target.value)}
                      className="text-[10px] font-bold rounded-lg px-2 py-0.5 border bg-white/90 shadow-xs cursor-pointer focus:outline-none"
                    >
                      <option value="pendiente">⏳ Pendiente</option>
                      <option value="confirmada">✓ Confirmada</option>
                      <option value="asistio">✓ Asistió</option>
                      <option value="no_asistio">⚠️ No Asistió</option>
                      <option value="cancelada">✕ Cancelada</option>
                    </select>
                </div>

                {/* Nivel 2: Nombre Completo y Saldo de Sesiones */}
                <div>
                    <p className="font-bold text-slate-900 text-xs truncate" title={p.nombre_completo}>
                      {p.nombre_completo}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="font-semibold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {p.prevision || 'Particular'}
                      </span>
                      <span className="font-bold text-slate-700">
                        {tienePlanCompact ? `${sesionesUsadas}/${sesionesTotales} ses.` : 'Sin plan'}
                      </span>
                    </div>
                </div>

                {/* Nivel 3: Botones Rápidos */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40">
                    <a
                      href={cleanPhone ? generarMensajeConfirmacion(cita) : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-slate-600 hover:text-emerald-700 font-medium"
                      title="WhatsApp"
                    >
                      💬 WhatsApp
                    </a>
                    <button
                      onClick={() => { setSelectedPatientForDrawer(p); setSelectedCitaForSuite(cita); setIsDrawerOpen(true); }}
                      className="text-[11px] text-blue-700 font-semibold hover:underline"
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
    const styles = getCardSemaforoStyles(s);

    return (
      <div key={cita.id} className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md mb-3 ${styles.card}`}>
        {/* Cabecera y acciones de gestión */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg sm:text-xl px-3 py-1.5 rounded-xl font-mono shadow-sm ${styles.hora}`}>
              {cita.hora?.slice(0, 5)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">{cita.pacientes?.nombre_completo || p.nombre_completo}</h4>
                {p.prevision && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    p.prevision.toLowerCase().includes('convenio')
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : p.prevision.toLowerCase().includes('isapre')
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : p.prevision.toLowerCase().includes('fonasa')
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {p.prevision}
                  </span>
                )}
                <select
                  value={['asistió', 'atendido'].includes(s) ? 'asistio' : s}
                  onChange={(e) => handleCambiarEstadoCita(cita, e.target.value)}
                  className={`text-[11px] font-bold rounded-xl px-2 py-0.5 border shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ml-1 ${
                    s === 'confirmada'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : s === 'pendiente'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : ['asistio', 'asistió', 'atendido'].includes(s)
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : s === 'no_asistio'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="confirmada">✓ Confirmada</option>
                  <option value="asistio">✓ Asistió</option>
                  <option value="no_asistio">⚠️ No Asistió</option>
                  <option value="cancelada">✕ Cancelada</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {formatRut(p.rut) || 'Sin RUT'} • <span className="font-sans italic">{cita.motivo_consulta || 'Sesión Kinésica'}</span>
              </p>
              {(p.alertas_seguridad || p.antecedentes_morbidos) && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-xl text-xs flex flex-wrap items-center gap-1.5 mt-2 max-w-full">
                  <span className="font-bold whitespace-nowrap">🚩 Alerta Seguridad TMO:</span>
                  <span className="truncate">{p.alertas_seguridad || p.antecedentes_morbidos}</span>
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

        {/* Grid 3 Columnas (Contexto de Box) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/85 p-3.5 rounded-xl border border-slate-200/60 shadow-xs text-xs backdrop-blur-xs">
          
          {/* Col 1: Tratamiento & Saldo */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>🩺 Tratamiento</span>
            </div>
            {tienePlan ? (
              <div>
                <p className="text-xs font-semibold text-slate-800 truncate mb-1" title={p.nombre_plan || 'Plan'}>{p.nombre_plan || 'Plan Kinésico'}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 mb-1">
                  <span>Sesión {p.sesiones_usadas} de {p.sesiones_totales}</span>
                  <span className="text-slate-400">• {p.sesiones_restantes} rest.</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                </div>
                {p.sesiones_restantes === 1 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md animate-pulse">
                      🎯 Hoy es su última sesión del plan
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mt-2">Sin plan activo</p>
            )}
          </div>

          {/* Col 2: Estado Financiero */}
          <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              💰 Financiamiento
            </span>

            {/* CASO 3: Si el plan está pagado */}
            {p?.plan_id && p?.estado_pago === 'pagado' && p?.estado_plan !== 'finalizado' && (
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Plan Pagado (Al día)
                </span>
                {p.numero_boleta && <p className="text-[11px] text-slate-500 mt-1">Boleta: {p.numero_boleta}</p>}
              </div>
            )}

            {/* CASO 2: Si tiene cobro pendiente y el plan NO está finalizado */}
            {p?.plan_id && p?.estado_pago === 'pendiente' && p?.estado_plan !== 'finalizado' && (
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  🔴 Debe ({montoPendiente})
                </span>
                <button
                  onClick={() => { setSettlingPlan({ id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp, paciente_id: p.id }); }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-sm transition-colors"
                >
                  💳 Registrar Cobro
                </button>
              </div>
            )}

            {/* CASO 4: Si completó su plan */}
            {p?.estado_plan === 'finalizado' && (
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  ⚠️ Sesión Finalizada
                </span>
                
                {p.estado_pago === 'pendiente' ? (
                  <button
                    onClick={() => { setSettlingPlan({ id: p.plan_id, nombre_plan: p.nombre_plan, monto_clp: p.monto_clp, paciente_id: p.id }); }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-sm transition-colors"
                  >
                    💳 Cobrar ({montoPendiente})
                  </button>
                ) : (
                  <button
                    onClick={() => { setAssignTreatmentModal({ isOpen: true, paciente: p }); }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-blue-600 text-blue-700 hover:bg-blue-50 text-[11px] font-bold shadow-sm transition-colors"
                  >
                    + Asignar Nuevo Plan
                  </button>
                )}
              </div>
            )}

            {/* CASO 1: Si no tiene plan */}
            {(!p?.plan_id || p?.estado_plan === 'sin_plan') && (
              <div>
                <button
                  onClick={() => { setAssignTreatmentModal({ isOpen: true, paciente: p }); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-blue-600 text-blue-700 hover:bg-blue-50 text-[11px] font-bold shadow-sm transition-colors"
                >
                  + Asignar Tratamiento / Plan
                </button>
              </div>
            )}
          </div>

          {/* Col 3: Semáforo Clínico TMO */}
          <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              📊 Estado Clínico
            </span>
            {p?.ultimo_dolor_ena !== undefined && p?.ultimo_dolor_ena !== null && p.ultimo_dolor_ena >= 0 ? (
              <div className="space-y-1">
                <p className="text-slate-700 text-xs">
                  Último dolor: <span className="font-bold text-slate-900 font-mono">ENA {p.ultimo_dolor_ena}/10</span>
                </p>
                {requiereReevaluacion(p) && (
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ⚠️ Reevaluación TMO
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic">
                Primera Atención / Evaluación
              </p>
            )}
          </div>
        </div>

        {/* Botonera Operativa Inferior */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {cleanPhone && (
              <a href={generarMensajeConfirmacion(cita)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-buttons border border-hairline bg-paper hover:bg-pebble text-slate-gray text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-calendly-btn transition-colors cursor-pointer">
                💬 Solicitar Confirmación
              </a>
            )}
            {s === 'pendiente' && (
              <button onClick={() => handleMarcarConfirmada(cita.id)} className="px-3 py-1.5 rounded-buttons bg-signal-blue hover:bg-deep-cobalt text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-calendly-btn">
                ✓ Confirmar
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!['asistio', 'asistió', 'atendido', 'no_asistio', 'cancelada'].includes(s) && (
              <>
                <button onClick={() => handleRegistrarAsistencia(cita)} className="px-3 py-1.5 rounded-buttons bg-signal-blue hover:bg-deep-cobalt text-white text-[12px] font-semibold flex items-center gap-1 shadow-calendly-btn transition-colors cursor-pointer">
                  ✓ Registrar Asistencia
                </button>
                <button onClick={() => handleRegistrarInasistencia(cita.id, p.id)} className="px-3 py-1.5 rounded-buttons border border-hairline bg-pebble hover:bg-mist-gray/30 text-slate-gray text-[12px] font-semibold transition-colors cursor-pointer">
                  🚫 No Asistió
                </button>
              </>
            )}
            <button onClick={() => { setSelectedPatientForDrawer(p); setSelectedCitaForSuite(cita); setIsDrawerOpen(true); }} className="px-3 py-1.5 rounded-buttons bg-ink-navy hover:bg-slate-gray text-white text-[12px] font-semibold flex items-center gap-1 shadow-calendly-btn transition-colors cursor-pointer">
              Ficha & SOAP →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDia = () => {
    return (
      <div className="p-6 space-y-0 min-h-[400px]">
        {citas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-gray">
            <CalendarDays className="w-12 h-12 mb-3 text-hairline" />
            <p className="text-[16px] font-semibold text-slate-gray">No hay citas para este día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {citas.map(c => renderCardCita(c, false))}
          </div>
        )}
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
        <div className="overflow-x-auto min-h-[400px] bg-cloud">
            <div className="flex divide-x divide-hairline border-b border-hairline min-w-[900px]">
                {dias.map((dia, idx) => {
                    const isToday = getFormattedLocalDate(dia) === getFormattedLocalDate(new Date());
                    const diaStr = getFormattedLocalDate(dia);
                    const citasDia = citas.filter(c => c.fecha === diaStr);
                    return (
                        <div key={idx} className={`flex-1 min-w-[220px] ${isToday ? 'bg-signal-blue/5' : ''}`}>
                            <div className={`p-4 text-center border-b border-hairline sticky top-0 shadow-sm z-10 ${isToday ? 'text-signal-blue bg-paper border-t-2 border-t-signal-blue' : 'text-slate-gray bg-paper'}`}>
                                <p className="text-[12px] font-bold uppercase tracking-widest">{dia.toLocaleDateString('es-CL', { weekday: 'short' })}</p>
                                <p className={`text-[24px] font-black inline-flex items-center justify-center w-10 h-10 rounded-full mt-1 ${isToday ? 'bg-signal-blue text-white' : ''}`}>{dia.getDate()}</p>
                            </div>
                            <div className="p-4">
                                {citasDia.length === 0 ? (
                                    <button 
                                      onClick={() => {
                                        setNewCita(prev => ({ ...prev, fecha: diaStr }));
                                        setShowNewCitaModal(true);
                                      }}
                                      className="w-full py-8 rounded-inputs border-2 border-dashed border-hairline text-mist-gray hover:text-signal-blue hover:border-signal-blue hover:bg-signal-blue/5 text-[14px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      + Agendar
                                    </button>
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
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Si es domingo, índice 6
    
    const daysArray: (Date|null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) daysArray.push(new Date(year, month, i));
    while (daysArray.length % 7 !== 0) daysArray.push(null);

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="p-6 bg-paper min-h-[500px]">
            <div className="grid grid-cols-7 border-t border-l border-hairline rounded-cards overflow-hidden">
                {weekDays.map(wd => (
                    <div key={wd} className="p-3 border-b border-r border-hairline text-center bg-cloud text-[12px] font-bold uppercase text-slate-gray tracking-wider">
                        {wd}
                    </div>
                ))}
                {daysArray.map((dia, idx) => {
                    if (!dia) return <div key={idx} className="border-b border-r border-hairline bg-cloud/50 h-[120px]"></div>;
                    
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
                            className={`p-2 border-b border-r border-hairline h-[130px] overflow-hidden relative cursor-pointer hover:bg-pebble transition-colors ${isToday ? 'bg-signal-blue/5' : 'bg-paper'}`}
                        >
                            <div className="text-right mb-2">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px] font-bold ${isToday ? 'bg-signal-blue text-white' : 'text-slate-gray'}`}>{dia.getDate()}</span>
                            </div>
                            <div className="space-y-1.5">
                                {citasToShow.map(c => {
                                    const s = c.estado?.toLowerCase() || 'pendiente';
                                    let bg = 'bg-pebble text-ink-navy border border-hairline';
                                    if (s === 'confirmada') bg = 'bg-cloud text-deep-cobalt border border-deep-cobalt/30 font-semibold';
                                    else if (s === 'pendiente') bg = 'bg-cloud text-slate-gray border border-slate-gray/30 font-semibold';
                                    else if (['cancelada', 'no_asistio'].includes(s)) bg = 'bg-pebble text-mist-gray line-through opacity-75 border-transparent';
                                    
                                    const primerNombre = c.pacientes?.nombre_completo?.split(' ')[0] || '';
                                    const { tienePlan, sesionesUsadas, sesionesTotales } = getResumenPlan(c.pacientes || {});
                                    const planStr = tienePlan ? `${c.pacientes?.nombre_plan} (${sesionesUsadas}/${sesionesTotales} ses)` : 'Sin plan';

                                    return (
                                        <div key={c.id} className={`px-2 py-1 rounded-inputs text-[10px] truncate relative group ${bg}`}>
                                            {c.hora?.slice(0,5)} • {primerNombre}
                                            
                                            {/* Hover Tooltip */}
                                            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-48 bg-ink-navy text-paper p-3 rounded-lg shadow-calendly-lg z-[60] text-[12px] whitespace-normal pointer-events-none">
                                                <p className="font-bold text-[14px]">{c.pacientes?.nombre_completo}</p>
                                                <p className="text-mist-gray text-[11px] mt-1">{c.pacientes?.prevision || 'Particular'} • {c.pacientes?.telefono}</p>
                                                <p className="text-signal-blue text-[11px] mt-1.5 font-semibold">{planStr}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {hasMore && (
                                    <div className="text-[11px] text-center font-bold text-mist-gray mt-2 hover:text-slate-gray transition-colors">+{citasDia.length - 3} citas más</div>
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8 print:hidden">
        
        {/* Barra de Navegación de Fecha */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper p-6 rounded-cards border border-hairline shadow-calendly">
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2 border border-hairline rounded-buttons hover:bg-pebble text-slate-gray transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={setToday} className="px-4 py-2 border border-hairline rounded-buttons hover:bg-pebble font-semibold text-slate-gray text-sm transition-colors">
              Hoy
            </button>
            <button onClick={() => changeDate(1)} className="p-2 border border-hairline rounded-buttons hover:bg-pebble text-slate-gray transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center md:text-left flex-1 md:pl-4">
            <h2 className="text-[28px] leading-tight font-bold text-ink-navy">{formattedTitleDate}</h2>
          </div>
          
          <div className="flex items-center gap-2 border border-hairline p-1 rounded-inputs bg-pebble">
            <button onClick={() => setVista('dia')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${vista === 'dia' ? 'bg-paper shadow-calendly text-ink-navy border border-hairline' : 'text-slate-gray hover:text-ink-navy'}`}>Día</button>
            <button onClick={() => setVista('semana')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${vista === 'semana' ? 'bg-paper shadow-calendly text-ink-navy border border-hairline' : 'text-slate-gray hover:text-ink-navy'}`}>Semana</button>
            <button onClick={() => setVista('mes')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${vista === 'mes' ? 'bg-paper shadow-calendly text-ink-navy border border-hairline' : 'text-slate-gray hover:text-ink-navy'}`}>Mes</button>
          </div>
        </div>

        {/* KPIs del Rango */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg"><span className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Citados</span><span className="text-[38px] font-bold text-ink-navy leading-tight">{kpis.citadosHoy}</span></div>
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg"><span className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Pendientes</span><span className="text-[38px] font-bold text-ink-navy leading-tight">{kpis.pendientes}</span></div>
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg"><span className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Confirmadas</span><span className="text-[38px] font-bold text-ink-navy leading-tight">{kpis.confirmadas}</span></div>
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg"><span className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">En Box / Sala</span><span className="text-[38px] font-bold text-ink-navy leading-tight">{kpis.enSala}</span></div>
          <div className="bg-paper p-6 rounded-cards border border-hairline shadow-calendly flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-calendly-lg"><span className="text-[12px] font-semibold text-slate-gray uppercase tracking-wider">Atendidos</span><span className="text-[38px] font-bold text-ink-navy leading-tight">{kpis.asistio}</span></div>
        </div>

        {/* Contenedor Principal Agenda */}
        <div className="bg-paper rounded-cards shadow-calendly border border-hairline overflow-hidden">
          <div className="p-6 bg-cloud border-b border-hairline flex justify-between items-center">
            <h3 className="text-[24px] font-semibold text-ink-navy flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-slate-gray" /> Citas Programadas
            </h3>
            <Button onClick={() => setShowNewCitaModal(true)} className="bg-signal-blue hover:bg-deep-cobalt text-white rounded-buttons text-[16px] font-semibold px-4 py-2 shadow-calendly-btn">
              <Plus className="w-5 h-5 mr-1.5" /> Agendar Cita
            </Button>
          </div>

          {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-mist-gray min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-signal-blue" />
                <p className="text-[16px] font-medium text-slate-gray">Cargando agenda clínica...</p>
              </div>
          ) : (
              vista === 'dia' ? renderDia() : vista === 'semana' ? renderSemana() : renderMes()
          )}
        </div>
      
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
        <ClinicalBoxSuite 
          onClose={() => setIsDrawerOpen(false)} 
          pacienteId={selectedPatientForDrawer?.id || ''} 
          citaId={selectedCitaForSuite?.id || ''}
          onSuccess={() => loadAgenda()} 
        />
      )}
      {/* Modal Nueva Cita */}
      <Dialog open={showNewCitaModal} onOpenChange={setShowNewCitaModal}>
        <DialogHeader><DialogTitle>Agendar Nueva Cita</DialogTitle><DialogDescription>Selecciona un paciente y un horario para agendar.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Paciente</label>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por nombre o RUT..." value={pacienteSearch} onChange={e => setPacienteSearch(e.target.value)} className="pl-9 bg-slate-50/50" /></div>
            <select value={newCita.pacienteId} onChange={e => setNewCita({ ...newCita, pacienteId: e.target.value })} className="w-full mt-2 p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm" size={4}>
              {pacientesOptions.map(p => <option key={p.id} value={p.id}>{p.nombre_completo} - {formatRut(p.rut)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Fecha</label><Input type="date" value={newCita.fecha} onChange={e => setNewCita({...newCita, fecha: e.target.value})} className="bg-slate-50/50" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Hora</label><select value={newCita.hora} onChange={e => setNewCita({...newCita, hora: e.target.value})} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10">{timeBlocks.map(t => {
              const isOccupied = citas.some(c => c.fecha === newCita.fecha && c.hora?.startsWith(t) && c.estado !== 'cancelada');
              return <option key={t} value={t} disabled={isOccupied}>{t} {isOccupied ? '(Ocupado)' : ''}</option>;
            })}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Motivo de Consulta</label><Input value={newCita.motivo} onChange={e => setNewCita({...newCita, motivo: e.target.value})} className="bg-slate-50/50" /></div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => setShowNewCitaModal(false)}>Cancelar</Button><Button onClick={handleCreateCita} disabled={savingCita} className="bg-blue-600 hover:bg-blue-700 text-white">{savingCita ? 'Guardando...' : 'Agendar Cita'}</Button></DialogFooter>
      </Dialog>

      {/* Modal Editar Cita */}
      <Dialog open={!!editingCita} onOpenChange={(open) => !open && setEditingCita(null)}>
        <DialogHeader><DialogTitle>Editar Horario de Cita</DialogTitle><DialogDescription>Modifica la fecha, hora o profesional asignado.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Fecha</label><Input type="date" value={editForm.fecha} onChange={e => setEditForm({...editForm, fecha: e.target.value})} className="bg-slate-50/50" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Hora</label><select value={editForm.hora} onChange={e => setEditForm({...editForm, hora: e.target.value})} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10">{timeBlocks.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
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
