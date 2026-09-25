'use client';

import React, { useMemo } from 'react';
import { BloqueoAgenda } from '@/components/agenda/BlockTimeModal';
import {
  SemanaHorariosBox,
  isSlotInWorkingHours,
  DEFAULT_SEMANA_HORARIOS
} from '@/lib/availability';
import { getResumenPlan } from '@/lib/clinical';
import {
  Clock,
  Plus,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  MessageCircle
} from 'lucide-react';

const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00 (cubre hasta 20:30)
const HOURS_COUNT = END_HOUR - START_HOUR; // 13 horas
const HOUR_HEIGHT = 104; // 104px por cada hora (52px cada 30 min)
const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT; // 1352px

interface MedicalTimeGridProps {
  dias: Date[]; // Días a mostrar (7 días: Lunes a Domingo)
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

function formatearFechaChilena(fechaStr: string): string {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  }
  return fechaStr;
}

function formatearNombre(nombreCompleto?: string): string {
  if (!nombreCompleto) return 'Estimado/a';
  const primerNombre = nombreCompleto.trim().split(' ')[0];
  return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
}

function generarMensajeConfirmacion(cita: any): string {
  const p = cita.pacientes || {};
  const nombre = formatearNombre(p.nombre_completo);
  const fechaCL = formatearFechaChilena(cita.fecha);
  const hora = cita.hora?.slice(0, 5) || '16:00';
  const telefonoLimpio = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';

  const texto = `Hola ${nombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${fechaCL} a las ${hora} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;

  return `https://wa.me/56${telefonoLimpio}?text=${encodeURIComponent(texto)}`;
}

// Semáforo de Confirmación de Cita (Traffic Light)
function getCitaTrafficLight(cita: any) {
  const estado = (cita.estado || 'pendiente').toLowerCase();

  if (estado === 'cancelada') {
    return {
      card: 'bg-slate-100/90 border-slate-300 text-slate-500 opacity-60 line-through',
      borderLeft: 'border-l-slate-400',
      dot: 'bg-slate-400',
      badge: 'bg-slate-200 text-slate-600 border-slate-300',
      label: '✕ Cancelada',
    };
  }

  if (estado === 'confirmada') {
    return {
      card: 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-xs hover:bg-emerald-100/70',
      borderLeft: 'border-l-emerald-600',
      dot: 'bg-emerald-600',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      label: '✓ Confirmada',
    };
  }

  if (estado === 'asistio' || estado === 'asistió' || estado === 'atendido') {
    return {
      card: 'bg-teal-50/95 border-teal-300 text-teal-950 shadow-xs hover:bg-teal-100/70',
      borderLeft: 'border-l-teal-600',
      dot: 'bg-teal-600',
      badge: 'bg-teal-100 text-teal-900 border-teal-200',
      label: '✓ Asistió',
    };
  }

  if (estado === 'no_asistio' || estado === 'no asistió') {
    return {
      card: 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-xs hover:bg-rose-100/70',
      borderLeft: 'border-l-rose-500',
      dot: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-900 border-rose-200',
      label: '⚠️ No Asistió',
    };
  }

  // Pendiente (Amarillo / Ámbar estándar)
  return {
    card: 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-xs hover:bg-amber-100/70',
    borderLeft: 'border-l-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    label: '⏳ Pendiente',
  };
}

// Badge de Prestación Clínica (sin opacar el semáforo principal)
function getModalityBadge(motivoConsulta: string = '') {
  const motivo = motivoConsulta.toLowerCase();
  if (motivo.includes('evaluación inicial') || motivo.includes('evaluacion inicial')) {
    return {
      label: 'Eval. Inicial',
      badgeClass: 'bg-blue-100/90 text-blue-800 border-blue-200',
    };
  }
  if (motivo.includes('reevaluación') || motivo.includes('reevaluacion')) {
    return {
      label: 'Reevaluación',
      badgeClass: 'bg-purple-100/90 text-purple-800 border-purple-200',
    };
  }
  return {
    label: 'TMO',
    badgeClass: 'bg-emerald-100/90 text-emerald-800 border-emerald-200',
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
  // Regleta horaria con horas cerradas prominentes y divisiones :30
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
        <div className="min-w-[1340px]">
          {/* EJE X: CABECERA SUPERIOR DE DÍAS (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50/90 sticky top-0 z-30 backdrop-blur-sm">
            {/* Esquina superior izquierda (Regleta horaria) */}
            <div className="w-16 sm:w-20 shrink-0 p-3 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-100/70 text-[11px] font-bold text-slate-500">
              <Clock className="w-4 h-4 text-slate-400 mb-0.5" />
              <span>HORA</span>
            </div>

            {/* Columnas de los Días (Lunes a Domingo) */}
            {dias.map((dia, idx) => {
              const diaStr = getFormattedLocalDate(dia);
              const isToday = diaStr === todayStr;
              const diaSemana = dia.getDay(); // 0 = Domingo, 1 = Lunes, etc.
              const confDia = semanaConfig[diaSemana] || DEFAULT_SEMANA_HORARIOS[diaSemana];
              const isDiaActivo = confDia?.activo ?? true;

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

                  {/* Indicador de disponibilidad diaria */}
                  <div className="mt-1">
                    {(() => {
                      const mananaOn = confDia.manana_activa ?? true;
                      const tardeOn = confDia.tarde_activa ?? (confDia.tarde_fin > confDia.tarde_inicio);
                      if (!isDiaActivo || (!mananaOn && !tardeOn)) {
                        return (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-full">
                            Cerrado
                          </span>
                        );
                      }
                      if (mananaOn && tardeOn) {
                        return (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                            {confDia.manana_inicio} - {confDia.tarde_fin > confDia.tarde_inicio ? confDia.tarde_fin : confDia.manana_fin}
                          </span>
                        );
                      }
                      if (mananaOn) {
                        return (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                            AM: {confDia.manana_inicio}-{confDia.manana_fin}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/80">
                          PM: {confDia.tarde_inicio}-{confDia.tarde_fin}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CUERPO DE LA GRILLA: EJE Y (Regleta) + COLUMNAS DE DÍAS */}
          <div className="flex relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
            {/* EJE Y (Vertical izquierdo): Marcadores de Horas Cerradas y Medias Horas */}
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

              // Filtrar citas del día
              const citasDia = citas.filter((c) => c.fecha === diaStr);

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
                            : `Horario fuera de jornada habitual (${slotTime}). Clic para agendar manualmente.`
                        }
                        className={`absolute left-0 right-0 transition-colors cursor-pointer group flex items-center justify-between px-2 ${
                          slot.isHour
                            ? 'border-b border-slate-300'
                            : 'border-b border-dashed border-slate-200/80'
                        } ${
                          inWorkingHours
                            ? 'bg-white hover:bg-blue-50/70'
                            : 'bg-slate-100/50 hover:bg-amber-50/50 [background-image:repeating-linear-gradient(45deg,#fcfcfd,#fcfcfd_8px,#f8fafc_8px,#f8fafc_16px)]'
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${HOUR_HEIGHT / 2}px`,
                        }}
                      >
                        {/* Marca de agua sutil en franjas no laborales */}
                        {!inWorkingHours ? (
                          <span className="text-[9px] font-semibold text-slate-300/60 select-none tracking-wider uppercase">
                            {slotIdx % 4 === 0 ? 'No disponible' : ''}
                          </span>
                        ) : (
                          <span />
                        )}

                        {/* Botón flotante al pasar el mouse por celda vacía con snap exacto */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold text-signal-blue bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-blue-200 pointer-events-none flex items-center gap-1 ml-auto">
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

                  {/* CAPA 3: Rich Cards Interactivas de Citas Médicas */}
                  {citasDia.map((cita) => {
                    const horaInicio = cita.hora?.slice(0, 5) || '09:00';
                    const duracionMin = getDurationMinutes(cita, duracionPredeterminada);
                    const topPos = getTopPosition(horaInicio);
                    const heightPos = Math.max(46, (duracionMin / 60) * HOUR_HEIGHT - 3);

                    const theme = getCitaTrafficLight(cita);
                    const modality = getModalityBadge(cita.motivo_consulta);

                    const p = cita.pacientes || {};
                    const pacienteNombre =
                      p.nombre_completo ||
                      cita.motivo_consulta?.replace(/^Atención Kinésica - /i, '') ||
                      'Paciente sin registrar';
                    const pacientePrevision = p.prevision || 'Particular';
                    const { tienePlan, sesionesUsadas, sesionesTotales } = getResumenPlan(p);
                    const resumenPlanTexto = tienePlan ? `${sesionesUsadas}/${sesionesTotales} ses.` : 'Sin plan';

                    const estado = (cita.estado || 'pendiente').toLowerCase();
                    const cleanPhone = p.telefono ? p.telefono.replace(/\D/g, '').slice(-9) : '';
                    const whatsappUrl = cleanPhone ? generarMensajeConfirmacion(cita) : '';

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
                        className={`absolute z-20 rounded-xl border-l-4 ${theme.borderLeft} border p-2 transition-all duration-150 cursor-pointer hover:shadow-md hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between ${theme.card}`}
                      >
                        {/* Fila 1: Hora + Prestación + Selector de Estado Rápido */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                            <span className="text-[11px] font-mono font-black text-ink-navy">
                              {horaInicio}
                            </span>
                            <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold truncate ${modality.badgeClass}`}>
                              {modality.label}
                            </span>
                          </div>

                          {/* Selector rápido de estado (Semáforo editable) */}
                          <select
                            value={['asistió', 'atendido'].includes(estado) ? 'asistio' : estado}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (onCambiarEstadoCita) {
                                onCambiarEstadoCita(cita, e.target.value);
                              }
                            }}
                            className="bg-white/95 border border-slate-300 hover:border-slate-400 rounded px-1 py-0.5 text-[9px] font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs shrink-0"
                            title="Cambiar estado de cita"
                          >
                            <option value="pendiente" className="bg-white text-amber-900 font-semibold">⏳ Pendiente</option>
                            <option value="confirmada" className="bg-white text-emerald-900 font-semibold">✓ Confirmada</option>
                            <option value="asistio" className="bg-white text-teal-900 font-semibold">✓ Asistió</option>
                            <option value="no_asistio" className="bg-white text-rose-900 font-semibold">⚠️ No Asistió</option>
                            <option value="cancelada" className="bg-white text-slate-600 font-semibold">✕ Cancelada</option>
                          </select>
                        </div>

                        {/* Fila 2: Nombre del Paciente + Previsión y Avance de Plan */}
                        <div className="my-0.5">
                          <p className="text-xs font-bold text-ink-navy truncate leading-tight" title={pacienteNombre}>
                            {pacienteNombre}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium mt-0.5">
                            <span className="truncate">{pacientePrevision}</span>
                            <span className="font-bold text-ink-navy shrink-0">{resumenPlanTexto}</span>
                          </div>
                        </div>

                        {/* Fila 3: Acciones Rápidas (WhatsApp y Ficha →) */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/5 gap-1">
                          {cleanPhone ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white/90 hover:bg-white px-1.5 py-0.5 rounded shadow-2xs border border-emerald-200/80 transition-colors"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">Sin tel.</span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCita(cita);
                            }}
                            className="inline-flex items-center text-[10px] font-bold text-signal-blue hover:text-blue-900 bg-white/90 hover:bg-white px-2 py-0.5 rounded shadow-2xs border border-blue-200/80 transition-colors cursor-pointer ml-auto"
                          >
                            Ficha →
                          </button>
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
            <span className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-50 border-l-4 border-l-amber-500" />
            <span className="font-semibold text-slate-700">⏳ Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-emerald-300 bg-emerald-50 border-l-4 border-l-emerald-600" />
            <span className="font-semibold text-slate-700">✓ Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-teal-300 bg-teal-50 border-l-4 border-l-teal-600" />
            <span className="font-semibold text-slate-700">✓ Asistió</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-rose-300 bg-rose-50 border-l-4 border-l-rose-500" />
            <span className="font-semibold text-slate-700">⚠️ No Asistió</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-slate-200 bg-slate-100 [background-image:repeating-linear-gradient(45deg,#fcfcfd,#fcfcfd_4px,#f8fafc_4px,#f8fafc_8px)]" />
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
