'use client';

import React, { useMemo } from 'react';
import { BloqueoAgenda } from '@/components/agenda/BlockTimeModal';
import {
  SemanaHorariosBox,
  isSlotInWorkingHours,
  DEFAULT_SEMANA_HORARIOS
} from '@/lib/availability';
import { AppointmentCardPro, CitaAtencionPro } from '@/components/agenda/AppointmentCardPro';
import {
  Clock,
  Plus,
  Lock,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';

const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00 (cubre franjas hasta las 20:30)
const HOURS_COUNT = END_HOUR - START_HOUR; // 13 horas
const HOUR_HEIGHT = 104; // 104px por cada hora (52px cada 30 min)
const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT; // 1352px

interface TimeGridWeeklyProps {
  dias: Date[]; // Días a mostrar (Lunes a Domingo)
  citas: any[]; // Citas extendidas normalizadas
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

function getDurationMinutes(cita: CitaAtencionPro, defaultDuration: number = 45): number {
  const motivo = String(cita?.motivo_consulta || cita?.tipo_prestacion || '').toLowerCase();
  if (motivo.includes('60 min') || motivo.includes('evaluación inicial') || motivo.includes('evaluacion inicial')) {
    return 60;
  }
  if (motivo.includes('30 min')) return 30;
  if (motivo.includes('45 min')) return 45;
  return defaultDuration;
}

export function TimeGridWeekly({
  dias,
  citas,
  bloqueos,
  semanaConfig = DEFAULT_SEMANA_HORARIOS,
  duracionPredeterminada = 45,
  onSelectEmptySlot,
  onSelectCita,
  onDesbloquear,
  onCambiarEstadoCita
}: TimeGridWeeklyProps) {
  // Regleta horaria fija con horas en punto prominentes y división de 30 min
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
      {/* Scroll horizontal contenedor con min-width para garantizar 7 columnas holgadas */}
      <div className="overflow-x-auto">
        <div className="min-w-[1340px]">
          {/* EJE X: CABECERA SUPERIOR DE DÍAS (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50/95 sticky top-0 z-30 backdrop-blur-sm">
            {/* Esquina superior izquierda (Regleta horaria) */}
            <div className="w-16 sm:w-20 shrink-0 p-3 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-100/70 text-[11px] font-bold text-slate-500">
              <Clock className="w-4 h-4 text-slate-400 mb-0.5" />
              <span>HORA</span>
            </div>

            {/* 7 Columnas de Días (Lunes a Domingo) */}
            {dias.map((dia, idx) => {
              const diaStr = getFormattedLocalDate(dia);
              const isToday = diaStr === todayStr;
              const diaSemana = dia.getDay(); // 0 = Domingo, 1 = Lunes, etc.
              const confDia = semanaConfig[diaSemana] || DEFAULT_SEMANA_HORARIOS[diaSemana];
              const isDiaActivo = confDia?.activo ?? true;

              const mananaOn = confDia?.manana_activa ?? true;
              const tardeOn = confDia?.tarde_activa ?? (confDia?.tarde_fin > confDia?.tarde_inicio);

              let shiftLabel = 'Cerrado';
              let shiftBadgeColor = 'text-slate-400 bg-slate-200/80';

              if (isDiaActivo && (mananaOn || tardeOn)) {
                if (mananaOn && tardeOn) {
                  shiftLabel = `${confDia.manana_inicio} - ${confDia.tarde_fin > confDia.tarde_inicio ? confDia.tarde_fin : confDia.manana_fin}`;
                  shiftBadgeColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-semibold';
                } else if (mananaOn) {
                  shiftLabel = `AM: ${confDia.manana_inicio}-${confDia.manana_fin}`;
                  shiftBadgeColor = 'text-amber-700 bg-amber-50 border border-amber-200/80 font-semibold';
                } else {
                  shiftLabel = `PM: ${confDia.tarde_inicio}-${confDia.tarde_fin}`;
                  shiftBadgeColor = 'text-indigo-700 bg-indigo-50 border border-indigo-200/80 font-semibold';
                }
              }

              return (
                <div
                  key={idx}
                  className={`flex-1 min-w-[180px] p-3 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
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

                  {/* Indicador de turno activo en la cabecera */}
                  <div className="mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block truncate max-w-full ${shiftBadgeColor}`}>
                      {shiftLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CUERPO DE LA GRILLA: EJE Y (Regleta) + COLUMNAS DE DÍAS */}
          <div className="flex relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
            {/* EJE Y (Vertical izquierdo): Marcadores de Horas en Punto y :30 */}
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
                      <span className="text-xs font-mono font-black text-slate-800 -translate-y-2.5 bg-slate-50/90 px-1 rounded">
                        {slot.label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-medium text-slate-400 -translate-y-2">
                        :30
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

              // Filtrar citas del día de forma segura
              const citasDia = citas.filter((c) => c?.fecha === diaStr);

              // Filtrar bloqueos del día
              const bloqueosDia = bloqueos.filter(
                (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
              );

              return (
                <div
                  key={diaIdx}
                  className="flex-1 min-w-[180px] border-r border-slate-200 last:border-r-0 relative overflow-hidden"
                  style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
                >
                  {/* CAPA 1: Celdas de Tiempo de Fondo (Snap a Hora y :30) */}
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
                            : `Horario fuera de jornada habitual (${slotTime}). Clic para agendar manualmente de forma excepcional.`
                        }
                        className={`absolute left-0 right-0 transition-colors cursor-pointer group flex items-center justify-between px-2 ${
                          slot.isHour
                            ? 'border-b border-slate-300'
                            : 'border-b border-dashed border-slate-200/80'
                        } ${
                          inWorkingHours
                            ? 'bg-white hover:bg-blue-50/70'
                            : 'bg-slate-50 text-slate-400 hover:bg-amber-50/50 [background-image:repeating-linear-gradient(45deg,#fcfcfd,#fcfcfd_8px,#f8fafc_8px,#f8fafc_16px)]'
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${HOUR_HEIGHT / 2}px`,
                        }}
                      >
                        {/* Indicador sutil de jornada cerrada en franjas no laborales */}
                        {!inWorkingHours ? (
                          <span className="text-[9px] font-semibold text-slate-300/60 select-none tracking-wider uppercase">
                            {slotIdx % 4 === 0 ? 'No disponible' : ''}
                          </span>
                        ) : (
                          <span />
                        )}

                        {/* Botón flotante al pasar el mouse por celda vacía con snap exacto */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold text-signal-blue bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-blue-200 pointer-events-none flex items-center gap-1 ml-auto">
                          <Plus className="w-3 h-3" /> {inWorkingHours ? `Agendar ${slotTime}` : `Excepcional ${slotTime}`}
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

                  {/* CAPA 3: Tarjetas de Cita Profesionales (AppointmentCardPro) */}
                  {citasDia.map((cita) => {
                    const horaInicio = cita?.hora?.slice(0, 5) || '09:00';
                    const duracionMin = getDurationMinutes(cita, duracionPredeterminada);
                    const topPos = getTopPosition(horaInicio);
                    const heightPos = Math.max(46, (duracionMin / 60) * HOUR_HEIGHT - 3);

                    return (
                      <div
                        key={cita.id}
                        style={{
                          top: `${topPos}px`,
                          height: `${heightPos}px`,
                          left: '4px',
                          right: '4px',
                        }}
                        className="absolute z-20"
                      >
                        <AppointmentCardPro
                          cita={cita}
                          duracionMinutos={duracionMin}
                          onSelectCita={onSelectCita}
                          onCambiarEstado={onCambiarEstadoCita}
                        />
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
            <span className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-50 border-l-4 border-l-amber-500" />
            <span className="font-semibold text-slate-700">⏳ Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-emerald-300 bg-emerald-50 border-l-4 border-l-emerald-600" />
            <span className="font-semibold text-slate-700">✓ Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-teal-300 bg-teal-50 border-l-4 border-l-teal-600" />
            <span className="font-semibold text-slate-700">✓ Atendida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-rose-300 bg-rose-50 border-l-4 border-l-rose-500" />
            <span className="font-semibold text-slate-700">⚠️ No Asistió</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-slate-200 bg-slate-50 [background-image:repeating-linear-gradient(45deg,#fcfcfd,#fcfcfd_4px,#f8fafc_4px,#f8fafc_8px)]" />
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
