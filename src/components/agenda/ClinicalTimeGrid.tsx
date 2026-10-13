'use client';

import React, { useMemo, useState } from 'react';
import { BloqueoAgenda } from '@/components/agenda/BlockTimeModal';
import { AppointmentPopover } from '@/components/agenda/AppointmentPopover';
import {
  SemanaHorariosBox,
  isSlotInWorkingHours,
  DEFAULT_SEMANA_HORARIOS
} from '@/lib/availability';
import {
  Clock,
  Plus,
  Lock,
  Sparkles
} from 'lucide-react';

const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00 (cubre hasta las 20:00 - 20:30)
const HOURS_COUNT = END_HOUR - START_HOUR; // 13 horas
const HOUR_HEIGHT = 80; // 80px de altura fija por hora (escala ergonómica)
const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT; // 1040px

export interface ClinicalTimeGridProps {
  dias: Date[]; // Días a mostrar (Lunes a Sábado si es semana, o 1 día si es vista diaria)
  citas: any[]; // Citas extendidas normalizadas
  bloqueos: BloqueoAgenda[];
  semanaConfig?: SemanaHorariosBox;
  duracionPredeterminada?: number;
  onSelectEmptySlot: (fecha: string, hora: string) => void;
  onSelectCita?: (cita: any) => void;
  onCambiarEstadoCita?: (cita: any, nuevoEstado: string) => void;
  onAbrirFicha?: (pacienteId: string, cita: any) => void;
  onCobrar?: (cita: any) => void;
  onEditarCita?: (cita: any) => void;
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

// Estilo Kiromov Precision con Borde Izquierdo Sólido y Fondos Clínicos Suaves
function getPastelCardTheme(cita: any) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  
  if (['confirmada'].includes(estado)) {
    return {
      card: 'bg-emerald-50/95 hover:bg-emerald-100/90 text-emerald-950 border border-emerald-300 border-l-4 border-l-emerald-600 shadow-xs',
      textPrimary: 'text-emerald-950',
      textSecondary: 'text-emerald-700',
      badgeBg: 'bg-emerald-200/80 text-emerald-900',
    };
  } else if (['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)) {
    return {
      card: 'bg-slate-100/95 hover:bg-slate-200/80 text-slate-900 border border-slate-300 border-l-4 border-l-slate-700 shadow-xs',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-600',
      badgeBg: 'bg-slate-200 text-slate-800',
    };
  } else if (['no_asistio', 'no asistió', 'cancelada'].includes(estado)) {
    return {
      card: 'bg-rose-50/95 hover:bg-rose-100/90 text-rose-950 border border-rose-300 border-l-4 border-l-rose-500 shadow-xs opacity-90',
      textPrimary: 'text-rose-950',
      textSecondary: 'text-rose-700',
      badgeBg: 'bg-rose-200/80 text-rose-900',
    };
  }
  
  // Pendiente por defecto
  return {
    card: 'bg-amber-50/95 hover:bg-amber-100/90 text-amber-950 border border-amber-300 border-l-4 border-l-amber-500 shadow-xs',
    textPrimary: 'text-amber-950',
    textSecondary: 'text-amber-700',
    badgeBg: 'bg-amber-200/80 text-amber-900',
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
  onCambiarEstadoCita,
  onAbrirFicha,
  onCobrar,
  onEditarCita,
  onDesbloquear
}: ClinicalTimeGridProps) {
  const [popoverCitaId, setPopoverCitaId] = useState<string | null>(null);

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
      {/* Contenedor responsivo sin scroll horizontal rígido en laptops */}
      <div className="overflow-x-auto w-full">
        <div className={dias.length === 1 ? 'w-full min-w-[320px]' : 'w-full min-w-[640px] lg:min-w-0'}>
          {/* CABECERA SUPERIOR DE DÍAS (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50/95 sticky top-0 z-30 backdrop-blur-xs">
            {/* Esquina superior izquierda (Regleta de horas) */}
            <div className="w-14 sm:w-16 shrink-0 p-2.5 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-100/70 text-[10px] font-bold text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
              <span>HORA</span>
            </div>

            {/* Columnas de Días */}
            <div
              className="flex-1 min-w-0 grid"
              style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
            >
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
                    className={`p-2 sm:p-2.5 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                      isToday ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <p className="text-xs font-black tracking-wider text-slate-700 flex items-center justify-center gap-1 sm:gap-1.5">
                      <span className="uppercase text-slate-500 text-[11px]">{nombreDiaCorto}</span>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold shadow-xs ${
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
          </div>

          {/* CUERPO DE LA GRILLA: EJE Y (Horas) + COLUMNAS */}
          <div className="flex relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
            {/* EJE Y (Vertical izquierdo): Horas redondas y limpias de 08:00 a 20:00 */}
            <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200 bg-white shadow-xs relative z-10">
              {timeSlots.map((slot, sIdx) => {
                const topPx = sIdx * (HOUR_HEIGHT / 2);
                return (
                  <div
                    key={sIdx}
                    className="absolute left-0 right-0 pr-2 text-right flex items-center justify-end"
                    style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT / 2}px` }}
                  >
                    {slot.isHour ? (
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-700 -translate-y-2.5 bg-slate-50/90 px-1 rounded">
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
            <div
              className="flex-1 min-w-0 grid relative"
              style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
            >
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
                    className="border-r border-slate-200 last:border-r-0 relative overflow-hidden h-full"
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
                            inWorkingHours ? 'bg-white hover:bg-emerald-50/50' : 'bg-orange-50/70 hover:bg-orange-100/60'
                          }`}
                          style={{
                            top: `${topPx}px`,
                            height: `${HOUR_HEIGHT / 2}px`,
                          }}
                        >
                          {/* Botón flotante al pasar el cursor */}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-emerald-800 bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-emerald-200 pointer-events-none flex items-center gap-1">
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
                      const heightPos = Math.max(24, Math.round((duracionMin / 60) * HOUR_HEIGHT));
                      
                      if (b.dia_completo) {
                         return (
                           <div key={b.id} className="absolute z-10 left-1 right-1 top-1 bottom-1 bg-amber-100/90 border-l-4 border-l-amber-500 border border-amber-300 text-amber-950 rounded-xl flex flex-col items-center justify-center p-2 backdrop-blur-[2px]">
                             <Lock className="w-4 h-4 mb-1 text-amber-700 opacity-80" />
                             <span className="text-xs font-bold text-center leading-tight">{b.titulo}</span>
                           </div>
                         );
                      }
                      
                      return (
                        <div
                          key={b.id}
                          className="absolute z-10 bg-amber-100/90 border-l-4 border-l-amber-500 border border-amber-300 text-amber-950 rounded-lg p-2 shadow-2xs overflow-hidden flex flex-col items-start backdrop-blur-[1px]"
                          style={{ top: `${topPos}px`, height: `${heightPos}px`, left: '2px', right: '2px' }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Lock className="w-3 h-3 shrink-0 text-amber-700 opacity-80" />
                            <span className="text-xs font-bold truncate leading-tight">{b.titulo}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* CAPA 3: Bloques de Cita con Popover Flotante Contextual Anclado */}
                    {citasDia.map((cita) => {
                      const horaInicio = cita?.hora?.slice(0, 5) || '09:00';
                      const duracionMin = getDurationMinutes(cita, duracionPredeterminada);
                      const topPos = getTopPosition(horaInicio);
                      const heightPos = Math.round((duracionMin / 60) * HOUR_HEIGHT) - 2;
                      const horaFin = calcularHoraFin(horaInicio, duracionMin);

                      const theme = getPastelCardTheme(cita);
                      const p = cita.paciente || cita.pacientes || {};
                      const pacienteNombre =
                        p.nombre_completo ||
                        cita.motivo_consulta?.replace(/^Atención Kinésica - /i, '') ||
                        'Paciente sin registrar';

                      const motivoTexto = cita.motivo_consulta || 'Sesión Kinésica TMO';
                      const tienePlan = (p.total_sesiones || 0) > 0;
                      const sesInfo = tienePlan ? `${p.sesiones_usadas || 0}/${p.total_sesiones}` : null;
                      const debePago = p.estado_pago === 'pendiente' && (p.monto_clp || p.valor_total || 0) > 0;

                      return (
                        <AppointmentPopover
                          key={cita.id}
                          cita={cita}
                          open={popoverCitaId === cita.id}
                          onOpenChange={(isOpen) => setPopoverCitaId(isOpen ? cita.id : null)}
                          onCambiarEstado={(c, nuevoEstado) => onCambiarEstadoCita?.(c, nuevoEstado)}
                          onAbrirFicha={(pacId, c) => onAbrirFicha?.(pacId, c)}
                          onCobrar={(c) => onCobrar?.(c)}
                          onEditar={(c) => onEditarCita?.(c)}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCita?.(cita);
                            }}
                            style={{
                              top: `${topPos}px`,
                              height: `${heightPos}px`,
                              left: '2px',
                              right: '2px',
                            }}
                            className={`absolute z-20 rounded-lg p-1.5 px-2 transition-all cursor-pointer hover:brightness-95 hover:shadow-md active:scale-[0.99] overflow-hidden flex flex-col justify-between ${theme.card}`}
                          >
                            {duracionMin < 30 ? (
                              // CITA CORTA (< 30 min): 1 línea ultra compacta
                              <div className="flex items-center gap-1.5 min-w-0 text-[10px] leading-tight">
                                <span className="font-mono font-bold shrink-0">{horaInicio}</span>
                                <span className="font-bold truncate">{pacienteNombre}</span>
                                {sesInfo && <span className="font-mono opacity-80 shrink-0">({sesInfo})</span>}
                              </div>
                            ) : duracionMin < 45 ? (
                              // CITA MEDIANA (30-44 min): 2 líneas compactas
                              <div className="min-w-0 flex-1 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-[10px] font-mono leading-none mb-0.5">
                                  <span className={`font-bold opacity-90 ${theme.textSecondary}`}>
                                    {horaInicio} - {horaFin}
                                  </span>
                                  {sesInfo && (
                                    <span className={`text-[9px] font-bold px-1 rounded ${theme.badgeBg}`}>
                                      {sesInfo}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-xs font-bold leading-tight truncate block ${theme.textPrimary}`}>
                                  {pacienteNombre}
                                </span>
                              </div>
                            ) : (
                              // CITA ESTÁNDAR O LARGA (>= 45 min): 2-3 líneas con jerarquía clínica clara
                              <div className="min-w-0 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between text-[10px] font-mono leading-none mb-1">
                                    <span className={`font-bold opacity-90 ${theme.textSecondary}`}>
                                      {horaInicio} - {horaFin}
                                    </span>
                                    {sesInfo && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${theme.badgeBg}`}>
                                        {sesInfo} ses.
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-xs font-bold leading-snug truncate block ${theme.textPrimary}`}>
                                    {pacienteNombre}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[10px] opacity-85 truncate mt-0.5">
                                  <span className={`truncate font-medium ${theme.textSecondary}`} title={motivoTexto}>
                                    {motivoTexto}
                                  </span>
                                  {debePago && (
                                    <span className="text-[9px] font-mono text-rose-600 font-bold shrink-0" title="Saldo pendiente">
                                      🔴
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </AppointmentPopover>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PIE DE LEYENDA CLÍNICA EN TONOS KIROMOV PRECISION */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 shadow-2xs" />
            <span className="font-semibold text-slate-700">Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 shadow-2xs" />
            <span className="font-semibold text-slate-700">Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-700 shadow-2xs" />
            <span className="font-semibold text-slate-700">Atendida / Asistió</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 shadow-2xs opacity-90" />
            <span className="font-semibold text-slate-700">Cancelada / No asistió</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200" />
            <span className="text-slate-500">Fuera de turno</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Haz clic en cualquier cita para ver popover rápido (WhatsApp, Ficha y Cobro).</span>
        </div>
      </div>
    </div>
  );
}

export default ClinicalTimeGrid;
