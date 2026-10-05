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
  Calendar,
  Sparkles
} from 'lucide-react';

const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00 (cubre hasta las 20:00 - 20:30)
const HOURS_COUNT = END_HOUR - START_HOUR; // 13 horas
const HOUR_HEIGHT = 60; // 60px de altura fija por hora
const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT; // 780px

interface ClinicalTimeGridProps {
  dias: Date[]; // Días a mostrar (Lunes a Sábado si es semana, o 1 día si es vista diaria)
  citas: any[]; // Citas extendidas normalizadas
  bloqueos: BloqueoAgenda[];
  semanaConfig?: SemanaHorariosBox;
  duracionPredeterminada?: number;
  onSelectEmptySlot: (fecha: string, hora: string) => void;
  onSelectCita: (cita: any) => void;
  onDesbloquear: (bloqueo: BloqueoAgenda) => void;
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
  const motivo = String(cita?.motivo_consulta || cita?.tipo_prestacion || '').toLowerCase();
  if (motivo.includes('60 min') || motivo.includes('evaluación inicial') || motivo.includes('evaluacion inicial')) {
    return 60;
  }
  if (motivo.includes('30 min')) return 30;
  if (motivo.includes('45 min')) return 45;
  return defaultDuration;
}

function calcularHoraFin(horaInicio?: string | null, duracionMin: number = 45): string {
  if (!horaInicio) return '09:45';
  const [hStr, mStr] = horaInicio.slice(0, 5).split(':');
  const h = Number(hStr) || 8;
  const m = Number(mStr) || 0;
  const totalM = h * 60 + m + duracionMin;
  const endH = Math.floor(totalM / 60);
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Estilo Pastel Suave con Barra Lateral de 4px sólida
function getPastelCardTheme(cita: any) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  
  if (['confirmada'].includes(estado)) {
    return {
      card: 'bg-emerald-600 hover:bg-emerald-700 text-white border-l-4 border-l-emerald-800 shadow-md',
      textPrimary: 'text-white',
      textSecondary: 'text-emerald-100/90',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-emerald-900/60 text-emerald-100',
      pillPayOk: 'bg-white text-emerald-900',
      pillPayDebt: 'bg-rose-500 text-white'
    };
  } else if (['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)) {
    return {
      card: 'bg-slate-700 hover:bg-slate-800 text-slate-100 border-l-4 border-l-slate-900 shadow-sm',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-300',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-slate-900/60 text-slate-200',
      pillPayOk: 'bg-emerald-500 text-white',
      pillPayDebt: 'bg-rose-500 text-white'
    };
  } else if (['no_asistio', 'no asistió', 'cancelada'].includes(estado)) {
    return {
      card: 'bg-rose-600 hover:bg-rose-700 text-white border-l-4 border-l-rose-800 shadow-sm opacity-90',
      textPrimary: 'text-white',
      textSecondary: 'text-rose-200',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-rose-900/60 text-rose-100',
      pillPayOk: 'bg-white/80 text-rose-900',
      pillPayDebt: 'bg-rose-900 text-rose-100'
    };
  }
  
  // Pendiente por defecto
  return {
    card: 'bg-amber-500 hover:bg-amber-600 text-white border-l-4 border-l-amber-700 shadow-md',
    textPrimary: 'text-white',
    textSecondary: 'text-amber-100/90',
    pillBg: 'bg-white/20 text-white',
    pillSession: 'bg-amber-900/60 text-amber-100',
    pillPayOk: 'bg-white text-amber-900',
    pillPayDebt: 'bg-rose-500 text-white'
  };
}

export function ClinicalTimeGrid({
  dias,
  citas,
  bloqueos,
  semanaConfig = DEFAULT_SEMANA_HORARIOS,
  duracionPredeterminada = 45,
  onSelectEmptySlot,
  onSelectCita,
  onDesbloquear
}: ClinicalTimeGridProps) {
  // Generar regleta horaria fija (horas de 08:00 a 20:00 con intervalos de 30 min)
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
      {/* Contenedor con scroll horizontal en móviles / pantallas compactas */}
      <div className="overflow-x-auto">
        <div className={dias.length === 1 ? 'min-w-[500px]' : 'min-w-[1200px]'}>
          {/* CABECERA SUPERIOR DE DÍAS (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50/95 sticky top-0 z-30 backdrop-blur-xs">
            {/* Esquina superior izquierda (Regleta de horas) */}
            <div className="w-16 sm:w-20 shrink-0 p-3 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-100/70 text-[11px] font-bold text-slate-500">
              <Clock className="w-4 h-4 text-slate-400 mb-0.5" />
              <span>HORA</span>
            </div>

            {/* Columnas de Días (Lunes a Sábado o Día Único) */}
            {dias.map((dia, idx) => {
              const diaStr = getFormattedLocalDate(dia);
              const isToday = diaStr === todayStr;
              const nombreDiaCorto = dia
                .toLocaleDateString('es-CL', { weekday: 'short' })
                .replace('.', '')
                .toUpperCase();
              const diaNumero = dia.getDate();

              return (
                <div
                  key={idx}
                  className={`flex-1 p-2.5 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                    isToday ? 'bg-emerald-50/60' : ''
                  }`}
                >
                  <p className="text-xs font-black tracking-wider text-slate-700">
                    <span className="uppercase text-slate-500 mr-1.5">{nombreDiaCorto}</span>
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${
                        isToday ? 'bg-emerald-600 text-white' : 'text-slate-900'
                      }`}
                    >
                      {diaNumero}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* CUERPO DE LA GRILLA: EJE Y (Horas) + COLUMNAS */}
          <div className="flex relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
            {/* EJE Y (Vertical izquierdo): Horas redondas y limpias de 08:00 a 20:00 */}
            <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-white shadow-xs relative z-10">
              {timeSlots.map((slot, sIdx) => {
                const topPx = sIdx * (HOUR_HEIGHT / 2);
                return (
                  <div
                    key={sIdx}
                    className="absolute left-0 right-0 pr-2.5 text-right flex items-center justify-end"
                    style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT / 2}px` }}
                  >
                    {slot.isHour ? (
                      <span className="text-xs font-mono font-bold text-slate-700 -translate-y-2.5 bg-slate-50/90 px-1 rounded">
                        {slot.label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-medium text-slate-300 -translate-y-2">
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

              // Citas del día
              const citasDia = citas.filter((c) => c?.fecha === diaStr);

              // Bloqueos del día
              const bloqueosDia = bloqueos.filter(
                (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
              );

              return (
                <div
                  key={diaIdx}
                  className="flex-1 border-r border-slate-200 last:border-r-0 relative overflow-hidden"
                  style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
                >
                  {/* CAPA 1: Celdas Horarias de Fondo (Espacios libres y fuera de turno) */}
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
                            : `Horario fuera de turno habitual (${slotTime}). Clic para agendamiento excepcional.`
                        }
                        className={`absolute left-0 right-0 transition-colors cursor-pointer group flex items-center justify-end pr-2 ${
                          slot.isHour
                            ? 'border-b border-slate-200/90'
                            : 'border-b border-dashed border-slate-100'
                        } ${
                          inWorkingHours ? 'bg-white hover:bg-emerald-50/60' : 'bg-orange-50/80 hover:bg-orange-100/60'
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${HOUR_HEIGHT / 2}px`,
                        }}
                      >
                        {/* Botón flotante al pasar el cursor */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-700 bg-white/95 px-2 py-0.5 rounded-md shadow-2xs border border-indigo-200 pointer-events-none flex items-center gap-1">
                          <Plus className="w-3 h-3" /> {slotTime}
                        </span>
                      </div>
                    );
                  })}

                  {/* INDICADOR DE HORA ACTUAL */}
                  {(() => {
                    const now = new Date();
                    const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    if (nowStr === diaStr) {
                      const h = now.getHours();
                      const m = now.getMinutes();
                      if (h >= START_HOUR && h <= END_HOUR) {
                        const topPos = ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
                        return (
                          <div className="absolute left-0 right-0 z-40 pointer-events-none" style={{ top: `${topPos}px` }}>
                            <div className="relative">
                              <div className="absolute left-0 w-2 h-2 rounded-full bg-emerald-500 -translate-y-1/2 -translate-x-1 shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                              <div className="w-full border-t-2 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.2)]"></div>
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {/* CAPA 2: Bloqueos de Horario */}
                  {bloqueosDia.map((b) => {
                    const topPos = getTopPosition(b.hora_inicio || '08:00');
                    const duracionMin = getMinutesFrom8am(b.hora_fin || '09:00') - getMinutesFrom8am(b.hora_inicio || '08:00');
                    const heightPos = Math.max(38, (duracionMin / 60) * HOUR_HEIGHT);
                    
                    if (b.dia_completo) {
                       return (
                         <div key={b.id} className="absolute z-10 left-1 right-1 top-1 bottom-1 bg-orange-200/80 border-l-4 border-l-orange-500 border-y border-r border-orange-300 text-orange-950 rounded-xl flex flex-col items-center justify-center p-2 backdrop-blur-[2px]">
                           <Lock className="w-5 h-5 mb-1 opacity-70" />
                           <span className="text-xs font-bold text-center leading-tight">{b.titulo}</span>
                         </div>
                       );
                    }
                    
                    return (
                      <div
                        key={b.id}
                        className="absolute z-10 bg-orange-200/80 border-l-4 border-l-orange-500 border-y border-r border-orange-300 text-orange-950 rounded-xl p-2.5 shadow-xs overflow-hidden flex flex-col items-start backdrop-blur-[1px]"
                        style={{ top: `${topPos}px`, height: `${heightPos}px`, left: '2px', right: '2px' }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock className="w-3 h-3 shrink-0 opacity-80" />
                          <span className="text-xs font-bold truncate leading-tight">{b.titulo}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* CAPA 3: Bloques de Cita en Estilo Pastel */}
                  
                  
{citasDia.map((cita) => {
                    const horaInicio = cita?.hora?.slice(0, 5) || '09:00';
                    const duracionMin = getDurationMinutes(cita, duracionPredeterminada);
                    const topPos = getTopPosition(horaInicio);
                    const heightPos = Math.max(38, (duracionMin / 60) * HOUR_HEIGHT - 2);
                    const horaFin = calcularHoraFin(horaInicio, duracionMin);

                    const theme = getPastelCardTheme(cita);
                    const p = cita.paciente || cita.pacientes || {};
                    const pacienteNombre =
                      p.nombre_completo ||
                      cita.motivo_consulta?.replace(/^Atención Kinésica - /i, '') ||
                      'Paciente sin registrar';

                    const motivoTexto = cita.motivo_consulta || 'Sesión Kinésica TMO';

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
                          left: '3px',
                          right: '3px',
                        }}
                        className={`absolute z-20 rounded-lg p-1.5 px-2 transition-all cursor-pointer hover:brightness-110 hover:shadow-lg active:scale-[0.98] overflow-hidden flex flex-col ${theme.card}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={`text-[10px] font-mono font-bold opacity-90 block mb-0.5 ${theme.textSecondary}`}>{horaInicio} - {horaFin}</span>
                          <span className={`text-xs font-bold leading-tight truncate block ${theme.textPrimary}`}>
                            {pacienteNombre}
                          </span>
                          <span className={`text-[10px] opacity-80 truncate block mt-0.5 ${theme.textSecondary}`} title={motivoTexto}>
                            {motivoTexto}
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

      {/* PIE DE LEYENDA CLÍNICA EN TONOS PASTEL */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 shadow-sm" />
            <span className="font-semibold text-slate-700">Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 shadow-sm" />
            <span className="font-semibold text-slate-700">Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-700 shadow-sm" />
            <span className="font-semibold text-slate-700">Atendida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 shadow-sm opacity-90" />
            <span className="font-semibold text-slate-700">Inasistencia / Cancelada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
            <span className="text-slate-400">Fuera de turno</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Haz clic en cualquier bloque de cita para ver su ficha y WhatsApp.</span>
        </div>
      </div>
    </div>
  );
}
