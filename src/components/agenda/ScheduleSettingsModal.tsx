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

export interface HorarioDia {
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
}

export type HorariosPorDia = {
  [diaId: number]: HorarioDia;
};

export interface ConfiguracionAgenda {
  id?: string;
  dias_activos: number[]; // 1 = Lunes, 2 = Martes, ..., 6 = Sábado, 0 = Domingo
  hora_apertura: string;
  hora_cierre: string;
  duracion_sesion_min: number;
  colacion_activa: boolean;
  colacion_inicio: string;
  colacion_fin: string;
  horarios_por_dia?: HorariosPorDia;
}

export const DEFAULT_HORARIOS_POR_DIA: HorariosPorDia = {
  1: { activo: true, hora_inicio: '09:00', hora_fin: '20:00' }, // Lunes
  2: { activo: true, hora_inicio: '09:00', hora_fin: '20:00' }, // Martes
  3: { activo: true, hora_inicio: '09:00', hora_fin: '20:00' }, // Miércoles
  4: { activo: true, hora_inicio: '09:00', hora_fin: '20:00' }, // Jueves
  5: { activo: true, hora_inicio: '09:00', hora_fin: '20:00' }, // Viernes
  6: { activo: true, hora_inicio: '09:00', hora_fin: '14:00' }, // Sábado
  0: { activo: false, hora_inicio: '09:00', hora_fin: '14:00' }, // Domingo
};

export const DEFAULT_CONFIG: ConfiguracionAgenda = {
  dias_activos: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
  hora_apertura: '09:00',
  hora_cierre: '20:00',
  duracion_sesion_min: 45,
  colacion_activa: true,
  colacion_inicio: '13:00',
  colacion_fin: '14:00',
  horarios_por_dia: DEFAULT_HORARIOS_POR_DIA,
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

const parseHorariosPorDia = (
  rawHorarios: any,
  diasActivos: number[],
  apertura: string,
  cierre: string
): HorariosPorDia => {
  const result: HorariosPorDia = { ...DEFAULT_HORARIOS_POR_DIA };

  if (rawHorarios && typeof rawHorarios === 'object') {
    DIAS_SEMANA.forEach((d) => {
      if (rawHorarios[d.id] || rawHorarios[String(d.id)]) {
        const item = rawHorarios[d.id] || rawHorarios[String(d.id)];
        result[d.id] = {
          activo: Boolean(item.activo),
          hora_inicio: item.hora_inicio || apertura || '09:00',
          hora_fin: item.hora_fin || cierre || '20:00',
        };
      } else {
        result[d.id] = {
          activo: diasActivos.includes(d.id),
          hora_inicio: apertura || '09:00',
          hora_fin: cierre || '20:00',
        };
      }
    });
  } else {
    DIAS_SEMANA.forEach((d) => {
      result[d.id] = {
        activo: diasActivos.includes(d.id),
        hora_inicio: apertura || '09:00',
        hora_fin: cierre || '20:00',
      };
    });
  }

  return result;
};

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
              const diasActivos = Array.isArray(data.dias_activos) ? data.dias_activos : DEFAULT_CONFIG.dias_activos;
              const apertura = data.hora_apertura || '09:00';
              const cierre = data.hora_cierre || '20:00';
              const horariosPorDia = parseHorariosPorDia(data.horarios_por_dia, diasActivos, apertura, cierre);

              setConfig({
                id: data.id,
                dias_activos: diasActivos,
                hora_apertura: apertura,
                hora_cierre: cierre,
                duracion_sesion_min: Number(data.duracion_sesion_min) || 45,
                colacion_activa: data.colacion_activa ?? true,
                colacion_inicio: data.colacion_inicio || '13:00',
                colacion_fin: data.colacion_fin || '14:00',
                horarios_por_dia: horariosPorDia,
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
            const parsed = JSON.parse(cached);
            const diasActivos = Array.isArray(parsed.dias_activos) ? parsed.dias_activos : DEFAULT_CONFIG.dias_activos;
            const apertura = parsed.hora_apertura || '09:00';
            const cierre = parsed.hora_cierre || '20:00';
            const horariosPorDia = parseHorariosPorDia(parsed.horarios_por_dia, diasActivos, apertura, cierre);

            setConfig({
              ...parsed,
              dias_activos: diasActivos,
              horarios_por_dia: horariosPorDia,
            });
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

  const handleToggleDia = (diaId: number) => {
    setConfig((prev) => {
      const current = prev.horarios_por_dia?.[diaId] || DEFAULT_HORARIOS_POR_DIA[diaId];
      const updatedHorarios: HorariosPorDia = {
        ...(prev.horarios_por_dia || DEFAULT_HORARIOS_POR_DIA),
        [diaId]: {
          ...current,
          activo: !current.activo,
        },
      };
      const newDiasActivos = DIAS_SEMANA.filter((d) => updatedHorarios[d.id]?.activo).map((d) => d.id);
      return {
        ...prev,
        dias_activos: newDiasActivos,
        horarios_por_dia: updatedHorarios,
      };
    });
  };

  const handleHoraDiaChange = (diaId: number, field: 'hora_inicio' | 'hora_fin', value: string) => {
    setConfig((prev) => {
      const current = prev.horarios_por_dia?.[diaId] || DEFAULT_HORARIOS_POR_DIA[diaId];
      const updatedHorarios: HorariosPorDia = {
        ...(prev.horarios_por_dia || DEFAULT_HORARIOS_POR_DIA),
        [diaId]: {
          ...current,
          [field]: value,
        },
      };
      return {
        ...prev,
        horarios_por_dia: updatedHorarios,
      };
    });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const activeDays = DIAS_SEMANA.filter((d) => config.horarios_por_dia?.[d.id]?.activo);

      if (activeDays.length === 0) {
        toast.error('Debes habilitar al menos un día de atención activo.');
        setSaving(false);
        return;
      }

      // Validar coherencia de horas por día
      for (const dia of activeDays) {
        const h = config.horarios_por_dia![dia.id];
        if (h.hora_inicio >= h.hora_fin) {
          toast.error(`En el día ${dia.label}, la hora de inicio (${h.hora_inicio}) debe ser anterior a la hora de fin (${h.hora_fin}).`);
          setSaving(false);
          return;
        }
      }

      // Calcular hora apertura más temprana y cierre más tardío para retrocompatibilidad
      const horasInicio = activeDays.map((d) => config.horarios_por_dia![d.id].hora_inicio).sort();
      const horasFin = activeDays.map((d) => config.horarios_por_dia![d.id].hora_fin).sort();
      const aperturaGeneral = horasInicio[0] || '09:00';
      const cierreGeneral = horasFin[horasFin.length - 1] || '20:00';
      const diasActivosIds = activeDays.map((d) => d.id);

      const payload = {
        dias_activos: diasActivosIds,
        hora_apertura: aperturaGeneral,
        hora_cierre: cierreGeneral,
        duracion_sesion_min: Number(config.duracion_sesion_min) || 45,
        colacion_activa: config.colacion_activa,
        colacion_inicio: config.colacion_inicio,
        colacion_fin: config.colacion_fin,
        horarios_por_dia: config.horarios_por_dia,
        updated_at: new Date().toISOString(),
      };

      // 1. Guardar en Supabase
      if (supabase) {
        try {
          if (config.id) {
            const { error: errUpdate } = await supabase.from('configuracion_agenda').update(payload).eq('id', config.id);
            if (errUpdate && errUpdate.message?.includes('horarios_por_dia')) {
              const { horarios_por_dia, ...fallbackPayload } = payload;
              await supabase.from('configuracion_agenda').update(fallbackPayload).eq('id', config.id);
            } else if (errUpdate) {
              throw errUpdate;
            }
          } else {
            const { data, error: errInsert } = await supabase.from('configuracion_agenda').insert([payload]).select().maybeSingle();
            if (errInsert && errInsert.message?.includes('horarios_por_dia')) {
              const { horarios_por_dia, ...fallbackPayload } = payload;
              const { data: dataFallback, error: errFallback } = await supabase.from('configuracion_agenda').insert([fallbackPayload]).select().maybeSingle();
              if (errFallback) throw errFallback;
              if (dataFallback?.id) setConfig((prev) => ({ ...prev, id: dataFallback.id }));
            } else if (errInsert) {
              throw errInsert;
            } else if (data?.id) {
              setConfig((prev) => ({ ...prev, id: data.id }));
            }
          }
        } catch (dbErr) {
          console.warn('Aviso guardando en configuracion_agenda:', dbErr);
        }
      }

      // 2. Guardar en localStorage
      try {
        localStorage.setItem('kiromov_configuracion_agenda', JSON.stringify({
          ...config,
          dias_activos: diasActivosIds,
          hora_apertura: aperturaGeneral,
          hora_cierre: cierreGeneral,
          horarios_por_dia: config.horarios_por_dia,
        }));
      } catch (lsErr) {
        console.warn('Error en localStorage:', lsErr);
      }

      toast.success('¡Horarios de atención de box día por día actualizados exitosamente!');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <DialogTitle>Configuración de Horarios de Box</DialogTitle>
            <DialogDescription>
              Define la jornada de trabajo habitual día por día, horarios de apertura/cierre y pausa de colación.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleGuardar} className="flex-1 flex flex-col min-h-0">
        <DialogBody className="space-y-5 px-6 py-5 overflow-y-auto max-h-[75vh]">
          {loading && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Cargando configuración...</span>
            </div>
          )}

          {/* Días y Horarios Independientes Día por Día */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Horarios de Atención Día por Día</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                {config.dias_activos.length} día(s) habilitado(s)
              </span>
            </div>

            <div className="space-y-2">
              {DIAS_SEMANA.map((dia) => {
                const hDia = config.horarios_por_dia?.[dia.id] || DEFAULT_HORARIOS_POR_DIA[dia.id];
                const activo = Boolean(hDia?.activo);

                return (
                  <div
                    key={dia.id}
                    className={`p-3 rounded-xl border transition-all ${
                      activo
                        ? 'bg-white border-blue-200 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200/80 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Toggle / Checkbox Día */}
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() => handleToggleDia(dia.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>

                        <div>
                          <span className={`text-xs font-bold ${activo ? 'text-slate-900' : 'text-slate-400'}`}>
                            {dia.label}
                          </span>
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {activo ? '✓ Activo' : 'Cerrado'}
                          </span>
                        </div>
                      </div>

                      {/* Selectores de Horario Inicio y Fin */}
                      {activo ? (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-slate-500">Inicio:</span>
                            <Input
                              type="time"
                              required
                              value={hDia.hora_inicio || '09:00'}
                              onChange={(e) => handleHoraDiaChange(dia.id, 'hora_inicio', e.target.value)}
                              className="w-24 h-8 px-2 py-1 text-xs font-mono font-bold bg-slate-50 rounded-lg"
                            />
                          </div>
                          <span className="text-slate-300">—</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-slate-500">Fin:</span>
                            <Input
                              type="time"
                              required
                              value={hDia.hora_fin || '20:00'}
                              onChange={(e) => handleHoraDiaChange(dia.id, 'hora_fin', e.target.value)}
                              className="w-24 h-8 px-2 py-1 text-xs font-mono font-bold bg-slate-50 rounded-lg"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Día no laboral / Cerrado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
