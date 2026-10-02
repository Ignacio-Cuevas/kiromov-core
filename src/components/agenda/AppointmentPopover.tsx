'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MessageCircle,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Save,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { getResumenPlan } from '@/lib/clinical';

export interface AppointmentPopoverData {
  id: string;
  paciente_id?: string;
  fecha?: string;
  hora?: string;
  profesional?: string;
  estado?: string;
  motivo_consulta?: string;
  notas?: string | null;
  google_event_id?: string | null;
  pacientes?: any;
  paciente?: any;
  [key: string]: any;
}

interface AppointmentPopoverProps {
  cita: AppointmentPopoverData | null;
  isOpen: boolean;
  onClose: () => void;
  onCambiarEstado: (cita: AppointmentPopoverData, nuevoEstado: string) => void;
  onGuardarNota?: (citaId: string, nuevaNota: string) => Promise<void>;
  onIrAFicha: (pacienteId: string, pacienteObj: any, citaObj: AppointmentPopoverData) => void;
  onEditarHorario: (cita: AppointmentPopoverData) => void;
  onCancelarCita: (cita: AppointmentPopoverData) => void;
}

function formatearNombre(nombreCompleto?: string | null): string {
  if (!nombreCompleto) return 'Paciente sin registrar';
  const partes = String(nombreCompleto).trim().split(' ');
  return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function formatearFechaCompleta(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const partes = String(fechaStr).split('-');
  if (partes.length === 3) {
    const year = Number(partes[0]);
    const month = Number(partes[1]) - 1;
    const day = Number(partes[2]);
    const d = new Date(year, month, day);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${dias[d.getDay()]} ${String(day).padStart(2, '0')} de ${meses[month]} de ${year}`;
  }
  return String(fechaStr);
}

function calcularHoraFin(horaInicio?: string | null, duracionMinutos: number = 45): string {
  if (!horaInicio) return '09:45';
  const [hStr, mStr] = horaInicio.slice(0, 5).split(':');
  const h = Number(hStr) || 8;
  const m = Number(mStr) || 0;
  const totalM = h * 60 + m + duracionMinutos;
  const endH = Math.floor(totalM / 60);
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function AppointmentPopover({
  cita,
  isOpen,
  onClose,
  onCambiarEstado,
  onGuardarNota,
  onIrAFicha,
  onEditarHorario,
  onCancelarCita
}: AppointmentPopoverProps) {
  const [comentario, setComentario] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [notaGuardadaOk, setNotaGuardadaOk] = useState(false);

  useEffect(() => {
    if (cita) {
      setComentario(cita.notas || '');
      setNotaGuardadaOk(false);
    }
  }, [cita]);

  if (!isOpen || !cita) return null;

  const p = cita.paciente || cita.pacientes || {};
  const nombrePaciente = formatearNombre(p.nombre_completo || cita.motivo_consulta);
  const fechaTexto = formatearFechaCompleta(cita.fecha);
  const horaInicio = cita.hora?.slice(0, 5) || '09:00';
  const duracionMin = (cita.motivo_consulta || '').toLowerCase().includes('60 min') ? 60 : 45;
  const horaFin = calcularHoraFin(horaInicio, duracionMin);
  const profesionalNombre = cita.profesional || 'Klgo. Ignacio Cuevas Silva';

  const estado = String(cita.estado || 'pendiente').toLowerCase();
  const telefonoRaw = p.telefono || '';
  const cleanPhone = String(telefonoRaw).replace(/\D/g, '').slice(-9);

  // Mensaje de WhatsApp personalizado
  const primerNombre = nombrePaciente.split(' ')[0] || 'Estimado/a';
  const textoWhatsApp = `Hola ${primerNombre}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología programada para el ${cita.fecha ? cita.fecha.split('-').reverse().join('/') : ''} a las ${horaInicio} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;
  const whatsappUrl = cleanPhone ? `https://wa.me/56${cleanPhone}?text=${encodeURIComponent(textoWhatsApp)}` : '';

  const { tienePlan, sesionesUsadas, sesionesTotales, estadoPlanLabel } = getResumenPlan(p);
  const planInfo = tienePlan ? `${p.nombre_plan || 'Plan Kinésico'} (${sesionesUsadas}/${sesionesTotales} sesiones)` : 'Sin plan activo';

  const handleGuardarComentario = async () => {
    if (!onGuardarNota) return;
    setGuardandoNota(true);
    try {
      await onGuardarNota(cita.id, comentario);
      setNotaGuardadaOk(true);
      toast.success('Comentario interno actualizado');
      setTimeout(() => setNotaGuardadaOk(false), 2000);
    } catch (e) {
      toast.error('Error al guardar comentario');
    } finally {
      setGuardandoNota(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* CABECERA (Estilo Reservo / AgendaPro) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pr-8">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md mb-2">
              {cita.motivo_consulta || 'Atención Kinésica TMO'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {nombrePaciente}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{fechaTexto} • {horaInicio} a {horaFin} hrs</span>
            </p>
          </div>
        </div>

        {/* CUERPO DEL DETALLE */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Profesional Responsable */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Profesional Tratante
              </span>
              <p className="font-bold text-slate-900 text-xs">
                {profesionalNombre}
              </p>
            </div>
          </div>

          {/* Contacto: Teléfono con WhatsApp y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Teléfono y WhatsApp */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Teléfono de Contacto
              </span>
              <p className="font-mono text-xs font-bold text-slate-800">
                {cleanPhone ? `+56 9 ${cleanPhone.slice(-8)}` : 'Sin teléfono'}
              </p>
              {cleanPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs w-full justify-center"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hablar por WhatsApp</span>
                </a>
              )}
            </div>

            {/* Correo Electrónico */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Correo Electrónico
                </span>
                <p className="text-xs text-slate-700 font-medium truncate" title={p.email || 'Sin correo'}>
                  {p.email || 'No registrado'}
                </p>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Previsión:</span> {p.prevision || 'Particular'}
              </div>
            </div>
          </div>

          {/* Estado de Tratamiento y Plan */}
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                Cobertura / Plan
              </span>
              <p className="font-bold text-slate-800 mt-0.5">
                {planInfo}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
              {estadoPlanLabel}
            </span>
          </div>

          {/* Semáforo de Estado de Cita */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Estado de la Cita
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onCambiarEstado(cita, 'pendiente')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                  estado === 'pendiente'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs ring-2 ring-amber-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⏳</span> Pendiente
              </button>

              <button
                type="button"
                onClick={() => onCambiarEstado(cita, 'confirmada')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                  estado === 'confirmada'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>✓</span> Confirmada
              </button>

              <button
                type="button"
                onClick={() => onCambiarEstado(cita, 'asistio')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                  ['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)
                    ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-xs ring-2 ring-blue-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🩺</span> Atendida
              </button>

              <button
                type="button"
                onClick={() => onCambiarEstado(cita, 'cancelada')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                  estado === 'cancelada'
                    ? 'bg-rose-100 text-rose-900 border-rose-300 shadow-xs ring-2 ring-rose-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>✕</span> Cancelada
              </button>
            </div>
          </div>

          {/* Comentario Interno Editable */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Comentario Interno / Indicaciones</span>
              </label>
              {onGuardarNota && (
                <button
                  type="button"
                  onClick={handleGuardarComentario}
                  disabled={guardandoNota}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {notaGuardadaOk ? (
                    <span className="text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Guardado
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Save className="w-3 h-3" /> Guardar nota
                    </span>
                  )}
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe notas clínicas breves sobre la cita (ej: Paciente derivado de traumatología / rodilla izquierda)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-slate-800"
            />
          </div>
        </div>

        {/* ACCIONES INFERIORES */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Botón Ir a la Ficha */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onIrAFicha(p.id || cita.paciente_id || '', p, cita);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>📋 Ir a la Ficha del Paciente</span>
          </button>

          {/* Acciones de Edición y Cancelación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditarHorario(cita);
              }}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar Horario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelarCita(cita);
              }}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Cancelar Cita</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
