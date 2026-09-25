'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  Utensils,
  Calendar,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  SunMedium,
  MoonStar,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SemanaHorariosBox,
  HorarioDiaBox,
  DIAS_ORDENADOS,
  DEFAULT_SEMANA_HORARIOS
} from '@/lib/availability';

interface BoxScheduleViewProps {
  onBackToAgenda?: () => void;
  onSavedSuccess?: () => void;
}

export function BoxScheduleView({ onBackToAgenda, onSavedSuccess }: BoxScheduleViewProps) {
  const supabase = createClient();

  const [semana, setSemana] = useState<SemanaHorariosBox>(DEFAULT_SEMANA_HORARIOS);
  const [duracionGlobal, setDuracionGlobal] = useState<number>(45);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar configuración existente desde Supabase con fallback a localStorage
  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        let loaded = false;

        if (supabase) {
          // 1. Intentar cargar desde configuracion_horarios_box
          try {
            const { data: boxData, error: errBox } = await supabase
              .from('configuracion_horarios_box')
              .select('*')
              .order('dia_semana', { ascending: true });

            if (!errBox && boxData && boxData.length > 0) {
              const nuevaSemana: SemanaHorariosBox = { ...DEFAULT_SEMANA_HORARIOS };
              let duracionDetectada = 45;

              boxData.forEach((row: any) => {
                const diaId = Number(row.dia_semana);
                const nombre = DIAS_ORDENADOS.find((d) => d.id === diaId)?.label || `Día ${diaId}`;
                duracionDetectada = Number(row.duracion_bloque_min) || duracionDetectada;

                const mananaActiva =
                  row.manana_activa !== undefined && row.manana_activa !== null
                    ? Boolean(row.manana_activa)
                    : true;

                const tardeActiva =
                  row.tarde_activa !== undefined && row.tarde_activa !== null
                    ? Boolean(row.tarde_activa)
                    : (row.tarde_fin || '') > (row.tarde_inicio || '');

                nuevaSemana[diaId] = {
                  dia_semana: diaId,
                  nombre,
                  activo: Boolean(row.activo),
                  manana_activa: mananaActiva,
                  manana_inicio: (row.manana_inicio || '09:00').slice(0, 5),
                  manana_fin: (row.manana_fin || '13:00').slice(0, 5),
                  colacion_activa: Boolean(row.colacion_activa),
                  colacion_inicio: (row.colacion_inicio || '13:00').slice(0, 5),
                  colacion_fin: (row.colacion_fin || '14:00').slice(0, 5),
                  tarde_activa: tardeActiva,
                  tarde_inicio: (row.tarde_inicio || '14:00').slice(0, 5),
                  tarde_fin: (row.tarde_fin || '20:00').slice(0, 5),
                  duracion_bloque_min: duracionDetectada,
                };
              });

              setSemana(nuevaSemana);
              setDuracionGlobal(duracionDetectada);
              loaded = true;
            }
          } catch (e) {
            console.info('Aviso al consultar configuracion_horarios_box:', e);
          }

          // 2. Si no se cargó, intentar desde configuracion_agenda
          if (!loaded) {
            try {
              const { data: agendaData, error: errAgenda } = await supabase
                .from('configuracion_agenda')
                .select('*')
                .limit(1)
                .maybeSingle();

              if (!errAgenda && agendaData) {
                const dur = Number(agendaData.duracion_sesion_min) || 45;
                setDuracionGlobal(dur);

                const rawPorDia = agendaData.horarios_por_dia;
                const diasActivos = Array.isArray(agendaData.dias_activos) ? agendaData.dias_activos : [1, 3, 4, 5, 6];
                const apertura = (agendaData.hora_apertura || '09:00').slice(0, 5);
                const cierre = (agendaData.hora_cierre || '20:00').slice(0, 5);

                const nuevaSemana: SemanaHorariosBox = { ...DEFAULT_SEMANA_HORARIOS };

                DIAS_ORDENADOS.forEach((d) => {
                  const item = rawPorDia?.[d.id] || rawPorDia?.[String(d.id)];
                  if (item) {
                    nuevaSemana[d.id] = {
                      ...nuevaSemana[d.id],
                      activo: Boolean(item.activo),
                      manana_activa: true,
                      manana_inicio: (item.hora_inicio || apertura).slice(0, 5),
                      manana_fin: '13:00',
                      colacion_activa: agendaData.colacion_activa ?? true,
                      colacion_inicio: (agendaData.colacion_inicio || '13:00').slice(0, 5),
                      colacion_fin: (agendaData.colacion_fin || '14:00').slice(0, 5),
                      tarde_activa: true,
                      tarde_inicio: (agendaData.colacion_fin || '14:00').slice(0, 5),
                      tarde_fin: (item.hora_fin || cierre).slice(0, 5),
                      duracion_bloque_min: dur,
                    };
                  } else {
                    nuevaSemana[d.id] = {
                      ...nuevaSemana[d.id],
                      activo: diasActivos.includes(d.id),
                    };
                  }
                });

                setSemana(nuevaSemana);
                loaded = true;
              }
            } catch (e) {
              console.info('Aviso al consultar configuracion_agenda:', e);
            }
          }
        }

        // 3. Fallback a localStorage
        if (!loaded) {
          const cached = localStorage.getItem('kiromov_horarios_box');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setSemana(parsed.semana || DEFAULT_SEMANA_HORARIOS);
              if (parsed.duracionGlobal) setDuracionGlobal(parsed.duracionGlobal);
              loaded = true;
            } catch (errParse) {
              console.warn('Error parseando localStorage horarios:', errParse);
            }
          }
        }
      } catch (err) {
        console.warn('Error general cargando disponibilidad:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [supabase]);

  // Actualizar campo de un día
  const handleUpdateDia = (diaId: number, changes: Partial<HorarioDiaBox>) => {
    setSemana((prev) => ({
      ...prev,
      [diaId]: {
        ...prev[diaId],
        ...changes,
      },
    }));
  };

  // Alternar estado activo del día
  const handleToggleActivo = (diaId: number) => {
    setSemana((prev) => ({
      ...prev,
      [diaId]: {
        ...prev[diaId],
        activo: !prev[diaId].activo,
      },
    }));
  };

  // Restablecer a plantilla habitual
  const handleResetDefaults = () => {
    if (confirm('¿Restablecer la configuración a los horarios habituales de Kiromov (Lunes a Viernes 09:00-20:00, Sábados AM 10:00-14:00)?')) {
      setSemana(DEFAULT_SEMANA_HORARIOS);
      setDuracionGlobal(45);
      toast.info('Valores restablecidos a la plantilla base. Haz clic en Guardar para confirmar.');
    }
  };

  // Guardar configuración en Supabase y localStorage
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const activeDays = Object.values(semana).filter((d) => d.activo);

      if (activeDays.length === 0) {
        toast.error('Debes mantener al menos un día de atención activo.');
        setSaving(false);
        return;
      }

      // Validar coherencia de rangos por día
      for (const d of activeDays) {
        if (!d.manana_activa && !d.tarde_activa) {
          toast.error(`En ${d.nombre}, debes activar al menos un turno (Mañana o Tarde) o marcar el día como cerrado.`);
          setSaving(false);
          return;
        }

        if (d.manana_activa && d.manana_inicio >= d.manana_fin) {
          toast.error(`En ${d.nombre}, la hora de inicio de mañana (${d.manana_inicio}) debe ser menor que la de fin (${d.manana_fin}).`);
          setSaving(false);
          return;
        }

        if (d.tarde_activa && d.tarde_inicio >= d.tarde_fin) {
          toast.error(`En ${d.nombre}, la hora de inicio de tarde (${d.tarde_inicio}) debe ser menor que la de cierre (${d.tarde_fin}).`);
          setSaving(false);
          return;
        }

        if (d.manana_activa && d.tarde_activa) {
          if (d.tarde_inicio < d.manana_fin) {
            toast.error(`En ${d.nombre}, el turno de la tarde no puede comenzar antes de que finalice la mañana.`);
            setSaving(false);
            return;
          }

          if (d.colacion_activa) {
            if (d.colacion_inicio < d.manana_inicio || d.colacion_fin <= d.colacion_inicio) {
              toast.error(`En ${d.nombre}, revisa el rango de colación (${d.colacion_inicio} - ${d.colacion_fin}).`);
              setSaving(false);
              return;
            }
          }
        }
      }

      // 1. Guardar en configuracion_horarios_box
      if (supabase) {
        try {
          const rowsToUpsert = Object.values(semana).map((d) => ({
            dia_semana: d.dia_semana,
            activo: d.activo,
            manana_activa: d.manana_activa,
            manana_inicio: d.manana_inicio,
            manana_fin: d.manana_fin,
            colacion_activa: d.manana_activa && d.tarde_activa ? d.colacion_activa : false,
            colacion_inicio: d.colacion_inicio,
            colacion_fin: d.colacion_fin,
            tarde_activa: d.tarde_activa,
            tarde_inicio: d.tarde_inicio,
            tarde_fin: d.tarde_fin,
            duracion_bloque_min: duracionGlobal,
            updated_at: new Date().toISOString(),
          }));

          const { error: errUpsert } = await supabase
            .from('configuracion_horarios_box')
            .upsert(rowsToUpsert, { onConflict: 'dia_semana' });

          if (errUpsert) {
            console.warn('Nota: configuracion_horarios_box upsert fallback:', errUpsert.message);
          }
        } catch (dbErr) {
          console.warn('Excepción guardando en configuracion_horarios_box:', dbErr);
        }

        // 2. Sincronizar en configuracion_agenda para compatibilidad de vistas
        try {
          const diasActivosIds = activeDays.map((d) => d.dia_semana);
          const earliest = activeDays
            .map((d) => (d.manana_activa ? d.manana_inicio : d.tarde_inicio))
            .sort()[0] || '09:00';
          const latest = activeDays
            .map((d) => (d.tarde_activa && d.tarde_fin > d.tarde_inicio ? d.tarde_fin : d.manana_fin))
            .sort()
            .slice(-1)[0] || '20:00';

          const horariosPorDiaComp: Record<number, { activo: boolean; hora_inicio: string; hora_fin: string }> = {};
          Object.values(semana).forEach((d) => {
            horariosPorDiaComp[d.dia_semana] = {
              activo: d.activo && (d.manana_activa || d.tarde_activa),
              hora_inicio: d.manana_activa ? d.manana_inicio : d.tarde_inicio,
              hora_fin: d.tarde_activa && d.tarde_fin > d.tarde_inicio ? d.tarde_fin : d.manana_fin,
            };
          });

          const agendaPayload = {
            dias_activos: diasActivosIds,
            hora_apertura: earliest,
            hora_cierre: latest,
            duracion_sesion_min: duracionGlobal,
            colacion_activa: activeDays.some((d) => d.colacion_activa && d.manana_activa && d.tarde_activa),
            colacion_inicio: '13:00',
            colacion_fin: '14:00',
            horarios_por_dia: horariosPorDiaComp,
            updated_at: new Date().toISOString(),
          };

          const { data: existingConf } = await supabase
            .from('configuracion_agenda')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (existingConf?.id) {
            await supabase.from('configuracion_agenda').update(agendaPayload).eq('id', existingConf.id);
          } else {
            await supabase.from('configuracion_agenda').insert([agendaPayload]);
          }
        } catch (eAgenda) {
          console.warn('Excepción sincronizando configuracion_agenda:', eAgenda);
        }
      }

      // 3. Persistir en localStorage (garantía local inmediata)
      localStorage.setItem(
        'kiromov_horarios_box',
        JSON.stringify({ semana, duracionGlobal, updatedAt: new Date().toISOString() })
      );
      localStorage.setItem(
        'kiromov_configuracion_agenda',
        JSON.stringify({
          dias_activos: activeDays.map((d) => d.dia_semana),
          duracion_sesion_min: duracionGlobal,
          horarios_por_dia: Object.fromEntries(
            Object.values(semana).map((d) => [
              d.dia_semana,
              {
                activo: d.activo && (d.manana_activa || d.tarde_activa),
                hora_inicio: d.manana_activa ? d.manana_inicio : d.tarde_inicio,
                hora_fin: d.tarde_activa && d.tarde_fin > d.tarde_inicio ? d.tarde_fin : d.manana_fin,
              },
            ])
          ),
        })
      );

      toast.success('¡Horarios de Box guardados exitosamente!', {
        description: 'La grilla horaria semanal ahora refleja tus turnos AM y PM independientes.',
      });

      if (onSavedSuccess) onSavedSuccess();
    } catch (err: any) {
      console.error('Error guardando disponibilidad:', err);
      toast.error('Error al guardar horarios: ' + (err.message || 'Inténtalo nuevamente.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-signal-blue" />
        <p className="text-sm font-medium">Cargando disponibilidad y horarios de box...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Barra Superior con Navegación y Acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          {onBackToAgenda && (
            <button
              onClick={onBackToAgenda}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-signal-blue transition-colors mb-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Agenda
            </button>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-ink-navy flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-signal-blue" />
            Configuración de Horarios de Box
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Activa o bloquea turnos de Mañana (AM) y Tarde (PM) de forma independiente por día.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefaults}
            className="text-xs border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer"
            title="Restablecer a plantilla recomendada"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Plantilla Base
          </Button>

          <Button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="bg-signal-blue hover:bg-deep-cobalt text-white font-bold text-xs sm:text-sm rounded-xl px-5 shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Horarios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Selector Global de Duración de Bloque */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-5 rounded-2xl border border-blue-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-signal-blue" />
            <h3 className="text-sm font-bold text-ink-navy">Duración de Bloque Predeterminada</h3>
          </div>
          <p className="text-xs text-slate-500">
            Tiempo estándar asignado para cada bloque de sesión en la grilla y en el agendamiento rápido.
          </p>
        </div>

        <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setDuracionGlobal(45)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              duracionGlobal === 45
                ? 'bg-signal-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-navy'
            }`}
          >
            ⏱️ 45 Minutos (TMO Estándar)
          </button>
          <button
            type="button"
            onClick={() => setDuracionGlobal(60)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              duracionGlobal === 60
                ? 'bg-signal-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-navy'
            }`}
          >
            ⏱️ 60 Minutos (Evaluación Completa)
          </button>
        </div>
      </div>

      {/* Lista de Días de la Semana */}
      <div className="space-y-4">
        {DIAS_ORDENADOS.map(({ id: diaId, label: diaNombre }) => {
          const dia = semana[diaId] || DEFAULT_SEMANA_HORARIOS[diaId];
          const mananaActiva = dia.manana_activa ?? true;
          const tardeActiva = dia.tarde_activa ?? (dia.tarde_fin > dia.tarde_inicio);
          const ambosTurnosActivos = mananaActiva && tardeActiva;

          return (
            <div
              key={diaId}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                dia.activo
                  ? 'bg-white border-slate-200/90 shadow-xs hover:border-blue-200'
                  : 'bg-slate-50/70 border-dashed border-slate-200 opacity-80'
              }`}
            >
              {/* Fila del Día */}
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Columna Izquierda: Nombre de Día y Switch General */}
                <div className="flex items-center gap-3.5 min-w-[210px]">
                  <button
                    type="button"
                    onClick={() => handleToggleActivo(diaId)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      dia.activo ? 'bg-signal-blue' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        dia.activo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <div>
                    <h4 className="text-base font-bold text-ink-navy flex items-center gap-2">
                      {diaNombre}
                      {dia.activo ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ambosTurnosActivos ? 'Día Completo' : mananaActiva ? 'Sólo AM' : tardeActiva ? 'Sólo PM' : 'Sin Turnos'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Cerrado
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {(() => {
                        if (!dia.activo) return 'No se reciben pacientes este día';
                        if (ambosTurnosActivos) {
                          return `AM (${dia.manana_inicio}-${dia.manana_fin}) • PM (${dia.tarde_inicio}-${dia.tarde_fin})`;
                        }
                        if (mananaActiva) {
                          return `Sólo Mañana: ${dia.manana_inicio} a ${dia.manana_fin} hrs`;
                        }
                        if (tardeActiva) {
                          return `Sólo Tarde: ${dia.tarde_inicio} a ${dia.tarde_fin} hrs`;
                        }
                        return 'Sin turnos habilitados';
                      })()}
                    </p>
                  </div>
                </div>

                {/* Columna Derecha: Configuración de Turnos Independientes */}
                {dia.activo ? (
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Turno Mañana (AM) */}
                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        mananaActiva
                          ? 'bg-slate-50/80 border-slate-200/80 shadow-2xs'
                          : 'bg-slate-100/50 border-dashed border-slate-300 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <SunMedium className={`w-3.5 h-3.5 ${mananaActiva ? 'text-amber-500' : 'text-slate-400'}`} />
                          <span>Turno Mañana (AM)</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mananaActiva}
                            onChange={(e) => handleUpdateDia(diaId, { manana_activa: e.target.checked })}
                            className="rounded border-slate-300 text-signal-blue focus:ring-signal-blue cursor-pointer"
                          />
                          <span className={`font-bold ${mananaActiva ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {mananaActiva ? 'Habilitado' : 'Bloqueado'}
                          </span>
                        </label>
                      </div>

                      {mananaActiva ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Inicio</label>
                            <input
                              type="time"
                              value={dia.manana_inicio}
                              onChange={(e) => handleUpdateDia(diaId, { manana_inicio: e.target.value })}
                              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                            />
                          </div>
                          <span className="text-slate-300 mt-3">-</span>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Fin</label>
                            <input
                              type="time"
                              value={dia.manana_fin}
                              onChange={(e) => handleUpdateDia(diaId, { manana_fin: e.target.value })}
                              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-[10px] text-slate-400 font-medium italic">
                          🔒 Mañana bloqueada (sombreada en agenda)
                        </div>
                      )}
                    </div>

                    {/* Pausa de Colación (Sólo activa y visible cuando AM y PM están activos) */}
                    {ambosTurnosActivos ? (
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dia.colacion_activa}
                              onChange={(e) => handleUpdateDia(diaId, { colacion_activa: e.target.checked })}
                              className="rounded border-slate-300 text-signal-blue focus:ring-signal-blue cursor-pointer"
                            />
                            <Utensils className="w-3.5 h-3.5 text-slate-500" />
                            <span>Pausa Colación</span>
                          </label>
                          {dia.colacion_activa && (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Bloqueado
                            </span>
                          )}
                        </div>

                        {dia.colacion_activa ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Inicio</label>
                              <input
                                type="time"
                                value={dia.colacion_inicio}
                                onChange={(e) => handleUpdateDia(diaId, { colacion_inicio: e.target.value })}
                                className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                              />
                            </div>
                            <span className="text-slate-300 mt-3">-</span>
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Fin</label>
                              <input
                                type="time"
                                value={dia.colacion_fin}
                                onChange={(e) => handleUpdateDia(diaId, { colacion_fin: e.target.value })}
                                className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                            Jornada continua sin pausa de almuerzo
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 flex flex-col justify-center items-center text-center">
                        <Utensils className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400 italic leading-snug">
                          Colación no requerida (sólo aplica con turnos AM y PM simultáneos).
                        </span>
                      </div>
                    )}

                    {/* Turno Tarde (PM) */}
                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        tardeActiva
                          ? 'bg-slate-50/80 border-slate-200/80 shadow-2xs'
                          : 'bg-slate-100/50 border-dashed border-slate-300 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <MoonStar className={`w-3.5 h-3.5 ${tardeActiva ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span>Turno Tarde (PM)</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tardeActiva}
                            onChange={(e) => handleUpdateDia(diaId, { tarde_activa: e.target.checked })}
                            className="rounded border-slate-300 text-signal-blue focus:ring-signal-blue cursor-pointer"
                          />
                          <span className={`font-bold ${tardeActiva ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {tardeActiva ? 'Habilitado' : 'Bloqueado'}
                          </span>
                        </label>
                      </div>

                      {tardeActiva ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Inicio</label>
                            <input
                              type="time"
                              value={dia.tarde_inicio}
                              onChange={(e) => handleUpdateDia(diaId, { tarde_inicio: e.target.value })}
                              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                            />
                          </div>
                          <span className="text-slate-300 mt-3">-</span>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Cierre</label>
                            <input
                              type="time"
                              value={dia.tarde_fin}
                              onChange={(e) => handleUpdateDia(diaId, { tarde_fin: e.target.value })}
                              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-[10px] text-slate-400 font-medium italic">
                          🔒 Tarde bloqueada (sombreada en agenda)
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 py-3 text-xs text-slate-400 italic bg-slate-100/50 rounded-xl px-4 border border-dashed border-slate-200">
                    🔒 Día no laboral. Todos los bloques de este día aparecerán sombreados en la grilla horaria semanal.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botonera Flotante Inferior de Seguridad */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-calendly-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Configuración persistida en tiempo real y sincronizada con la agenda clínica.</span>
        </div>

        <Button
          type="button"
          onClick={handleGuardar}
          disabled={saving}
          className="bg-signal-blue hover:bg-deep-cobalt text-white font-bold text-xs sm:text-sm rounded-xl px-6 shadow-xs flex items-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Guardar Horarios de Box
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
