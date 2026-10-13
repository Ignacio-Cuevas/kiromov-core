'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { formatRut, formatCLP, getWhatsAppUrl } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  MessageCircle, 
  FileText, 
  CreditCard, 
  X, 
  CheckCircle2, 
  Clock4,
  XCircle,
  ExternalLink,
  User,
  Stethoscope,
  Pencil
} from 'lucide-react';

export interface AppointmentPopoverProps {
  cita: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  onCambiarEstado: (cita: any, nuevoEstado: string) => void;
  onAbrirFicha: (pacienteId: string, cita: any) => void;
  onCobrar: (cita: any) => void;
  onEditar?: (cita: any) => void;
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

function getPrevisionBadge(prev?: string | null) {
  const norm = (prev || '').toLowerCase();
  if (norm.includes('fonasa')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Fonasa</span>;
  }
  if (norm.includes('isapre')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Isapre</span>;
  }
  if (norm.includes('convenio')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Convenio</span>;
  }
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Particular</span>;
}

export function AppointmentPopover({
  cita,
  open,
  onOpenChange,
  children,
  onCambiarEstado,
  onAbrirFicha,
  onCobrar,
  onEditar
}: AppointmentPopoverProps) {
  if (!cita) return <>{children}</>;

  const p = cita.paciente || cita.pacientes || {};
  const pacienteId = cita.paciente_id || p.id;
  const nombrePaciente = p.nombre_completo || cita.motivo_consulta?.replace(/^Atención Kinésica - /i, '') || 'Paciente sin registrar';
  const horaInicio = cita.hora?.slice(0, 5) || '09:00';
  const duracionMin = (cita.motivo_consulta || '').toLowerCase().includes('60 min') ? 60 : 45;
  const horaFin = calcularHoraFin(horaInicio, duracionMin);
  const estado = String(cita.estado || 'pendiente').toLowerCase();
  
  const tienePlan = p.plan_id && (p.total_sesiones || 0) > 0;
  const debePago = p.estado_pago === 'pendiente' && (p.monto_clp || p.valor_total || 0) > 0;
  const deudaMonto = p.monto_clp || p.valor_total || 0;

  // Mensaje de confirmación WhatsApp
  const primerNombre = (p.nombre_completo || '').split(' ')[0] || 'Estimado/a';
  const fechaChile = cita.fecha ? cita.fecha.split('-').reverse().join('/') : '';
  const cleanPhone = (p.telefono || '').replace(/\D/g, '');
  const textoWhatsApp = `Hola ${primerNombre}, te escribimos de KIROMOV Centro Clínico para confirmar tu sesión de kinesiología agendada para el ${fechaChile} a las ${horaInicio} hrs (Bulnes 470, Of. 75, Chillán). Por favor respóndenos este mensaje para confirmar tu asistencia. ¡Muchas gracias!`;
  const whatsappUrl = cleanPhone ? `https://wa.me/56${cleanPhone.slice(-9)}?text=${encodeURIComponent(textoWhatsApp)}` : '';

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-84 max-w-[92vw] bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 focus:outline-none select-none text-slate-800"
        >
          {/* 1. Header: Nombre, Previsión y Cerrar */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="min-w-0 flex-1">
              <a
                href={pacienteId ? `/pacientes?id=${pacienteId}` : '#'}
                className="font-bold text-sm text-slate-900 leading-snug truncate block hover:text-emerald-700 hover:underline cursor-pointer"
                title={`${nombrePaciente} (clic para ver expediente)`}
              >
                {nombrePaciente}
              </a>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {p.rut ? formatRut(p.rut) : 'Sin RUT'}
                </span>
                {getPrevisionBadge(p.prevision || p.prevision_salud)}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onEditar && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onEditar(cita);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  aria-label="Editar cita"
                  title="Editar cita"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <Popover.Close
                type="button"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </Popover.Close>
            </div>
          </div>

          {/* 2. Detalle Horario y Motivo */}
          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-700 font-mono tabular-nums text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-slate-900">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {horaInicio} - {horaFin} hrs
              </span>
              <span className="text-slate-500 font-medium">📅 {fechaChile}</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium truncate pt-0.5" title={cita.motivo_consulta || 'Sesión Kinésica TMO'}>
              {cita.motivo_consulta || 'Sesión Kinésica TMO'}
            </p>
            {tienePlan && (
              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Plan: {p.nombre_plan || 'Kinésico'}</span>
                <span className="font-bold text-slate-700">{p.sesiones_usadas || 0}/{p.total_sesiones || 0} ses.</span>
              </div>
            )}
            {debePago && (
              <div className="text-[10px] font-mono tabular-nums text-rose-600 font-bold pt-0.5">
                🔴 Debe saldo pendiente: {formatCLP(deudaMonto)}
              </div>
            )}
          </div>

          {/* 3. Selector de Estado en 1 Toque (Píldoras interactivas) */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Cambiar Estado
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onCambiarEstado(cita, 'asistio');
                  onOpenChange(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  ['asistio', 'atendida', 'atendido'].includes(estado)
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>✓ Asistió</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCambiarEstado(cita, 'confirmada');
                  onOpenChange(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  estado === 'confirmada'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>Confirmada</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCambiarEstado(cita, 'pendiente');
                  onOpenChange(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  estado === 'pendiente'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock4 className="w-3.5 h-3.5" />
                <span>Pendiente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCambiarEstado(cita, 'cancelada');
                  onOpenChange(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  ['cancelada', 'no_asistio'].includes(estado)
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelada</span>
              </button>
            </div>
          </div>

          {/* 4. Acciones Directas */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onAbrirFicha(cita.paciente_id || p.id, cita);
              }}
              className="px-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              title="Abrir expediente clínico Medilink"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha</span>
            </button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 text-center"
                title="Hablar por WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <button
                disabled
                className="px-2 py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl flex items-center justify-center gap-1 opacity-60 cursor-not-allowed"
                title="Sin teléfono registrado"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Sin tel.</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onCobrar(cita);
              }}
              className="px-2 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Registrar cobro o checkout de la sesión"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Cobrar</span>
            </button>
          </div>

          <Popover.Arrow className="fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default AppointmentPopover;
