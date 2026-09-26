'use client';

import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Settings,
  Calendar,
  Clock,
  RotateCw,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgendaHeaderProps {
  fechaBase: Date;
  vista: 'semana' | 'dia' | 'mes';
  onVistaChange: (v: 'semana' | 'dia' | 'mes') => void;
  onChangeDate: (dir: number) => void;
  onToday: () => void;
  kpis: {
    citadosHoy: number;
    confirmadas: number;
    pendientes: number;
    enSala: number;
    asistio: number;
  };
  onNuevaCita: () => void;
  onBloquearHorario?: () => void;
  onSincronizarCalendario?: () => void;
  isSyncing?: boolean;
  onHorariosBox?: () => void;
  activeTab?: 'agenda' | 'disponibilidad';
  onActiveTabChange?: (tab: 'agenda' | 'disponibilidad') => void;
}

function getMonday(d: Date): Date {
  const dCopy = new Date(d);
  const day = dCopy.getDay();
  const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dCopy.setDate(diff));
}

function formatVisibleDateRange(fechaBase: Date, vista: 'semana' | 'dia' | 'mes'): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (vista === 'semana') {
    const inicio = getMonday(fechaBase);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);

    const startDay = String(inicio.getDate()).padStart(2, '0');
    const startMonth = meses[inicio.getMonth()];
    const endDay = String(fin.getDate()).padStart(2, '0');
    const endMonth = meses[fin.getMonth()];
    const endYear = fin.getFullYear();

    if (inicio.getMonth() === fin.getMonth()) {
      return `${startDay} - ${endDay} ${endMonth}, ${endYear}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${endYear}`;
  }

  if (vista === 'dia') {
    const diaNum = fechaBase.getDate();
    const diaNombre = fechaBase.toLocaleDateString('es-CL', { weekday: 'long' });
    const diaCap = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);
    const mesNombre = mesesCompletos[fechaBase.getMonth()];
    const ano = fechaBase.getFullYear();
    return `${diaCap} ${diaNum} de ${mesNombre}, ${ano}`;
  }

  // Vista Mes
  const mesNombre = mesesCompletos[fechaBase.getMonth()];
  const ano = fechaBase.getFullYear();
  return `${mesNombre} ${ano}`;
}

export function AgendaHeader({
  fechaBase,
  vista,
  onVistaChange,
  onChangeDate,
  onToday,
  kpis,
  onNuevaCita,
  onBloquearHorario,
  onSincronizarCalendario,
  isSyncing = false,
  onHorariosBox,
  activeTab = 'agenda',
  onActiveTabChange
}: AgendaHeaderProps) {
  const visibleRangeText = useMemo(
    () => formatVisibleDateRange(fechaBase, vista),
    [fechaBase, vista]
  );

  return (
    <div className="space-y-4">
      {/* Pestañas Superiores de Módulo: Agenda vs Disponibilidad */}
      {onActiveTabChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onActiveTabChange('agenda')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'agenda'
                  ? 'bg-ink-navy text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-signal-blue" />
              <span>Agenda de Citas</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveTabChange('disponibilidad')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'disponibilidad'
                  ? 'bg-ink-navy text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-signal-blue" />
              <span>Disponibilidad y Horarios de Box</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline-block font-medium">
            {activeTab === 'agenda'
              ? 'Grilla médica semanal de alta gama (Time-Grid Pro)'
              : 'Configuración semanal persistente de jornada'}
          </span>
        </div>
      )}

      {/* Barra Principal de Control y Navegación */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Lado Izquierdo: Controles de Fecha y Rango Visible */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegación < Hoy > */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeDate(-1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-ink-navy rounded-lg transition-colors cursor-pointer"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:text-ink-navy hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-ink-navy rounded-lg transition-colors cursor-pointer"
              title="Período siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Rango de Fechas Visible en Estilo Linear */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-signal-blue shrink-0" />
            <h2 className="text-base sm:text-lg font-extrabold text-ink-navy tracking-tight">
              {visibleRangeText}
            </h2>
          </div>
        </div>

        {/* Lado Derecho: Selector de Vista + Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Sincronización Google Calendar */}
          {onSincronizarCalendario && (
            <button
              type="button"
              onClick={onSincronizarCalendario}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Sincronizar citas con Google Calendar"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Google Calendar</span>
            </button>
          )}

          {/* Bloquear Horario */}
          {onBloquearHorario && (
            <button
              type="button"
              onClick={onBloquearHorario}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Bloquear</span>
            </button>
          )}

          {/* Horarios de Box */}
          {onHorariosBox && (
            <button
              type="button"
              onClick={onHorariosBox}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Horarios Box</span>
            </button>
          )}

          {/* Selector de Vista (Día / Semana / Mes) */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-0.5">
            <button
              type="button"
              onClick={() => onVistaChange('dia')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                vista === 'dia'
                  ? 'bg-white text-ink-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink-navy'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => onVistaChange('semana')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                vista === 'semana'
                  ? 'bg-white text-ink-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink-navy'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => onVistaChange('mes')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                vista === 'mes'
                  ? 'bg-white text-ink-navy shadow-xs'
                  : 'text-slate-600 hover:text-ink-navy'
              }`}
            >
              Mes
            </button>
          </div>

          {/* Botón Primario: + Nueva Cita */}
          <Button
            onClick={onNuevaCita}
            className="bg-signal-blue hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Cita</span>
          </Button>
        </div>
      </div>

      {/* Métricas Rápidas (KPIs Limpios Estilo Dashboard Clínico) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Citados */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Citados
          </span>
          <span className="text-2xl sm:text-3xl font-black text-ink-navy mt-1">
            {kpis.citadosHoy}
          </span>
        </div>

        {/* Pendientes */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pendientes
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">
            {kpis.pendientes}
          </span>
        </div>

        {/* Confirmadas */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-emerald-50/40 to-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confirmadas
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">
            {kpis.confirmadas}
          </span>
        </div>

        {/* Atendidas / Asistió */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-teal-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-teal-50/40 to-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Atendidas
          </span>
          <span className="text-2xl sm:text-3xl font-black text-teal-900 mt-1">
            {kpis.asistio}
          </span>
        </div>

        {/* En Box / Sala */}
        <div className="col-span-2 sm:col-span-1 bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            En Box
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
            {kpis.enSala}
          </span>
        </div>
      </div>
    </div>
  );
}
