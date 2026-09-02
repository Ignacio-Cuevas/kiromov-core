"use client";

import * as React from "react";
import { EvolucionSOAP } from "@/types/database";
import { formatDateChile, formatDateLongChile, cn } from "@/lib/utils";
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  FileEdit,
  Activity,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  Maximize2,
  X,
} from "lucide-react";

interface SoapTimelineAccordionProps {
  evoluciones: EvolucionSOAP[];
  isLoading?: boolean;
}

export function SoapTimelineAccordion({
  evoluciones,
  isLoading = false,
}: SoapTimelineAccordionProps) {
  // Store set of expanded item IDs. By default, open the first/latest one.
  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  // Auto expand the first evolution on mount or when data changes
  React.useEffect(() => {
    if (evoluciones.length > 0) {
      setExpandedIds((prev) => {
        const firstKey = evoluciones[0]?.id || "evo-0";
        if (Object.keys(prev).length === 0) {
          return { [firstKey]: true };
        }
        return prev;
      });
    }
  }, [evoluciones]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-clinic-600 border-t-transparent mb-2" />
        <p className="text-xs">Cargando evoluciones previas...</p>
      </div>
    );
  }

  if (evoluciones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50 space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <FileEdit className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Sin notas clínicas previas. Registra la primera evolución arriba.
        </p>
        <p className="text-xs text-slate-400">
          Cada nota guardada se organizará automáticamente en formato SOAP cronológico con mapa de dolor y pronóstico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          Historial de Evoluciones SOAP ({evoluciones.length})
        </h4>
        <button
          type="button"
          onClick={() => {
            const allExpanded = evoluciones.every(
              (e, idx) => expandedIds[e.id || `evo-${idx}`]
            );
            const newMap: Record<string, boolean> = {};
            evoluciones.forEach((e, idx) => {
              newMap[e.id || `evo-${idx}`] = !allExpanded;
            });
            setExpandedIds(newMap);
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          {evoluciones.every((e, idx) => expandedIds[e.id || `evo-${idx}`])
            ? "Colapsar todas"
            : "Expandir todas"}
        </button>
      </div>

      <div className="relative pl-5 sm:pl-6 space-y-3.5 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {evoluciones.map((evolucion, index) => {
          const key = evolucion.id || `evo-${index}`;
          const isExpanded = !!expandedIds[key];

          // Normalized mappings
          const s_subjetivo =
            evolucion.s_subjetivo || evolucion.subjetivo || evolucion.s || "";
          const o_objetivo =
            evolucion.o_objetivo || evolucion.objetivo || evolucion.o || "";
          const a_analisis =
            evolucion.a_analisis || evolucion.analisis || evolucion.a || "";
          const p_plan =
            evolucion.p_plan || evolucion.plan || evolucion.p || "";
          const nivel_dolor_ena =
            evolucion.nivel_dolor_ena ??
            evolucion.ena_dolor ??
            evolucion.ena ??
            null;

          const mapa_dolor = evolucion.mapa_dolor_svg || (evolucion as any).mapa_dolor;
          const hallazgos = evolucion.hallazgos_frecuentes || [];
          const cuestionario = evolucion.cuestionario_funcional || (evolucion as any).cuestionario_usado;
          const discapacidadPct = evolucion.discapacidad_funcional_pct ?? (evolucion as any).discapacidad_funcional;
          const pronostico = evolucion.pronostico_sesiones_estimadas || (evolucion as any).pronostico_sesiones;

          return (
            <div key={key} className="relative">
              {/* Timeline marker */}
              <div className="absolute -left-5 sm:-left-6 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              </div>

              {/* Accordion Card */}
              <div className="space-y-3 p-4 bg-slate-50/80 border border-slate-200 rounded-2xl shadow-xs transition-all hover:border-slate-300">
                {/* Header (Clickable) */}
                <div
                  onClick={() => toggleExpand(key)}
                  className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">
                      {formatDateLongChile(evolucion.fecha) || evolucion.fecha}
                    </span>
                    {evolucion.profesional && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 ml-1">
                        <User className="h-3 w-3" />
                        {evolucion.profesional}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {nivel_dolor_ena !== null && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        ENA: {nivel_dolor_ena}/10
                      </span>
                    )}
                    {pronostico && (
                      <span className="hidden md:inline-flex bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2 py-0.5 rounded-full font-bold">
                        🎯 {pronostico}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* S, O, A, P Sections */}
                {isExpanded && (
                  <div className="space-y-3.5 pt-1 animate-in fade-in-50 duration-150">
                    {/* Mapa de Dolor y Hallazgos Visuales */}
                    {(mapa_dolor || hallazgos.length > 0 || cuestionario || pronostico) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200">
                        {/* Mapa de dolor */}
                        {mapa_dolor && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" />
                                Mapa Anatómico de Dolor
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Maximize2 className="h-2.5 w-2.5" /> Clic para ampliar
                              </span>
                            </span>
                            <div
                              onClick={() => setPreviewImage(mapa_dolor)}
                              className="group relative border border-slate-200 rounded-lg overflow-hidden bg-white max-w-[280px] cursor-pointer hover:border-blue-400 transition-all shadow-2xs"
                              title="Hacer clic para ampliar mapa de dolor"
                            >
                              <img
                                src={mapa_dolor}
                                alt="Mapa de Dolor"
                                className="w-full h-auto object-contain transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-800 font-bold text-[10px] px-2 py-1 rounded-md shadow-xs flex items-center gap-1">
                                  <Maximize2 className="h-3 w-3" /> Ampliar HD
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hallazgos y Cuestionario */}
                        <div className="space-y-2.5">
                          {hallazgos.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                                Hallazgos TMO Detectados:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {hallazgos.map((h, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(cuestionario || pronostico) && (
                            <div className="space-y-1 text-xs">
                              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                                Evaluación Funcional:
                              </span>
                              {cuestionario && (
                                <p className="text-slate-700">
                                  <strong>Cuestionario:</strong> {cuestionario}{" "}
                                  {discapacidadPct !== null && discapacidadPct !== undefined && (
                                    <span className="font-bold text-blue-700">({discapacidadPct}% de discapacidad)</span>
                                  )}
                                </p>
                              )}
                              {pronostico && (
                                <p className="text-slate-700">
                                  <strong>Pronóstico de Alta:</strong>{" "}
                                  <span className="font-bold text-slate-900">{pronostico}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {s_subjetivo && (
                      <div>
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                          S - Subjetivo
                        </span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">
                          {s_subjetivo}
                        </p>
                      </div>
                    )}

                    {o_objetivo && (
                      <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                          O - Objetivo
                        </span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">
                          {o_objetivo}
                        </p>
                      </div>
                    )}

                    {a_analisis && (
                      <div>
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                          A - Análisis
                        </span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">
                          {a_analisis}
                        </p>
                      </div>
                    )}

                    {p_plan && (
                      <div>
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                          P - Plan
                        </span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">
                          {p_plan}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Lightbox de Ampliación HD del Mapa de Dolor */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-3 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-600" />
                Mapa de Dolor Anatómico Registrado
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-200">
              <img
                src={previewImage}
                alt="Mapa de Dolor en Alta Resolución"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoapTimelineAccordion;
