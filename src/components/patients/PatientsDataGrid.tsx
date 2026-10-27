'use client';

import React from 'react';
import { 
  getResumenPlan, 
  detectarSegmentoTMO, 
  getSegmentoTMOLabel, 
  evaluarRiesgoDesercion 
} from '@/lib/clinical';
import { formatCLP, formatRut, getWhatsAppUrl } from '@/lib/utils';
import { generarEnlaceWhatsAppConfirmacion } from '@/utils/whatsapp';
import { 
  FileText, 
  Calendar, 
  MessageCircle, 
  Edit2, 
  Settings, 
  SearchX, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export interface PacienteResumen {
  id: string;
  codigo_paciente?: string;
  nombre_completo: string;
  rut: string;
  telefono: string | null;
  email: string | null;
  prevision: string;
  prevision_salud?: string | null;
  estado: string;
  sede?: string;
  plan_id: string | null;
  nombre_plan: string | null;
  total_sesiones: number;
  sesiones_usadas: number;
  sesiones_restantes: number;
  estado_plan: 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan' | string;
  estado_pago: 'pagado' | 'pendiente' | null;
  monto_clp: number | null;
  ultimo_dolor_ena?: number | null;
  dias_sin_atencion?: number | null;
  motivo_consulta?: string | null;
  diagnostico_principal?: string | null;
  diagnostico_medico?: string | null;
  fecha_nacimiento?: string | null;
  antecedentes_morbidos?: string | null;
  antecedentes_medicos?: string | null;
  banderas_rojas?: string | null;
  alertas_seguridad?: string | null;
  proxima_cita?: {
    fecha: string;
    hora: string;
  } | null;
}

interface PatientsDataGridProps {
  pacientes: PacienteResumen[];
  loading: boolean;
  onOpenFicha: (pacienteId: string) => void;
  onAgendar: (paciente: PacienteResumen) => void;
  onEditar: (paciente: PacienteResumen) => void;
  onAjustarPlan: (paciente: PacienteResumen) => void;
  onLimpiarFiltros?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getPrevisionBadge(prev?: string | null) {
  const norm = (prev || '').toLowerCase();
  if (norm.includes('fonasa')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Fonasa</span>;
  }
  if (norm.includes('isapre')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Isapre</span>;
  }
  if (norm.includes('convenio')) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Convenio</span>;
  }
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Particular</span>;
}

export function PatientsDataGrid({
  pacientes,
  loading,
  onOpenFicha,
  onAgendar,
  onEditar,
  onAjustarPlan,
  onLimpiarFiltros,
}: PatientsDataGridProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100/70 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (pacientes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No se encontraron pacientes</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No hay registros que coincidan con la búsqueda o filtros seleccionados.
        </p>
        {onLimpiarFiltros && (
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Limpiar filtros de búsqueda
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* 1. Vista Escritorio: Tabla Densa (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          {/* Cabecera Fija */}
          <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              <th className="py-2.5 px-3.5">Paciente</th>
              <th className="py-2.5 px-3">Previsión</th>
              <th className="py-2.5 px-3">Segmento TMO</th>
              <th className="py-2.5 px-3">Plan & Sesiones</th>
              <th className="py-2.5 px-3">Estado Pago</th>
              <th className="py-2.5 px-3.5 text-right">Acciones Rápidas</th>
            </tr>
          </thead>

          {/* Filas de Pacientes (40px a 44px de alto) */}
          <tbody className="divide-y divide-slate-100">
            {pacientes.map((p) => {
              const { tienePlan, sesionesUsadas, sesionesTotales, sesionesRestantes, porcentajeUso } = getResumenPlan(p);
              const segmentoKey = detectarSegmentoTMO(p);
              const segmentoInfo = getSegmentoTMOLabel(segmentoKey);
              const alerta = evaluarRiesgoDesercion({ ...p, sesiones_consumidas: p.sesiones_usadas } as any);
              const esRiesgo = alerta.nivel !== null;
              const tieneDeuda = p.estado_pago === 'pendiente' && (p.monto_clp || 0) > 0;
              const cleanPhone = (p.telefono || '').replace(/\D/g, '');

              return (
                <tr 
                  key={p.id}
                  className="hover:bg-slate-50/80 transition-colors group h-11"
                >
                  {/* 1. Paciente: Avatar + Nombre + RUT */}
                  <td className="py-1.5 px-3.5">
                    <div className="flex items-center gap-2.5 min-w-[220px]">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {getInitials(p.nombre_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onOpenFicha(p.id)}
                          className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate block text-left text-xs cursor-pointer hover:underline"
                          title={`Abrir ficha de ${p.nombre_completo}`}
                        >
                          {p.nombre_completo}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums leading-none mt-0.5">
                          <span>{p.rut ? formatRut(p.rut) : 'Sin RUT'}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-sans font-semibold ${
                            (p.sede || 'chillan') === 'concepcion'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {(p.sede || 'chillan') === 'concepcion' ? 'Concepción' : 'Chillán'}
                          </span>
                          {esRiesgo && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" 
                              title={alerta.etiqueta} 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Previsión */}
                  <td className="py-1.5 px-3">
                    {getPrevisionBadge(p.prevision || p.prevision_salud)}
                  </td>

                  {/* 3. Segmento TMO */}
                  <td className="py-1.5 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${segmentoInfo.colorClass}`}>
                      {segmentoInfo.shortLabel}
                    </span>
                  </td>

                  {/* 4. Plan & Sesiones */}
                  <td className="py-1.5 px-3">
                    {tienePlan ? (
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <span className="text-slate-700 font-semibold truncate block max-w-[130px] leading-tight" title={p.nombre_plan || 'Plan'}>
                            {p.nombre_plan || 'Plan Kinésico'}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums text-slate-500">
                            {sesionesUsadas}/{sesionesTotales} ({porcentajeUso}%) · <span className={sesionesRestantes === 1 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-semibold'}>{sesionesRestantes} rest.</span>
                          </span>
                        </div>
                        {/* Mini barra de progreso */}
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${
                              p.estado_plan === 'finalizado'
                                ? 'bg-slate-400'
                                : p.estado_plan === 'por_renovar' || sesionesRestantes === 1
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${porcentajeUso}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Sin plan asignado</span>
                    )}
                  </td>

                  {/* 5. Estado Pago */}
                  <td className="py-1.5 px-3 font-mono tabular-nums">
                    {tieneDeuda ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        🔴 Debe {formatCLP(p.monto_clp || 0)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Al día
                      </span>
                    )}
                  </td>

                  {/* 6. Acciones Rápidas (Hover) */}
                  <td className="py-1.5 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      {/* WhatsApp */}
                      {cleanPhone ? (
                        <a
                          href={
                            p.proxima_cita?.fecha
                              ? generarEnlaceWhatsAppConfirmacion({
                                  paciente_nombre: p.nombre_completo,
                                  paciente_telefono: cleanPhone,
                                  fecha: p.proxima_cita.fecha,
                                  hora: p.proxima_cita.hora || '09:00:00',
                                })
                              : getWhatsAppUrl(cleanPhone, p.nombre_completo)
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-colors"
                          title={
                            p.proxima_cita?.fecha
                              ? 'Enviar confirmación de próxima cita por WhatsApp'
                              : 'Enviar mensaje WhatsApp'
                          }
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {/* Agendar */}
                      <button
                        type="button"
                        onClick={() => onAgendar(p)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition-colors cursor-pointer"
                        title="Agendar cita en box"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>

                      {/* Ajustar plan si tiene plan */}
                      {tienePlan && (
                        <button
                          type="button"
                          onClick={() => onAjustarPlan(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent transition-colors cursor-pointer"
                          title="Ajustar sesiones del plan"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Editar paciente */}
                      <button
                        type="button"
                        onClick={() => onEditar(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent transition-colors cursor-pointer"
                        title="Editar datos / RUT"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Abrir Expediente Clínico */}
                      <button
                        type="button"
                        onClick={() => onOpenFicha(p.id)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                        title="Ver Ficha Clínica Completa"
                      >
                        <span>Ficha</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Vista Móvil: Tarjetas Clínicas de Paciente (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {pacientes.map((p) => {
          const { tienePlan, sesionesUsadas, sesionesTotales, sesionesRestantes } = getResumenPlan(p);
          const segmentoKey = detectarSegmentoTMO(p);
          const segmentoInfo = getSegmentoTMOLabel(segmentoKey);
          const tieneDeuda = p.estado_pago === 'pendiente' && (p.monto_clp || 0) > 0;
          const cleanPhone = (p.telefono || '').replace(/\D/g, '');

          return (
            <div key={p.id} className="p-4 space-y-3 bg-white">
              {/* Encabezado: Avatar + Nombre + RUT + Previsión */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {getInitials(p.nombre_completo)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onOpenFicha(p.id)}
                      className="font-bold text-sm text-slate-900 hover:text-emerald-700 truncate block text-left leading-tight cursor-pointer"
                    >
                      {p.nombre_completo}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                      <span className="font-mono text-slate-500 tabular-nums text-[11px]">
                        {p.rut ? formatRut(p.rut) : 'Sin RUT'}
                      </span>
                      <span>·</span>
                      {getPrevisionBadge(p.prevision || p.prevision_salud)}
                    </div>
                  </div>
                </div>

                {/* Badge Segmento TMO / Deuda */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${segmentoInfo.colorClass}`}>
                    {segmentoInfo.shortLabel}
                  </span>
                  {tieneDeuda && (
                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                      Debe {formatCLP(p.monto_clp || 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Fila Plan & Sesiones */}
              {tienePlan && (
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium truncate max-w-[180px]">
                    {p.nombre_plan || 'Plan Kinésico'}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-800 tabular-nums">
                    {sesionesUsadas}/{sesionesTotales} ses. <span className={sesionesRestantes === 1 ? 'text-amber-700 font-bold' : 'text-emerald-700'}>({sesionesRestantes} rest.)</span>
                  </span>
                </div>
              )}

              {/* Acciones Rápidas Móviles: WhatsApp + Ver Ficha + Agendar */}
              <div className="flex items-center gap-2 pt-0.5">
                {cleanPhone ? (
                  <a
                    href={
                      p.proxima_cita?.fecha
                        ? generarEnlaceWhatsAppConfirmacion({
                            paciente_nombre: p.nombre_completo,
                            paciente_telefono: cleanPhone,
                            fecha: p.proxima_cita.fecha,
                            hora: p.proxima_cita.hora || '09:00:00',
                          })
                        : getWhatsAppUrl(cleanPhone, p.nombre_completo)
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEditar(p)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <span>+ Teléfono</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenFicha(p.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs active:scale-[0.98] cursor-pointer"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Ver Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAgendar(p)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 active:scale-[0.98] cursor-pointer"
                  title="Nueva Atención / Cita"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie de tabla con conteo */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Mostrando <strong className="text-slate-800 font-mono tabular-nums">{pacientes.length}</strong> pacientes</span>
        <span className="hidden sm:inline">Pasa el cursor sobre una fila para acceder a acciones rápidas</span>
      </div>
    </div>
  );
}

export default PatientsDataGrid;
