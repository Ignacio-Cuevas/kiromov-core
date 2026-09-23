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
import { toast } from 'sonner';
import { 
  Settings, 
  Clock, 
  Calendar, 
  Save, 
  Loader2,
  CheckCircle2,
  Utensils
} from 'lucide-react';

export interface ConfiguracionAgenda {
  id?: string;
  dias_activos: number[]; // 1 = Lunes, 2 = Martes, ..., 6 = Sábado, 0 = Domingo
  hora_apertura: string;
  hora_cierre: string;
  duracion_sesion_min: number;
  colacion_activa: boolean;
  colacion_inicio: string;
  colacion_fin: string;
}

const DEFAULT_CONFIG: ConfiguracionAgenda = {
  dias_activos: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
  hora_apertura: '09:00',
  hora_cierre: '20:00',
  duracion_sesion_min: 45,
  colacion_activa: true,
  colacion_inicio: '13:00',
  colacion_fin: '14:00',
};

const DIAS_SEMANA = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

interface ScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ScheduleSettingsModal({
  isOpen,
  onClose,
  onSuccess,
}: ScheduleSettingsModalProps) {
  const supabase = createClient();

  const [config, setConfig] = useState<ConfiguracionAgenda>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar configuración existente
  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      setLoading(true);
      try {
        let loaded = false;
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('configuracion_agenda')
              .select('*')
              .limit(1)
              .maybeSingle();

            if (!error && data) {
              setConfig({
                id: data.id,
                dias_activos: Array.isArray(data.dias_activos) ? data.dias_activos : DEFAULT_CONFIG.dias_activos,
                hora_apertura: data.hora_apertura || '09:00',
                hora_cierre: data.hora_cierre || '20:00',
                duracion_sesion_min: Number(data.duracion_sesion_min) || 45,
                colacion_activa: data.colacion_activa ?? true,
                colacion_inicio: data.colacion_inicio || '13:00',
                colacion_fin: data.colacion_fin || '14:00',
              });
              loaded = true;
            }
          } catch (errDb) {
            console.warn('Aviso cargando configuracion_agenda desde base de datos:', errDb);
          }
        }

        if (!loaded) {
          const cached = localStorage.getItem('kiromov_configuracion_agenda');
          if (cached) {
            setConfig(JSON.parse(cached));
          }
        }
      } catch (err) {
        console.warn('Error leyendo configuración:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [isOpen]);

  const toggleDia = (diaId: number) => {
    setConfig((prev) => {
      const exists = prev.dias_activos.includes(diaId);
      const next = exists
        ? prev.dias_activos.filter((d) => d !== diaId)
        : [...prev.dias_activos, diaId].sort();
      return { ...prev, dias_activos: next };
    });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (config.dias_activos.length === 0) {
        toast.error('Debes seleccionar al menos un día de atención activo.');
        setSaving(false);
        return;
      }

      if (config.hora_apertura >= config.hora_cierre) {
        toast.error('La hora de apertura debe ser anterior a la hora de cierre.');
        setSaving(false);
        return;
      }

      // 1. Guardar en Supabase
      if (supabase) {
        try {
          const payload = {
            dias_activos: config.dias_activos,
            hora_apertura: config.hora_apertura,
            hora_cierre: config.hora_cierre,
            duracion_sesion_min: Number(config.duracion_sesion_min) || 45,
            colacion_activa: config.colacion_activa,
            colacion_inicio: config.colacion_inicio,
            colacion_fin: config.colacion_fin,
            updated_at: new Date().toISOString(),
          };

          if (config.id) {
            await supabase.from('configuracion_agenda').update(payload).eq('id', config.id);
          } else {
            const { data } = await supabase.from('configuracion_agenda').insert([payload]).select().maybeSingle();
            if (data?.id) setConfig((prev) => ({ ...prev, id: data.id }));
          }
        } catch (dbErr) {
          console.warn('Aviso guardando en configuracion_agenda:', dbErr);
        }
      }

      // 2. Guardar en localStorage
      try {
        localStorage.setItem('kiromov_configuracion_agenda', JSON.stringify(config));
      } catch (lsErr) {
        console.warn('Error en localStorage:', lsErr);
      }

      toast.success('¡Horarios de atención de box actualizados exitosamente!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(`Error al guardar configuración: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <DialogTitle>Configuración de Horarios de Box</DialogTitle>
            <DialogDescription>
              Define la jornada de trabajo habitual, días de atención y pausa de colación.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleGuardar} className="flex-1 flex flex-col min-h-0">
        <DialogBody className="space-y-4 px-6 py-5 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Cargando configuración...</span>
            </div>
          )}

          {/* Días Activos de la Semana */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Días de Atención en Box</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIAS_SEMANA.map((dia) => {
                const activo = config.dias_activos.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => toggleDia(dia.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      activo
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span>{dia.label}</span>
                    <span className={`w-2 h-2 rounded-full ${activo ? 'bg-blue-600' : 'bg-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apertura y Cierre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Hora Apertura Box
              </label>
              <Input
                type="time"
                required
                value={config.hora_apertura}
                onChange={(e) => setConfig({ ...config, hora_apertura: e.target.value })}
                className="bg-white rounded-xl text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                Hora Cierre Box
              </label>
              <Input
                type="time"
                required
                value={config.hora_cierre}
                onChange={(e) => setConfig({ ...config, hora_cierre: e.target.value })}
                className="bg-white rounded-xl text-sm font-mono font-bold"
              />
            </div>
          </div>

          {/* Pausa de Colación / Almuerzo Habitual */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-700">
                  Pausa de Colación / Almuerzo Habitual
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.colacion_activa}
                  onChange={(e) => setConfig({ ...config, colacion_activa: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {config.colacion_activa && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Inicio Colación</label>
                  <Input
                    type="time"
                    value={config.colacion_inicio}
                    onChange={(e) => setConfig({ ...config, colacion_inicio: e.target.value })}
                    className="bg-white rounded-xl text-xs font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Fin Colación</label>
                  <Input
                    type="time"
                    value={config.colacion_fin}
                    onChange={(e) => setConfig({ ...config, colacion_fin: e.target.value })}
                    className="bg-white rounded-xl text-xs font-mono font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Duración sugerida de sesión */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Duración Predeterminada de Sesión TMO
            </label>
            <select
              value={config.duracion_sesion_min}
              onChange={(e) => setConfig({ ...config, duracion_sesion_min: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos (Estándar Kiromov)</option>
              <option value={60}>60 minutos (1 hora)</option>
              <option value={90}>90 minutos</option>
            </select>
          </div>

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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar Horarios</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default ScheduleSettingsModal;
