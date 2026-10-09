'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Lock, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FiltroEstadoCitas = 'todas' | 'pendientes' | 'confirmadas';

interface ClinicalNavbarProps {
  fechaBase: Date;
  vista: 'dia' | 'semana';
  onVistaChange: (v: 'dia' | 'semana') => void;
  onChangeDate: (dir: number) => void;
  onToday: () => void;
  onNuevaCita: () => void;
  onBloquearHorario?: () => void;
  filtroEstado?: FiltroEstadoCitas;
  onFiltroEstadoChange?: (f: FiltroEstadoCitas) => void;
  onSincronizar?: () => void;
  isSyncing?: boolean;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
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
    return `${diaCap}, ${diaNum} de ${MESES[fechaBase.getMonth()]} de ${fechaBase.getFullYear()}`;
  }
  const lunes = getMonday(fechaBase);
  const sabado = new Date(lunes);
  sabado.setDate(sabado.getDate() + 5);
  const diaIni = String(lunes.getDate()).padStart(2, '0');
  const diaFin = String(sabado.getDate()).padStart(2, '0');
  if (lunes.getMonth() === sabado.getMonth()) {
    return `Semana del ${diaIni} al ${diaFin} de ${MESES[sabado.getMonth()]} de ${sabado.getFullYear()}`;
  }
  return `Semana del ${diaIni} de ${MESES[lunes.getMonth()]} al ${diaFin} de ${MESES[sabado.getMonth()]} de ${sabado.getFullYear()}`;
}

export function ClinicalNavbar({ fechaBase, vista, onVistaChange, onChangeDate, onToday, onNuevaCita, onBloquearHorario, filtroEstado = 'todas', onFiltroEstadoChange, onSincronizar, isSyncing }: ClinicalNavbarProps) {
  const titulo = formatearTitulo(fechaBase, vista);
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-slate-500" /><span>Sucursal Principal</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={onToday} className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Hoy</button>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
            <button type="button" onClick={() => onChangeDate(-1)} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => onChangeDate(1)} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">{titulo}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onFiltroEstadoChange && (
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <div className="pl-2 pr-1 flex items-center"><Filter className="w-3.5 h-3.5 text-slate-400" /></div>
            {(['todas', 'pendientes', 'confirmadas'] as FiltroEstadoCitas[]).map((f) => (
              <button key={f} onClick={() => onFiltroEstadoChange(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${filtroEstado === f ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>{f}</button>
            ))}
          </div>
        )}
        <div className="w-px h-6 bg-slate-200 hidden md:block"></div>
        
        {onSincronizar && (
          <button
            onClick={onSincronizar}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
            title="Sincronizar citas bidireccionalmente con Google Calendar"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Google Calendar'}</span>
          </button>
        )}

        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
          <button type="button" onClick={() => onVistaChange('dia')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vista === 'dia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Día</button>
          <button type="button" onClick={() => onVistaChange('semana')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vista === 'semana' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Semana</button>
        </div>
        {onBloquearHorario && (
          <button type="button" onClick={onBloquearHorario} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"><Lock className="w-3.5 h-3.5" /><span className="hidden sm:inline">Bloquear Horario</span></button>
        )}
        <Button onClick={onNuevaCita} className="bg-slate-900 hover:bg-slate-800 text-slate-50 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"><Plus className="w-4 h-4" /><span>Nueva Cita</span></Button>
      </div>
    </div>
  );
}
