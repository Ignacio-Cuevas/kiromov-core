'use client';

import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { getResumenPlan } from '@/lib/clinical';

export interface PacienteBasico {
  id?: string;
  nombre_completo?: string | null;
  telefono?: string | null;
  rut?: string | null;
  prevision?: string | null;
  nombre_plan?: string | null;
  estado_plan?: string | null;
  sesiones_usadas?: number | null;
  sesiones_consumidas?: number | null;
  sesiones_totales?: number | null;
  sesiones_restantes?: number | null;
  [key: string]: any;
}

export interface CitaAtencionPro {
  id: string;
  paciente_id?: string | null;
  fecha?: string | null;
  hora?: string | null;
  fecha_hora_inicio?: string | null;
  fecha_hora_fin?: string | null;
  estado?: 'pendiente' | 'confirmada' | 'asistio' | 'asistió' | 'atendida' | 'atendido' | 'no_asistio' | 'cancelada' | string | null;
  motivo_consulta?: string | null;
  tipo_prestacion?: string | null;
  tipo_sesion?: string | null;
  profesional?: string | null;
  google_event_id?: string | null;
  pacientes?: any;
  paciente?: any;
  notas?: string | null;
  [key: string]: any;
}

interface AppointmentCardProProps {
  cita: any;
  duracionMinutos?: number;
  onSelectCita: (cita: any) => void;
  onCambiarEstado?: (cita: any, nuevoEstado: string) => void;
}

function formatearNombre(nombreCompleto?: string | null): string {
  if (!nombreCompleto) return 'Paciente sin registrar';
  const primerNombre = String(nombreCompleto).trim().split(' ')[0];
  if (!primerNombre) return 'Paciente sin registrar';
  return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
}

function formatearFechaChilena(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const partes = String(fechaStr).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return String(fechaStr);
}

function getEndTimeStr(startTimeStr: string, durationMinutes: number = 45): string {
  if (!startTimeStr) return '09:45';
  const [hStr, mStr] = startTimeStr.slice(0, 5).split(':');
  const h = Number(hStr) || 8;
  const m = Number(mStr) || 0;
  const totalM = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalM / 60);
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function getTipoPrestacionBadge(cita: CitaAtencionPro) {
  const texto = String(
    cita?.tipo_prestacion || cita?.tipo_sesion || cita?.motivo_consulta || 'Atención TMO'
  ).toLowerCase();

  if (texto.includes('evaluación inicial') || texto.includes('evaluacion inicial') || texto.includes('evaluación') || texto.includes('evaluacion')) {
    return { label: 'Evaluación', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
  if (texto.includes('reevaluación') || texto.includes('reevaluacion')) {
    return { label: 'Reevaluación', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' };
  }
  if (texto.includes('recovery')) {
    return { label: 'Recovery', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  return { label: 'TMO', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
}

function generarMensajeWhatsApp(cita: CitaAtencionPro): string {
  const p = cita?.paciente || cita?.pacientes || {};
  const nombre = formatearNombre(p?.nombre_completo || cita?.paciente_nombre);
  const fechaCL = formatearFechaChilena(cita?.fecha);
  const hora = cita?.hora?.slice(0, 5) || '16:00';
  const telefonoRaw = p?.telefono || cita?.telefono || '';
  const cleanPhone = String(telefonoRaw).replace(/\D/g, '').slice(-9);

  const texto = `Hola ${nombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${fechaCL} a las ${hora} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;

  return `https://wa.me/56${cleanPhone}?text=${encodeURIComponent(texto)}`;
}

export function AppointmentCardPro({
  cita,
  duracionMinutos = 45,
  onSelectCita,
  onCambiarEstado
}: AppointmentCardProProps) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  const p = cita?.paciente || cita?.pacientes || {};
  const pacienteNombre =
    p?.nombre_completo ||
    cita?.motivo_consulta?.replace(/^Atención Kinésica - /i, '') ||
    'Paciente sin registrar';

  const horaInicio = cita?.hora?.slice(0, 5) || '09:00';
  const horaFin = cita?.fecha_hora_fin
    ? cita.fecha_hora_fin.slice(11, 16)
    : getEndTimeStr(horaInicio, duracionMinutos);

  const modality = getTipoPrestacionBadge(cita);
  const { tienePlan, sesionesUsadas, sesionesTotales } = getResumenPlan(p);
  const planInfo = tienePlan ? `${sesionesUsadas}/${sesionesTotales} ses.` : 'Sin plan';
  const prevision = p?.prevision || 'Particular';

  const cleanPhone = p?.telefono ? String(p.telefono).replace(/\D/g, '').slice(-9) : '';
  const whatsappUrl = cleanPhone ? generarMensajeWhatsApp(cita) : '';

  // Configuración de estilo según Semáforo de Estado (Linear / Tailwind UI)
  const isCancelada = estado === 'cancelada';
  const isConfirmada = estado === 'confirmada';
  const isAtendida = ['asistio', 'asistió', 'atendida', 'atendido'].includes(estado);
  const isNoAsistio = ['no_asistio', 'no asistió'].includes(estado);
  const isPendiente = !isCancelada && !isConfirmada && !isAtendida && !isNoAsistio;

  let themeStyles = {
    container: 'bg-amber-50/90 border border-amber-200 border-l-4 border-l-amber-500 text-amber-950 hover:bg-amber-100/70',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    label: '⏳ Pendiente'
  };

  if (isConfirmada) {
    themeStyles = {
      container: 'bg-emerald-50/90 border border-emerald-200 border-l-4 border-l-emerald-500 text-emerald-950 hover:bg-emerald-100/70',
      dot: 'bg-emerald-600',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      label: '✓ Confirmada'
    };
  } else if (isAtendida) {
    themeStyles = {
      container: 'bg-teal-50/90 border border-teal-200 border-l-4 border-l-teal-600 text-teal-950 hover:bg-teal-100/70',
      dot: 'bg-teal-600',
      badge: 'bg-teal-100 text-teal-900 border-teal-300',
      label: '✓ Atendida'
    };
  } else if (isNoAsistio) {
    themeStyles = {
      container: 'bg-rose-50/90 border border-rose-200 border-l-4 border-l-rose-500 text-rose-950 hover:bg-rose-100/70',
      dot: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      label: '⚠️ No Asistió'
    };
  } else if (isCancelada) {
    themeStyles = {
      container: 'bg-slate-100/90 border border-slate-200 border-l-4 border-l-slate-400 text-slate-500 opacity-60 line-through',
      dot: 'bg-slate-400',
      badge: 'bg-slate-200 text-slate-600 border-slate-300',
      label: '✕ Cancelada'
    };
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectCita(cita);
      }}
      className={`w-full h-full p-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between ${themeStyles.container}`}
    >
      {/* LÍNEA 1: Rango Horario + Pastilla de Prestación + Selector de Estado Rápido */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
          <span className={`w-2 h-2 rounded-full shrink-0 ${themeStyles.dot}`} />
          <span className="text-[11px] font-mono font-bold tracking-tight text-ink-navy">
            {horaInicio} - {horaFin}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${modality.badgeClass}`}>
            {modality.label}
          </span>
        </div>

        {/* Dropdown de Estado Rápido en 1 Clic */}
        <select
          value={isAtendida ? 'asistio' : isNoAsistio ? 'no_asistio' : estado}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onCambiarEstado?.(cita, e.target.value);
          }}
          className="bg-white/95 border border-slate-300/80 hover:border-slate-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs shrink-0"
          title="Cambiar estado de la cita"
        >
          <option value="pendiente" className="bg-white text-amber-900 font-semibold">⏳ Pendiente</option>
          <option value="confirmada" className="bg-white text-emerald-900 font-semibold">✓ Confirmada</option>
          <option value="asistio" className="bg-white text-teal-900 font-semibold">✓ Atendida</option>
          <option value="no_asistio" className="bg-white text-rose-900 font-semibold">⚠️ No Asistió</option>
          <option value="cancelada" className="bg-white text-slate-600 font-semibold">✕ Cancelada</option>
        </select>
      </div>

      {/* LÍNEA 2: Nombre del Paciente en Negrita Legible */}
      <div className="my-0.5">
        <p
          className="font-bold text-xs text-ink-navy truncate line-clamp-1 leading-snug"
          title={pacienteNombre}
        >
          {pacienteNombre}
        </p>

        {/* LÍNEA 3: Previsión y Estado del Plan */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium mt-0.5">
          <span className="truncate">{prevision}</span>
          <span className="font-bold text-ink-navy shrink-0">{planInfo}</span>
        </div>
      </div>

      {/* LÍNEA 4: Acciones Rápidas (WhatsApp + Ficha →) */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5 gap-1">
        {cleanPhone ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white/90 hover:bg-white px-1.5 py-0.5 rounded shadow-2xs border border-emerald-200/80 transition-colors"
            title="Enviar mensaje de confirmación por WhatsApp"
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
          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-signal-blue hover:text-blue-900 bg-white/90 hover:bg-white px-2 py-0.5 rounded shadow-2xs border border-blue-200/80 transition-colors cursor-pointer ml-auto"
        >
          <span>Ficha</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
