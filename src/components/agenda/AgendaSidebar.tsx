'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  RotateCw,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

export type FiltroEstadoCitas = 'todas' | 'pendientes' | 'confirmadas';

interface AgendaSidebarProps {
  fechaSeleccionada: Date;
  onSelectFecha: (d: Date) => void;
  filtroEstado: FiltroEstadoCitas;
  onFiltroEstadoChange: (filtro: FiltroEstadoCitas) => void;
  conteos: {
    todas: number;
    pendientes: number;
    confirmadas: number;
  };
  onConfigurarHorariosBox?: () => void;
  onSincronizarGoogleCalendar?: () => void;
  isSyncing?: boolean;
}

const DIAS_CORTO = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function AgendaSidebar({
  fechaSeleccionada,
  onSelectFecha,
  filtroEstado,
  onFiltroEstadoChange,
  conteos,
  onConfigurarHorariosBox,
  onSincronizarGoogleCalendar,
  isSyncing = false
}: AgendaSidebarProps) {
  // Estado del mes visualizado en el mini-calendario
  const [mesActual, setMesActual] = useState(
    new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1)
  );

  const ano = mesActual.getFullYear();
  const mesIndex = mesActual.getMonth();
  const hoy = useMemo(() => new Date(), []);

  // Navegar meses en el mini-calendario
  const handlePrevMonth = () => {
    setMesActual(new Date(ano, mesIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setMesActual(new Date(ano, mesIndex + 1, 1));
  };

  // Generar cuadrícula de días del mes (Lunes a Domingo)
  const calendarioDias = useMemo(() => {
    const primerDia = new Date(ano, mesIndex, 1);
    const ultimoDia = new Date(ano, mesIndex + 1, 0);

    // Ajuste lunes = 0, domingo = 6
    let diaInicioSemana = primerDia.getDay() - 1;
    if (diaInicioSemana === -1) diaInicioSemana = 6;

    const totalDiasMes = ultimoDia.getDate();
    const dias: { fecha: Date; esMesActual: boolean; numero: number }[] = [];

    // Días del mes anterior para rellenar
    const mesAnteriorUltimoDia = new Date(ano, mesIndex, 0).getDate();
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      const num = mesAnteriorUltimoDia - i;
      dias.push({
        fecha: new Date(ano, mesIndex - 1, num),
        esMesActual: false,
        numero: num
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDiasMes; d++) {
      dias.push({
        fecha: new Date(ano, mesIndex, d),
        esMesActual: true,
        numero: d
      });
    }

    // Días del mes siguiente para completar grilla de 35 o 42 celdas
    const celdasRestantes = 7 - (dias.length % 7);
    if (celdasRestantes < 7) {
      for (let s = 1; s <= celdasRestantes; s++) {
        dias.push({
          fecha: new Date(ano, mesIndex + 1, s),
          esMesActual: false,
          numero: s
        });
      }
    }

    return dias;
  }, [ano, mesIndex]);

  return (
    <aside className="w-full lg:w-[280px] shrink-0 space-y-4">
      {/* 1. IDENTIFICADOR DE SUCURSAL / BOX */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Sucursal / Box
            </span>
            <h3 className="font-extrabold text-sm text-slate-900 truncate">
              Box Central Chillán
            </h3>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Bulnes 470, Of. 75</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MINI CALENDARIO MENSUAL INTERACTIVO */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs select-none">
        {/* Cabecera del Mini-Calendario */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h4 className="text-xs font-black text-slate-900 capitalize tracking-tight">
            {MESES[mesIndex]} {ano}
          </h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Días de la Semana (Lu, Ma, Mi, Ju, Vi, Sá, Do) */}
        <div className="grid grid-cols-7 text-center mb-1">
          {DIAS_CORTO.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-slate-400 uppercase py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Grilla de Días */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarioDias.map((item, index) => {
            const isSelected = isSameDay(item.fecha, fechaSeleccionada);
            const isCurrentToday = isSameDay(item.fecha, hoy);

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onSelectFecha(item.fecha);
                  // Si el día clicado es de otro mes, sincronizar mes actual
                  if (!item.esMesActual) {
                    setMesActual(new Date(item.fecha.getFullYear(), item.fecha.getMonth(), 1));
                  }
                }}
                className={`h-7 w-7 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-black shadow-xs ring-2 ring-indigo-200'
                    : isCurrentToday
                    ? 'bg-indigo-50 text-indigo-700 font-black border border-indigo-200'
                    : item.esMesActual
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{item.numero}</span>
                {isCurrentToday && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FILTRO DE ESTADO DE CITAS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>Filtrar por Estado</span>
        </span>

        <div className="space-y-1.5">
          {/* Todas */}
          <button
            type="button"
            onClick={() => onFiltroEstadoChange('todas')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === 'todas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Todas las citas</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filtroEstado === 'todas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {conteos.todas}
            </span>
          </button>

          {/* Pendientes */}
          <button
            type="button"
            onClick={() => onFiltroEstadoChange('pendientes')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === 'pendientes'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-amber-50/70 hover:text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pendientes</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filtroEstado === 'pendientes' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {conteos.pendientes}
            </span>
          </button>

          {/* Confirmadas */}
          <button
            type="button"
            onClick={() => onFiltroEstadoChange('confirmadas')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === 'confirmadas'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Confirmadas</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filtroEstado === 'confirmadas' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {conteos.confirmadas}
            </span>
          </button>
        </div>
      </div>

      {/* 4. ACCIONES DE GESTIÓN RÁPIDA (Horarios Box & Sincronización) */}
      <div className="space-y-2 pt-1">
        {onConfigurarHorariosBox && (
          <button
            type="button"
            onClick={onConfigurarHorariosBox}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Configurar Horarios de Box</span>
          </button>
        )}

        {onSincronizarGoogleCalendar && (
          <button
            type="button"
            onClick={onSincronizarGoogleCalendar}
            disabled={isSyncing}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <RotateCw className={`w-4 h-4 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Google Calendar</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sync</span>
          </button>
        )}
      </div>
    </aside>
  );
}
