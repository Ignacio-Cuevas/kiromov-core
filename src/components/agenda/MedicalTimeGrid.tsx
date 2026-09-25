'use client';

import React, { useMemo } from 'react';
import { BloqueoAgenda } from '@/components/agenda/BlockTimeModal';
import {
  SemanaHorariosBox,
  isSlotInWorkingHours,
  DEFAULT_SEMANA_HORARIOS
} from '@/lib/availability';
import {
  Clock,
  Plus,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';

const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00 (cubre hasta 20:30)
const HOURS_COUNT = END_HOUR - START_HOUR; // 13 horas
const HOUR_HEIGHT = 80; // 80px por cada hora (40px cada 30 min)
const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT; // 1040px

interface MedicalTimeGridProps {
  dias: Date[]; // Días a mostrar (usualmente 7 días: Lunes a Domingo)
  citas: any[]; // Citas extendidas
  bloqueos: BloqueoAgenda[];
  semanaConfig?: SemanaHorariosBox;
  duracionPredeterminada?: number;
  onSelectEmptySlot: (fecha: string, hora: string) => void;
  onSelectCita: (cita: any) => void;
  onDesbloquear: (bloqueo: BloqueoAgenda) => void;
  onCambiarEstadoCita?: (cita: any, nuevoEstado: string) => void;
}

function getFormattedLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMinutesFrom8am(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.slice(0, 5).split(':').map(Number);
  const h = parts[0] || 8;
  const m = parts[1] || 0;
  return (h - START_HOUR) * 60 + m;
}

function getTopPosition(timeStr: string): number {
  const minutes = getMinutesFrom8am(timeStr);
  const clamped = Math.max(0, Math.min(minutes, HOURS_COUNT * 60));
  return (clamped / 60) * HOUR_HEIGHT;
}

function getDurationMinutes(cita: any, defaultDuration: number = 45): number {
  const motivo = (cita.motivo_consulta || '').toLowerCase();
  if (motivo.includes('60 min') || motivo.includes('evaluación inicial') || motivo.includes('evaluacion inicial')) {
    return 60;
  }
  if (motivo.includes('30 min')) return 30;
  if (motivo.includes('45 min')) return 45;
  return defaultDuration;
}

function getCitaTheme(cita: any) {
  const motivo = (cita.motivo_consulta || '').toLowerCase();
  const estado = (cita.estado || 'pendiente').toLowerCase();

  if (estado === 'cancelada') {
    return {
      card: 'bg-slate-100/90 border-slate-300 text-slate-400 opacity-60 line-through',
      borderLeft: 'border-l-slate-400',
      tag: 'bg-slate-200 text-slate-600',
      dot: 'bg-slate-400',
    };
  }

  if (motivo.includes('evaluación inicial') || motivo.includes('evaluacion inicial')) {
    return {
      card: 'bg-blue-50/95 border-blue-200 text-blue-950 hover:bg-blue-100/90 shadow-xs',
      borderLeft: 'border-l-blue-600',
      tag: 'bg-blue-100 text-blue-800 border-blue-200',
      dot: 'bg-blue-600',
    };
  }

  if (motivo.includes('reevaluación') || motivo.includes('reevaluacion')) {
    return {
      card: 'bg-purple-50/95 border-purple-200 text-purple-950 hover:bg-purple-100/90 shadow-xs',
      borderLeft: 'border-l-purple-600',
      tag: 'bg-purple-100 text-purple-800 border-purple-200',
      dot: 'bg-purple-600',
    };
  }

  // Tratamiento Estándar
  return {
    card: 'bg-emerald-50/95 border-emerald-200 text-emerald-950 hover:bg-emerald-100/90 shadow-xs',
    borderLeft: 'border-l-emerald-600',
    tag: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  };
}

export function MedicalTimeGrid({
  dias,
  citas,
  bloqueos,
  semanaConfig = DEFAULT_SEMANA_HORARIOS,
  duracionPredeterminada = 45,
  onSelectEmptySlot,
  onSelectCita,
  onDesbloquear,
  onCambiarEstadoCita
}: MedicalTimeGridProps) {
  // Generar regleta horaria vertical (intervalos de 30 minutos desde 08:00 a 20:30)
  const timeSlots = useMemo(() => {
    const slots: { label: string; hour: number; minute: number; isHour: boolean }[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push({
        label: `${String(h).padStart(2, '0')}:00`,
        hour: h,
        minute: 0,
        isHour: true,
      });
      slots.push({
        label: `${String(h).padStart(2, '0')}:30`,
        hour: h,
        minute: 30,
        isHour: false,
      });
    }
    return slots;
  }, []);

  const todayStr = getFormattedLocalDate(new Date());

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col select-none">
      {/* Scroll horizontal contenedor con min-width para garantizar 7 columnas legibles */}
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          {/* EJE X: CABECERA SUPERIOR DE DÍAS (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50/90 sticky top-0 z-30 backdrop-blur-sm">
            {/* Esquina superior izquierda (Regleta horaria) */}
            <div className="w-16 sm:w-20 shrink-0 p-3 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-100/70 text-[11px] font-bold text-slate-500">
              <Clock className="w-4 h-4 text-slate-400 mb-0.5" />
              <span>HORA</span>
            </div>

            {/* Columnas de los Días */}
            {dias.map((dia, idx) => {
              const diaStr = getFormattedLocalDate(dia);
              const isToday = diaStr === todayStr;
              const diaSemana = dia.getDay(); // 0 = Domingo, 1 = Lunes, etc.
              const confDia = semanaConfig[diaSemana] || DEFAULT_SEMANA_HORARIOS[diaSemana];
              const isDiaActivo = confDia?.activo ?? true;

              return (
                <div
                  key={idx}
                  className={`flex-1 p-3 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                    isToday ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {dia.toLocaleDateString('es-CL', { weekday: 'short' })}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span
                      className={`text-lg sm:text-xl font-black inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        isToday
                          ? 'bg-signal-blue text-white shadow-xs'
                          : 'text-ink-navy'
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                  </div>

                  {/* Indicador de disponibilidad diaria */}
                  <div className="mt-1">
                    {isDiaActivo ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                        {confDia.manana_inicio} - {confDia.tarde_fin > confDia.tarde_inicio ? confDia.tarde_fin : confDia.manana_fin}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        No laboral
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CUERPO DE LA GRILLA: EJE Y (Regleta) + COLUMNAS DE DÍAS */}
          <div className="flex relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
            {/* EJE Y (Vertical izquierdo): Marcadores de Horas */}
            <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-slate-50/50 relative">
              {timeSlots.map((slot, sIdx) => {
                const topPx = sIdx * (HOUR_HEIGHT / 2);
                return (
                  <div
                    key={sIdx}
                    className="absolute left-0 right-0 pr-2.5 text-right flex items-center justify-end"
                    style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT / 2}px` }}
                  >
                    {slot.isHour ? (
                      <span className="text-xs font-mono font-bold text-slate-700 -translate-y-2">
                        {slot.label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-medium text-slate-400 -translate-y-2">
                        {slot.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* COLUMNAS DE DÍAS */}
            {dias.map((dia, diaIdx) => {
              const diaStr = getFormattedLocalDate(dia);
              const diaSemana = dia.getDay();
              const confDia = semanaConfig[diaSemana] || DEFAULT_SEMANA_HORARIOS[diaSemana];
              const isDiaActivo = confDia?.activo ?? true;

              // Filtrar citas del día
              const citasDia = citas.filter((c) => c.fecha === diaStr);

              // Filtrar bloqueos del día
              const bloqueosDia = bloqueos.filter(
                (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
              );

              return (
                <div
                  key={diaIdx}
                  className="flex-1 border-r border-slate-200 last:border-r-0 relative overflow-hidden"
                  style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
                >
                  {/* CAPA 1: Celdas de Tiempo de Fondo (Click to Book) */}
                  {timeSlots.map((slot, slotIdx) => {
                    const topPx = slotIdx * (HOUR_HEIGHT / 2);
                    const slotTime = slot.label;
                    const inWorkingHours = isSlotInWorkingHours(diaSemana, slotTime, semanaConfig);

                    return (
                      <div
                        key={slotIdx}
                        onClick={() => onSelectEmptySlot(diaStr, slotTime)}
                        title={
                          inWorkingHours
                            ? `Hacer clic para agendar cita el ${diaStr} a las ${slotTime}`
                            : `Horario fuera de jornada habitual (${slotTime}). Clic para agendar manualmente.`
                        }
                        className={`absolute left-0 right-0 transition-colors cursor-pointer group flex items-center justify-end pr-2 ${
                          slot.isHour
                            ? 'border-b border-slate-200/90'
                            : 'border-b border-dashed border-slate-100'
                        } ${
                          inWorkingHours
                            ? 'bg-white hover:bg-blue-50/70'
                            : 'bg-slate-100/60 hover:bg-amber-50/50 [background-image:repeating-linear-gradient(45deg,#f8fafc,#f8fafc_8px,#f1f5f9_8px,#f1f5f9_16px)]'
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${HOUR_HEIGHT / 2}px`,
                        }}
                      >
                        {/* Botón flotante al pasar el mouse por celda vacía */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold text-signal-blue bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-blue-200 pointer-events-none flex items-center gap-1">
                          <Plus className="w-3 h-3" /> {slotTime}
                        </span>
                      </div>
                    );
                  })}

                  {/* CAPA 2: Bloqueos de Horario */}
                  {bloqueosDia.map((b) => {
                    const topPos = b.dia_completo ? 0 : getTopPosition(b.hora_inicio || '09:00');
                    const bottomPos = b.dia_completo
                      ? TOTAL_GRID_HEIGHT
                      : getTopPosition(b.hora_fin || '10:00');
                    const heightPos = Math.max(36, bottomPos - topPos);

                    return (
                      <div
                        key={b.id}
                        className="absolute left-1 right-1 z-10 rounded-xl border border-amber-300 bg-[repeating-linear-gradient(45deg,#fffdf7,#fffdf7_10px,#fef3c7_10px,#fef3c7_20px)] p-2 shadow-xs flex flex-col justify-between overflow-hidden"
                        style={{
                          top: `${topPos}px`,
                          height: `${heightPos}px`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1 truncate">
                            <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                            {b.titulo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDesbloquear(b);
                            }}
                            className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-white/80 hover:bg-white rounded px-1.5 py-0.5 shadow-2xs border border-rose-200 cursor-pointer"
                            title="Desbloquear horario"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-[10px] font-mono text-amber-800 truncate">
                          {b.dia_completo
                            ? 'Bloqueo día completo'
                            : `${(b.hora_inicio || '09:00').slice(0, 5)} - ${(b.hora_fin || '10:00').slice(0, 5)} hrs`}
                        </p>
                      </div>
                    );
                  })}

                  {/* CAPA 3: Citas Clínicas como Rectángulos de Tiempo */}
                  {citasDia.map((cita) => {
                    const horaInicio = cita.hora?.slice(0, 5) || '09:00';
                    const duracionMin = getDurationMinutes(cita, duracionPredeterminada);
                    const topPos = getTopPosition(horaInicio);
                    const heightPos = Math.max(38, (duracionMin / 60) * HOUR_HEIGHT - 3);

                    const theme = getCitaTheme(cita);
                    const pacienteNombre =
                      cita.pacientes?.nombre_completo ||
                      cita.motivo_consulta?.replace(/^Atención Kinésica - /i, '') ||
                      'Paciente sin registrar';

                    const estado = (cita.estado || 'pendiente').toLowerCase();
                    const cleanPhone = cita.pacientes?.telefono;

                    return (
                      <div
                        key={cita.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCita(cita);
                        }}
                        style={{
                          top: `${topPos}px`,
                          height: `${heightPos}px`,
                          left: '4px',
                          right: '4px',
                        }}
                        className={`absolute z-20 rounded-xl border-l-4 ${theme.borderLeft} border p-2 sm:p-2.5 transition-all duration-150 cursor-pointer hover:shadow-md hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between ${theme.card}`}
                      >
                        {/* Fila Superior: Horario y Estado */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-black text-ink-navy flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                            {horaInicio}
                          </span>

                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 border border-black/10 uppercase tracking-wider truncate">
                            {estado === 'asistio' || estado === 'asistió'
                              ? '✓ Asistió'
                              : estado === 'confirmada'
                              ? '✓ Confirmada'
                              : estado === 'no_asistio'
                              ? '⚠️ No Asistió'
                              : '⏳ Pendiente'}
                          </span>
                        </div>

                        {/* Nombre del Paciente */}
                        <div className="my-0.5">
                          <p className="text-xs font-bold text-ink-navy truncate" title={pacienteNombre}>
                            {pacienteNombre}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate" title={cita.motivo_consulta}>
                            {cita.motivo_consulta || 'Sesión Kinésica'}
                          </p>
                        </div>

                        {/* Fila Inferior con Previsión y Duración */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5 border-t border-black/5">
                          <span className="truncate">
                            {cita.pacientes?.prevision || 'Particular'}
                          </span>
                          <span className="font-mono font-bold text-slate-600">
                            {duracionMin}m
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PIE DE LEYENDA CLÍNICA DE LA GRILLA */}
      <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-blue-200 bg-blue-50 border-l-4 border-l-blue-600" />
            <span className="font-semibold text-slate-700">Evaluación Inicial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-emerald-200 bg-emerald-50 border-l-4 border-l-emerald-600" />
            <span className="font-semibold text-slate-700">Tratamiento Kinésico / TMO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-purple-200 bg-purple-50 border-l-4 border-l-purple-600" />
            <span className="font-semibold text-slate-700">Reevaluación</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-slate-200 bg-slate-100 [background-image:repeating-linear-gradient(45deg,#f8fafc,#f8fafc_4px,#f1f5f9_4px,#f1f5f9_8px)]" />
            <span className="text-slate-500">Fuera de Horario de Box</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-signal-blue" />
          <span>Haz clic en cualquier celda para agendar directamente en ese bloque.</span>
        </div>
      </div>
    </div>
  );
}
