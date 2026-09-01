"use client";

import * as React from "react";
import { CitaAtencion, EvolucionSOAP } from "@/types/database";
import { formatDateChile } from "@/lib/utils";
import {
  CalendarCheck2,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SoapTimelineAccordion } from "./SoapTimelineAccordion";

interface AttendanceHistoryTabProps {
  citas: CitaAtencion[];
  evoluciones?: EvolucionSOAP[];
  isLoading?: boolean;
}

export function AttendanceHistoryTab({
  citas,
  evoluciones = [],
  isLoading = false,
}: AttendanceHistoryTabProps) {
  const [viewMode, setViewMode] = React.useState<"asistencias" | "evoluciones">(
    "asistencias"
  );

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
        <p className="text-sm">Cargando historial de atenciones...</p>
      </div>
    );
  }

  const isAttended = (st?: string) => {
    const s = (st || "").toLowerCase();
    return s === "asistió" || s === "asistio" || s === "atendido" || s === "completada" || s === "completado";
  };

  const isCancelled = (st?: string) => {
    const s = (st || "").toLowerCase();
    return s.includes("cancelad") || s.includes("cancel");
  };

  const isMissed = (st?: string) => {
    const s = (st || "").toLowerCase();
    return s.includes("inasistencia") || s.includes("no asistió") || s.includes("no asistio");
  };

  return (
    <div className="space-y-5">
      {/* Sub-toggle between Asistencias and Evoluciones SOAP */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("asistencias")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
              viewMode === "asistencias"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CalendarCheck2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Asistencias ({citas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("evoluciones")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
              viewMode === "evoluciones"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>Evoluciones SOAP ({evoluciones.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Historial clínico de atenciones
        </span>
      </div>

      {viewMode === "evoluciones" ? (
        <SoapTimelineAccordion
          evoluciones={evoluciones}
          isLoading={isLoading}
        />
      ) : citas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
          <CalendarCheck2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">
            No hay registros de atenciones para este paciente.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Las asistencias marcadas aparecerán automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {citas.map((cita, index) => {
            const attended = isAttended(cita.estado);
            const cancelled = isCancelled(cita.estado);
            const missed = isMissed(cita.estado);

            return (
              <div key={cita.id || index} className="relative group">
                {/* Timeline Marker */}
                <div
                  className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white ${
                    attended
                      ? "border-emerald-500 text-emerald-600"
                      : missed
                      ? "border-rose-500 text-rose-600"
                      : cancelled
                      ? "border-slate-400 text-slate-400"
                      : "border-blue-500 text-blue-600"
                  }`}
                >
                  {attended ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : missed || cancelled ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                </div>

                {/* Attendance Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {formatDateChile(cita.fecha)}
                      </span>
                      {cita.hora && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {cita.hora.slice(0, 5)} hrs
                        </span>
                      )}
                    </div>

                    <Badge
                      variant={
                        attended
                          ? "success"
                          : missed
                          ? "destructive"
                          : cancelled
                          ? "secondary"
                          : "neutral"
                      }
                    >
                      {cita.estado}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      Atendido por: <strong className="text-slate-800">{cita.profesional || "Klgo. Ignacio Cuevas"}</strong>
                    </span>
                  </div>

                  {cita.motivo_consulta && (
                    <div className="text-xs text-blue-900 bg-blue-50/60 p-2 rounded-xl border border-blue-100/80 flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium">{cita.motivo_consulta}</span>
                    </div>
                  )}

                  {cita.notas && cita.notas !== cita.motivo_consulta && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                      &ldquo;{cita.notas}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AttendanceHistoryTab;
