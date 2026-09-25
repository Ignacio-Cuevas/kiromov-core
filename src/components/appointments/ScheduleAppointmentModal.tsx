'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatRut, getChileanDate, getDiaSemanaChile } from '@/lib/utils';
import {
  scheduleAppointmentSchema,
  ScheduleAppointmentFormValues,
} from '@/types/schedule';
import { createScheduleAppointmentAction } from '@/actions/appointments';
import {
  Search,
  UserPlus,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
  User,
} from 'lucide-react';

export interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result?: { citaId?: string; pacienteId?: string }) => void;
  preselectedPatient?: {
    id: string;
    nombre_completo: string;
    rut?: string | null;
    telefono?: string | null;
    email?: string | null;
  } | null;
  initialDate?: string;
  initialTime?: string;
  initialMotivo?: string;
}

interface PacienteSearchResult {
  id: string;
  nombre_completo: string;
  rut: string | null;
  telefono: string | null;
  email: string | null;
}

const MOTIVOS_FRECUENTES = [
  { label: 'Evaluación Inicial TMO (60 min)', duracion: 60, defaultForNew: true },
  { label: 'Sesión de Tratamiento Kinésico / TMO (45 min)', duracion: 45, defaultForNew: false },
  { label: 'Reevaluación Funcional TMO (45 min)', duracion: 45, defaultForNew: false },
  { label: 'Descarga Muscular / Recovery (45 min)', duracion: 45, defaultForNew: false },
];

export function ScheduleAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatient,
  initialDate,
  initialTime,
  initialMotivo,
}: ScheduleAppointmentModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const isSubmittingRef = useRef(false);

  // Estados de interfaz y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PacienteSearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PacienteSearchResult | null>(
    preselectedPatient
      ? {
          id: preselectedPatient.id,
          nombre_completo: preselectedPatient.nombre_completo,
          rut: preselectedPatient.rut || null,
          telefono: preselectedPatient.telefono || null,
          email: preselectedPatient.email || null,
        }
      : null
  );

  const [citasOcupadas, setCitasOcupadas] = useState<any[]>([]);
  const [configAgenda, setConfigAgenda] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modoHoraManual, setModoHoraManual] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const defaultFecha = initialDate || getChileanDate();
  const defaultHora = (initialTime || '09:00').slice(0, 5);

  // Formulario con React Hook Form + Zod
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScheduleAppointmentFormValues>({
    resolver: zodResolver(scheduleAppointmentSchema),
    defaultValues: {
      isNewPatient: false,
      pacienteId: preselectedPatient?.id || '',
      nombre_completo: '',
      sin_rut: false,
      rut: '',
      telefono: '+56 9 ',
      email: '',
      fecha: defaultFecha,
      hora: defaultHora,
      duracionMin: 45,
      motivo_consulta: initialMotivo || 'Sesión de Tratamiento Kinésico / TMO (45 min)',
      box: 'Bulnes 470, Of. 75',
      profesional: 'Klgo. Ignacio Cuevas Silva',
    },
  });

  const isNewPatient = watch('isNewPatient');
  const sinRut = watch('sin_rut');
  const watchFecha = watch('fecha');
  const watchHora = watch('hora');
  const watchMotivo = watch('motivo_consulta');

  // Debounce para el buscador predictivo (300 ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Consulta asíncrona de pacientes según debouncedSearch
  useEffect(() => {
    if (!isOpen || isNewPatient || selectedPatient) return;
    if (!debouncedSearch) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const buscarPacientes = async () => {
      if (!supabase) return;
      setIsSearching(true);
      try {
        const cleanRutSearch = debouncedSearch.replace(/[^0-9kK]/g, '');
        const { data, error } = await supabase
          .from('pacientes')
          .select('id, nombre_completo, rut, telefono, email')
          .or(
            `nombre_completo.ilike.%${debouncedSearch}%,telefono.ilike.%${debouncedSearch}%${
              cleanRutSearch.length >= 2 ? `,rut.ilike.%${cleanRutSearch}%` : ''
            }`
          )
          .order('nombre_completo', { ascending: true })
          .limit(8);

        if (!error && data) {
          setSearchResults(data);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.warn('Error buscando pacientes:', err);
      } finally {
        setIsSearching(false);
      }
    };

    buscarPacientes();
  }, [debouncedSearch, isOpen, isNewPatient, selectedPatient, supabase]);

  // Cargar configuración de agenda y citas ocupadas
  useEffect(() => {
    if (!isOpen) return;

    const loadConfigAndBusy = async () => {
      // Configuración de Agenda
      let cfg: any = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from('configuracion_agenda')
            .select('*')
            .limit(1)
            .maybeSingle();
          if (data) cfg = data;
        } catch (e) {
          console.warn('Error leyendo configuracion_agenda:', e);
        }
      }
      if (!cfg) {
        try {
          const cached = localStorage.getItem('kiromov_configuracion_agenda');
          if (cached) cfg = JSON.parse(cached);
        } catch (e) {}
      }
      if (cfg) setConfigAgenda(cfg);

      // Citas ocupadas en la fecha actual
      if (watchFecha && supabase) {
        const { data: citas } = await supabase
          .from('citas_atenciones')
          .select('hora, id')
          .eq('fecha', watchFecha)
          .neq('estado', 'cancelada');
        if (citas) setCitasOcupadas(citas);
      }
    };

    loadConfigAndBusy();
  }, [isOpen, watchFecha, supabase]);

  // Sincronizar paciente preseleccionado inicial si cambia
  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatient({
        id: preselectedPatient.id,
        nombre_completo: preselectedPatient.nombre_completo,
        rut: preselectedPatient.rut || null,
        telefono: preselectedPatient.telefono || null,
        email: preselectedPatient.email || null,
      });
      setValue('isNewPatient', false);
      setValue('pacienteId', preselectedPatient.id);
    }
  }, [preselectedPatient, setValue]);

  // Detección de día de semana inmune a desfaces de zona horaria (UTC vs America/Santiago)
  const diaSemana = useMemo(() => {
    return getDiaSemanaChile(watchFecha);
  }, [watchFecha]);

  // Configuración de jornada del día según horarios oficiales de Kiromov Centro Clínico
  const horarioDia = useMemo(() => {
    const defaultKiromov: Record<number, { activo: boolean; hora_inicio: string; hora_fin: string }> = {
      1: { activo: true, hora_inicio: '15:00', hora_fin: '19:00' }, // Lunes
      2: { activo: false, hora_inicio: '15:00', hora_fin: '19:00' }, // Martes
      3: { activo: true, hora_inicio: '15:00', hora_fin: '19:00' }, // Miércoles
      4: { activo: true, hora_inicio: '10:00', hora_fin: '14:00' }, // Jueves
      5: { activo: true, hora_inicio: '15:00', hora_fin: '19:00' }, // Viernes
      6: { activo: true, hora_inicio: '10:00', hora_fin: '14:00' }, // Sábado
      0: { activo: false, hora_inicio: '10:00', hora_fin: '14:00' }, // Domingo
    };

    if (!configAgenda) {
      return defaultKiromov[diaSemana] || { activo: true, hora_inicio: '15:00', hora_fin: '19:00' };
    }

    if (
      configAgenda.horarios_por_dia &&
      (configAgenda.horarios_por_dia[diaSemana] || configAgenda.horarios_por_dia[String(diaSemana)])
    ) {
      const h = configAgenda.horarios_por_dia[diaSemana] || configAgenda.horarios_por_dia[String(diaSemana)];
      return {
        activo: Boolean(h.activo),
        hora_inicio: h.hora_inicio || defaultKiromov[diaSemana]?.hora_inicio || '15:00',
        hora_fin: h.hora_fin || defaultKiromov[diaSemana]?.hora_fin || '19:00',
      };
    }

    const diasActivos = Array.isArray(configAgenda.dias_activos)
      ? configAgenda.dias_activos
      : [1, 3, 4, 5, 6];

    return {
      activo: diasActivos.includes(diaSemana),
      hora_inicio: configAgenda.hora_apertura || defaultKiromov[diaSemana]?.hora_inicio || '15:00',
      hora_fin: configAgenda.hora_cierre || defaultKiromov[diaSemana]?.hora_fin || '19:00',
    };
  }, [configAgenda, diaSemana]);

  // Generación continua de bloques horarios clínicos (08:00 a 21:00 hrs en intervalos de 15 min)
  const todosLosBloques = useMemo(() => {
    const blocks: string[] = [];
    const startMin = 8 * 60;  // 08:00 hrs
    const endMin = 21 * 60;   // 21:00 hrs
    const stepMin = 15;       // Intervalos de 15 minutos

    for (let m = startMin; m <= endMin; m += stepMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      blocks.push(`${hh}:${mm}`);
    }

    // Si la hora actual tiene minutos especiales, incluirla para no perderla
    if (watchHora) {
      const cleanH = watchHora.slice(0, 5);
      if (/^\d{2}:\d{2}$/.test(cleanH) && !blocks.includes(cleanH)) {
        blocks.push(cleanH);
        blocks.sort();
      }
    }

    return blocks;
  }, [watchHora]);

  // Detección puramente informativa de fuera de horario habitual
  const esFueraDeHorario = useMemo(() => {
    if (!horarioDia.activo) return true;
    if (!watchHora) return false;
    const horaClean = watchHora.slice(0, 5);
    return horaClean < horarioDia.hora_inicio || horaClean >= horarioDia.hora_fin;
  }, [horarioDia, watchHora]);

  // Si no hay hora seleccionada, sugerir el inicio de jornada habitual
  useEffect(() => {
    if (!watchHora && horarioDia.activo) {
      setValue('hora', horarioDia.hora_inicio);
    }
  }, [horarioDia, watchHora, setValue]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seleccionar paciente del combobox
  const handleSelectPatient = (paciente: PacienteSearchResult) => {
    setSelectedPatient(paciente);
    setValue('isNewPatient', false);
    setValue('pacienteId', paciente.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Activar modo "Quick Create" (Alta rápida)
  const handleStartQuickCreate = (nombreInicial?: string) => {
    setSelectedPatient(null);
    setValue('isNewPatient', true);
    setValue('pacienteId', '');
    setValue('nombre_completo', nombreInicial || searchTerm.trim());
    setValue('sin_rut', false);
    setValue('rut', '');
    setValue('telefono', '+56 9 ');
    setValue('email', '');
    setValue('duracionMin', 60);
    setValue('motivo_consulta', 'Evaluación Inicial TMO (60 min)');
    setIsDropdownOpen(false);
  };

  // Volver al modo de búsqueda
  const handleBackToSearch = () => {
    setValue('isNewPatient', false);
    setSelectedPatient(null);
    setValue('pacienteId', '');
    setValue('duracionMin', 45);
    setValue('motivo_consulta', 'Sesión de Tratamiento Kinésico / TMO (45 min)');
    setSearchTerm('');
  };

  // Formatear RUT al escribir
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setValue('rut', formatted, { shouldValidate: true });
  };

  // Envío del formulario unificado (Estrictamente manual bajo clic explícito)
  const onSubmit = async (values: ScheduleAppointmentFormValues) => {
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await createScheduleAppointmentAction(values);

      if (!res.success) {
        toast.error(res.error || 'No se pudo agendar la cita.');
        return;
      }

      toast.success(
        values.isNewPatient
          ? '¡Paciente registrado y cita agendada exitosamente!'
          : '¡Cita agendada exitosamente!'
      );

      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      console.error('Error al agendar:', err);
      toast.error(err?.message || 'Error inesperado al agendar cita.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <DialogTitle>Agendar Cita en Box</DialogTitle>
            <DialogDescription>
              Reserva de hora con selector predictivo y alta rápida de paciente.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        <DialogBody className="space-y-4 px-6 py-5 overflow-y-auto max-h-[75vh]">
          {/* ==================================================================== */}
          {/* SECCIÓN 1: IDENTIFICACIÓN DEL PACIENTE (COMBOBOX O QUICK CREATE)      */}
          {/* ==================================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Paciente</span>
              </label>

              {!isNewPatient && !selectedPatient && (
                <button
                  type="button"
                  onClick={() => handleStartQuickCreate()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Nuevo Paciente</span>
                </button>
              )}
            </div>

            {/* CASO A: PACIENTE YA SELECCIONADO (VINCULADO) */}
            {selectedPatient && !isNewPatient && (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {selectedPatient.nombre_completo.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedPatient.nombre_completo}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedPatient.rut ? formatRut(selectedPatient.rut) : 'Sin RUT'}{' '}
                      {selectedPatient.telefono ? `• ${selectedPatient.telefono}` : ''}
                    </p>
                  </div>
                </div>

                {!preselectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setValue('pacienteId', '');
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            )}

            {/* CASO B: BUSCADOR PREDICTIVO HÍBRIDO (COMBOBOX) */}
            {!selectedPatient && !isNewPatient && (
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nombre, RUT (ej: 18.234.567-8) o WhatsApp..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0 || searchTerm.trim()) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    className="pl-9 pr-9 bg-slate-50/70 border-slate-200 rounded-xl text-sm"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-600" />
                  )}
                </div>

                {/* Dropdown flotante de resultados predictivos */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="py-1 divide-y divide-slate-100">
                        {searchResults.map((paciente) => (
                          <div
                            key={paciente.id}
                            onClick={() => handleSelectPatient(paciente)}
                            className="px-3.5 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                                {paciente.nombre_completo.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {paciente.nombre_completo}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {paciente.rut ? formatRut(paciente.rut) : 'Sin RUT'}{' '}
                                  {paciente.telefono ? `• ${paciente.telefono}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-blue-600 font-semibold">Seleccionar →</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      debouncedSearch &&
                      !isSearching && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No se encontraron pacientes para &quot;{debouncedSearch}&quot;
                        </div>
                      )
                    )}

                    {/* Botón rápido para crear nuevo paciente desde el buscador */}
                    {debouncedSearch && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => handleStartQuickCreate(debouncedSearch)}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">
                            + Crear nuevo paciente: &quot;<strong className="text-blue-900">{debouncedSearch}</strong>&quot;
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {errors.pacienteId && !isNewPatient && (
                  <p className="text-xs font-semibold text-rose-600 mt-1">
                    {errors.pacienteId.message}
                  </p>
                )}
              </div>
            )}

            {/* CASO C: FORMULARIO MÍNIMO DE PACIENTE NUEVO ("JUST-IN-TIME") */}
            {isNewPatient && (
              <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-blue-900">
                      Alta Rápida de Paciente Nuevo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToSearch}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Volver a buscar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nombre Completo */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      {...register('nombre_completo')}
                      placeholder="Ej: Carolina Morales Silva"
                      className="bg-white text-xs h-9"
                    />
                    {errors.nombre_completo && (
                      <p className="text-[10px] font-semibold text-rose-600">
                        {errors.nombre_completo.message}
                      </p>
                    )}
                  </div>

                  {/* RUT con Formateo y Toggle Sin RUT */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        RUT {!sinRut && <span className="text-rose-500">*</span>}
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('sin_rut')}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Sin RUT / Extranjero</span>
                      </label>
                    </div>
                    <Input
                      disabled={sinRut}
                      placeholder={sinRut ? 'No aplica' : '18.234.567-8'}
                      value={watch('rut') || ''}
                      onChange={handleRutChange}
                      className="bg-white text-xs h-9 font-mono"
                    />
                    {errors.rut && (
                      <p className="text-[10px] font-semibold text-rose-600">
                        {errors.rut.message}
                      </p>
                    )}
                  </div>

                  {/* Teléfono WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Teléfono / WhatsApp <span className="text-rose-500">*</span></span>
                    </label>
                    <Input
                      {...register('telefono')}
                      placeholder="+56 9 1234 5678"
                      className="bg-white text-xs h-9 font-mono"
                    />
                    {errors.telefono && (
                      <p className="text-[10px] font-semibold text-rose-600">
                        {errors.telefono.message}
                      </p>
                    )}
                  </div>

                  {/* Email Opcional */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>Correo Electrónico (Opcional)</span>
                    </label>
                    <Input
                      type="email"
                      {...register('email')}
                      placeholder="ejemplo@paciente.cl"
                      className="bg-white text-xs h-9"
                    />
                    {errors.email && (
                      <p className="text-[10px] font-semibold text-rose-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* SECCIÓN 2: DETALLES DE LA CITA Y HORARIOS                            */}
          {/* ==================================================================== */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Horario y Ubicación de Atención</span>
            </label>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Fecha de Atención</label>
                <Input
                  type="date"
                  {...register('fecha')}
                  className="bg-slate-50/70 border-slate-200 text-xs h-10 font-medium"
                />
                {errors.fecha && (
                  <p className="text-[10px] font-semibold text-rose-600">
                    {errors.fecha.message}
                  </p>
                )}
              </div>

              {/* Hora con control total y selector 08:00 a 21:00 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Hora de Inicio</label>
                  <div className="flex items-center gap-1.5">
                    {horarioDia.activo ? (
                      <span className="text-[10px] text-slate-500 font-mono font-medium">
                        Habitual: {horarioDia.hora_inicio} - {horarioDia.hora_fin}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                        Fuera de horario habitual
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setModoHoraManual(!modoHoraManual)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-semibold ml-1 cursor-pointer"
                      title="Alternar entre lista desplegable e ingreso manual de hora"
                    >
                      {modoHoraManual ? '• Lista' : '• Manual'}
                    </button>
                  </div>
                </div>

                {modoHoraManual ? (
                  <Input
                    type="time"
                    step="900"
                    {...register('hora')}
                    className="w-full bg-slate-50/70 border-slate-200 text-xs font-mono font-semibold h-10 text-slate-800"
                  />
                ) : (
                  <select
                    {...register('hora')}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono font-semibold h-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {todosLosBloques.map((t) => {
                      const isOccupied = citasOcupadas.some((c) => c.hora?.startsWith(t));
                      const isHabitual =
                        horarioDia.activo && t >= horarioDia.hora_inicio && t < horarioDia.hora_fin;
                      return (
                        <option key={t} value={t} disabled={isOccupied}>
                          {t} {isOccupied ? '(Ocupado)' : !isHabitual ? '• (Fuera de jornada)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}

                {errors.hora && (
                  <p className="text-[10px] font-semibold text-rose-600">
                    {errors.hora.message}
                  </p>
                )}
              </div>
            </div>

            {/* Aviso informativo de horario (Permite agendar sin ninguna restricción) */}
            {esFueraDeHorario && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">
                      {!horarioDia.activo
                        ? 'Día fuera de configuración habitual de box'
                        : `Horario fuera de jornada habitual (${horarioDia.hora_inicio} - ${horarioDia.hora_fin})`}
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Puedes agendar de todas formas bajo tu criterio profesional.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200 shrink-0">
                  Control Total
                </span>
              </div>
            )}

            {/* Box y Profesional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span>Box de Atención</span>
                </label>
                <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-semibold text-slate-700">
                  Bulnes 470, Of. 75
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-emerald-600" />
                  <span>Kinesiólogo Responsable</span>
                </label>
                <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-semibold text-slate-700">
                  Klgo. Ignacio Cuevas Silva
                </div>
              </div>
            </div>

            {/* Motivo de Consulta y Chips Rápidos */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700">
                Motivo de Consulta y Tipo de Sesión
              </label>

              {/* Chips Rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS_FRECUENTES.map((motivo) => {
                  const isSelected = watchMotivo === motivo.label;
                  return (
                    <button
                      key={motivo.label}
                      type="button"
                      onClick={() => {
                        setValue('motivo_consulta', motivo.label);
                        setValue('duracionMin', motivo.duracion);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {motivo.label}
                    </button>
                  );
                })}
              </div>

              <Input
                {...register('motivo_consulta')}
                placeholder="Ej: Evaluación Inicial TMO / Cervicobraquialgia..."
                className="bg-white text-xs h-9"
              />
              {errors.motivo_consulta && (
                <p className="text-[10px] font-semibold text-rose-600">
                  {errors.motivo_consulta.message}
                </p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold h-9 px-4"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirmando Cita...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isNewPatient ? 'Guardar Paciente y Agendar Cita' : 'Confirmar y Agendar Cita'}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default ScheduleAppointmentModal;
