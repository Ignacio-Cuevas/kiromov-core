'use client';

import React, { useState, useEffect } from 'react';
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
import { getChileanDate } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Lock, 
  Palmtree, 
  Utensils, 
  Users, 
  Clock, 
  Calendar, 
  Trash2, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface BloqueoAgenda {
  id: string;
  titulo: string;
  tipo: 'vacaciones' | 'reunion' | 'almuerzo' | 'permiso' | 'otro';
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  dia_completo?: boolean;
  google_event_id?: string | null;
  motivo?: string | null;
  created_at?: string;
}

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  bloqueosExistentes?: BloqueoAgenda[];
}

export function BlockTimeModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  bloqueosExistentes = [],
}: BlockTimeModalProps) {
  const supabase = createClient();

  const [tipo, setTipo] = useState<'vacaciones' | 'reunion' | 'almuerzo' | 'permiso' | 'otro'>('almuerzo');
  const [titulo, setTitulo] = useState('Almuerzo / Colación');
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(initialDate || getChileanDate());
  const [fechaFin, setFechaFin] = useState(initialDate || getChileanDate());
  const [horaInicio, setHoraInicio] = useState('13:00');
  const [horaFin, setHoraFin] = useState('14:00');
  const [syncGoogle, setSyncGoogle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ajustar título por defecto al cambiar el tipo
  const handleTipoChange = (nuevoTipo: 'vacaciones' | 'reunion' | 'almuerzo' | 'permiso' | 'otro') => {
    setTipo(nuevoTipo);
    if (nuevoTipo === 'vacaciones') {
      setTitulo('Vacaciones');
      setDiaCompleto(true);
    } else if (nuevoTipo === 'almuerzo') {
      setTitulo('Almuerzo / Colación');
      setDiaCompleto(false);
      setHoraInicio('13:00');
      setHoraFin('14:00');
    } else if (nuevoTipo === 'reunion') {
      setTitulo('Reunión Clínica');
      setDiaCompleto(false);
      setHoraInicio('14:00');
      setHoraFin('15:00');
    } else if (nuevoTipo === 'permiso') {
      setTitulo('Permiso Personal');
      setDiaCompleto(false);
    } else {
      setTitulo('Horario Bloqueado');
    }
  };

  const handleGuardarBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Por favor ingresa un motivo para el bloqueo');
      return;
    }

    setSaving(true);
    try {
      let googleEventId: string | null = null;

      // 1. Sincronizar hacia Google Calendar si está habilitado
      if (syncGoogle) {
        try {
          const { crearEventoGoogleCalendar } = await import('@/actions/calendar');
          googleEventId = await crearEventoGoogleCalendar({
            pacienteNombre: `🔒 BLOQUEO: ${titulo.trim()}`,
            pacienteTelefono: null,
            fecha: fechaInicio,
            hora: diaCompleto ? '08:00' : horaInicio,
            motivo: `Bloqueo de agenda clínica (${tipo}): ${titulo.trim()}`
          });
        } catch (syncErr) {
          console.warn('Advertencia creando bloqueo en Google Calendar:', syncErr);
        }
      }

      const nuevoBloqueo: BloqueoAgenda = {
        id: 'blk-' + Date.now(),
        titulo: titulo.trim(),
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: diaCompleto ? fechaFin : fechaInicio,
        hora_inicio: diaCompleto ? null : horaInicio,
        hora_fin: diaCompleto ? null : horaFin,
        dia_completo: diaCompleto,
        google_event_id: googleEventId,
        created_at: new Date().toISOString(),
      };

      // 2. Intentar guardar en Supabase (public.bloqueos_agenda)
      let savedInDb = false;
      if (supabase) {
        try {
          const { error } = await supabase.from('bloqueos_agenda').insert([nuevoBloqueo]);
          if (!error) {
            savedInDb = true;
          } else {
            console.warn('Aviso: bloqueos_agenda en Supabase no respondió, usando persistencia local:', error.message);
          }
        } catch (dbErr) {
          console.warn('Excepción guardando en bloqueos_agenda:', dbErr);
        }
      }

      // Persistencia en localStorage como respaldo seguro
      try {
        const guardados = JSON.parse(localStorage.getItem('kiromov_bloqueos_agenda') || '[]');
        guardados.push(nuevoBloqueo);
        localStorage.setItem('kiromov_bloqueos_agenda', JSON.stringify(guardados));
      } catch (lsErr) {
        console.warn('Error en localStorage:', lsErr);
      }

      toast.success('¡Horario bloqueado con éxito!', {
        description: diaCompleto
          ? `${titulo} (Todo el día: ${fechaInicio} al ${fechaFin})`
          : `${titulo} (${fechaInicio} de ${horaInicio} a ${horaFin} hrs)`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar bloqueo:', err);
      toast.error(`Error: ${err.message || 'No se pudo guardar el bloqueo'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDesbloquear = async (bloqueo: BloqueoAgenda) => {
    if (!window.confirm(`¿Deseas desbloquear este horario: "${bloqueo.titulo}"?`)) return;

    setDeletingId(bloqueo.id);
    try {
      // 1. Eliminar de Google Calendar si tiene ID
      if (bloqueo.google_event_id) {
        try {
          await fetch('/api/calendar/delete-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: bloqueo.google_event_id })
          }).catch(console.warn);
        } catch (calErr) {
          console.warn('Error eliminando de Google Calendar:', calErr);
        }
      }

      // 2. Eliminar de Supabase
      if (supabase) {
        try {
          await supabase.from('bloqueos_agenda').delete().eq('id', bloqueo.id);
        } catch (dbErr) {
          console.warn('Aviso al eliminar de bloqueos_agenda:', dbErr);
        }
      }

      // 3. Eliminar de localStorage
      try {
        const guardados = JSON.parse(localStorage.getItem('kiromov_bloqueos_agenda') || '[]');
        const filtrados = guardados.filter((b: BloqueoAgenda) => b.id !== bloqueo.id);
        localStorage.setItem('kiromov_bloqueos_agenda', JSON.stringify(filtrados));
      } catch (lsErr) {
        console.warn('Error actualizando localStorage:', lsErr);
      }

      toast.success('Horario desbloqueado correctamente');
      onSuccess();
    } catch (err: any) {
      toast.error('Error al desbloquear horario: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <DialogTitle>Bloquear Horario o Días en Agenda</DialogTitle>
            <DialogDescription>
              Impide reservas web y previene agendamientos en horas de colación, reuniones o vacaciones.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleGuardarBloqueo} className="flex-1 flex flex-col min-h-0">
        <DialogBody className="space-y-4 px-6 py-5 overflow-y-auto">
          
          {/* Selector de Tipo de Bloqueo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tipo de Bloqueo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleTipoChange('almuerzo')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  tipo === 'almuerzo'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Utensils className="w-4 h-4 text-amber-600" />
                <span>Colación</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('vacaciones')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  tipo === 'vacaciones'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Palmtree className="w-4 h-4 text-emerald-600" />
                <span>Vacaciones</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('reunion')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  tipo === 'reunion'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Reunión</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('permiso')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  tipo === 'permiso'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Permiso</span>
              </button>
            </div>
          </div>

          {/* Motivo o Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Motivo o Título del Bloqueo *
            </label>
            <Input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Almuerzo, Vacaciones de Verano, Reunión Médica..."
              className="bg-white rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>

          {/* Toggle: Todo el día o rango de horas */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">
                Bloquear día completo (o rango de días)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={diaCompleto}
                onChange={(e) => setDiaCompleto(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Fechas y Horas */}
          {diaCompleto ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fecha Desde</label>
                <Input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    if (e.target.value > fechaFin) setFechaFin(e.target.value);
                  }}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fecha Hasta (Inclusive)</label>
                <Input
                  type="date"
                  required
                  min={fechaInicio}
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fecha</label>
                <Input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setFechaFin(e.target.value);
                  }}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Hora Inicio</label>
                <Input
                  type="time"
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="bg-white rounded-xl text-sm font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Hora Fin</label>
                <Input
                  type="time"
                  required
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="bg-white rounded-xl text-sm font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Sincronización Google Calendar */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="syncGoogle"
              checked={syncGoogle}
              onChange={(e) => setSyncGoogle(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="syncGoogle" className="text-xs text-slate-600 cursor-pointer select-none">
              Sincronizar bloqueo a Google Calendar como horario ocupado
            </label>
          </div>

          {/* Bloqueos Activos / Gestión */}
          {bloqueosExistentes.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Bloqueos Activos ({bloqueosExistentes.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {bloqueosExistentes.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">
                        🔒 {b.titulo}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {b.dia_completo
                          ? `${b.fecha_inicio} al ${b.fecha_fin}`
                          : `${b.fecha_inicio} (${b.hora_inicio || '09:00'} - ${b.hora_fin || '10:00'})`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDesbloquear(b)}
                      disabled={deletingId === b.id}
                      className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Desbloquear este horario"
                    >
                      {deletingId === b.id ? 'Liberando...' : 'Desbloquear'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </DialogBody>

        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold h-9 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Bloqueando...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Bloquear Horario</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default BlockTimeModal;
