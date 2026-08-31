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
          Cada nota guardada se organizará automáticamente en formato SOAP cronológico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-clinic-600" />
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
          className="text-xs text-clinic-600 hover:text-clinic-800 font-semibold"
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

          // Normalized mappings as requested
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

          return (
            <div key={key} className="relative">
              {/* Timeline marker */}
              <div className="absolute -left-5 sm:-left-6 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 border-clinic-500 bg-white">
                <div className="h-1.5 w-1.5 rounded-full bg-clinic-600" />
              </div>

              {/* Accordion Card with strict layout & whitespace-pre-wrap */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all hover:border-slate-300">
                {/* Header (Clickable) */}
                <div
                  onClick={() => toggleExpand(key)}
                  className="flex items-center justify-between border-b border-slate-200 pb-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-clinic-600 shrink-0" />
                    <span className="font-semibold text-slate-700">
                      {formatDateLongChile(evolucion.fecha) || evolucion.fecha}
                    </span>
                    {evolucion.profesional && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 ml-2">
                        <User className="h-3 w-3" />
                        {evolucion.profesional}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {nivel_dolor_ena !== null && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded font-medium">
                        ENA: {nivel_dolor_ena}/10
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
                  <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
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
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                          A - Análisis
                        </span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">
                          {a_analisis}
                        </p>
                      </div>
                    )}

                    {p_plan && (
                      <div>
                        <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
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
    </div>
  );
}
