'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  CalendarDays,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClinicalNavbarProps {
  fechaBase: Date;
  vista: 'dia' | 'semana';
  onVistaChange: (v: 'dia' | 'semana') => void;
  onChangeDate: (dir: number) => void;
  onToday: () => void;
  onNuevaCita: () => void;
  onBloquearHorario?: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonday(d: Date): Date {
  const dCopy = new Date(d);
  const day = dCopy.getDay();
  const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dCopy.setDate(diff));
}

function formatearTitulo(fechaBase: Date, vista: 'dia' | 'semana'): string {
  if (vista === 'dia') {
    const diaNombre = fechaBase.toLocaleDateString('es-CL', { weekday: 'long' });
    const diaCap = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);
    const diaNum = String(fechaBase.getDate()).padStart(2, '0');
    const mesNombre = MESES[fechaBase.getMonth()];
    const ano = fechaBase.getFullYear();
    return `${diaCap}, ${diaNum} de ${mesNombre} de ${ano}`;
  }

  // Vista Semana: Lunes a Sábado
  const lunes = getMonday(fechaBase);
  const sabado = new Date(lunes);
  sabado.setDate(sabado.getDate() + 5);

  const diaIni = String(lunes.getDate()).padStart(2, '0');
  const diaFin = String(sabado.getDate()).padStart(2, '0');
  const mesIni = MESES[lunes.getMonth()];
  const mesFin = MESES[sabado.getMonth()];
  const ano = sabado.getFullYear();

  if (lunes.getMonth() === sabado.getMonth()) {
    return `Semana del ${diaIni} al ${diaFin} de ${mesFin} de ${ano}`;
  }
  return `Semana del ${diaIni} de ${mesIni} al ${diaFin} de ${mesFin} de ${ano}`;
}

export function ClinicalNavbar({
  fechaBase,
  vista,
  onVistaChange,
  onChangeDate,
  onToday,
  onNuevaCita,
  onBloquearHorario
}: ClinicalNavbarProps) {
  const titulo = formatearTitulo(fechaBase, vista);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Lado Izquierdo: Controles de Fecha (Hoy, <, >, Título) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Controles de Navegación */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onToday}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Hoy
          </button>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeDate(-1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Título Destacado en Español */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600 shrink-0 hidden sm:block" />
          <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
            {titulo}
          </h2>
        </div>
      </div>

      {/* Lado Derecho: Conmutador [ Día ] [ Semana ] + Botón [+ Nueva Cita] */}
      <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto">
        {/* Conmutador [ Día ] [ Semana ] */}
        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
          <button
            type="button"
            onClick={() => onVistaChange('dia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vista === 'dia'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => onVistaChange('semana')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vista === 'semana'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semana
          </button>
        </div>

        {/* Botón Bloquear Horario */}
        {onBloquearHorario && (
          <button
            type="button"
            onClick={onBloquearHorario}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Bloquear tramo de horario"
          >
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Bloquear</span>
          </button>
        )}

        {/* Botón Principal: + Nueva Cita (Estilo AgendaPro en Índigo) */}
        <Button
          onClick={onNuevaCita}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cita</span>
        </Button>
      </div>
    </div>
  );
}
