"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoPlan, VistaResumenPaciente } from "@/types/database";
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  patients: VistaResumenPaciente[];
  todayAttendanceCount: number;
  selectedFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
}

export function KpiCards({
  patients,
  todayAttendanceCount,
  selectedFilter,
  onSelectFilter,
}: KpiCardsProps) {
  // Compute counts
  const porRenovarCount = patients.filter(
    (p) => p.estado_plan === "Por Renovar (1 restante)"
  ).length;

  const planVigenteCount = patients.filter(
    (p) => p.estado_plan === "Plan Vigente"
  ).length;

  const totalPacientes = patients.length;

  return (
    <div className="space-y-4">
      {/* 3 Main KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* KPI 1: Atenciones Hoy */}
        <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-clinic-500/10" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Atenciones Hoy
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {todayAttendanceCount}
                </span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pacientes atendidos en la jornada
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-50 text-clinic-600 border border-clinic-100">
              <CalendarCheck className="h-6 w-6 stroke-[2]" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Pacientes Por Renovar (Clickable filter) */}
        <Card
          onClick={() => {
            if (selectedFilter === "Por Renovar (1 restante)") {
              onSelectFilter(null);
            } else {
              onSelectFilter("Por Renovar (1 restante)");
            }
          }}
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all duration-200 shadow-xs border-2",
            selectedFilter === "Por Renovar (1 restante)"
              ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/30"
              : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/10"
          )}
        >
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-500/10" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Por Renovar (1 restante)
                </p>
                {porRenovarCount > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-700 tracking-tight">
                  {porRenovarCount}
                </span>
                <span className="text-xs font-medium text-amber-600">
                  {selectedFilter === "Por Renovar (1 restante)"
                    ? "✓ Filtro activo"
                    : "Clic para filtrar"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Requieren renovación de plan pronta
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="h-6 w-6 stroke-[2]" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Total Pacientes con Plan Vigente */}
        <Card
          onClick={() => {
            if (selectedFilter === "Plan Vigente") {
              onSelectFilter(null);
            } else {
              onSelectFilter("Plan Vigente");
            }
          }}
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all duration-200 shadow-xs border-2",
            selectedFilter === "Plan Vigente"
              ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/30"
              : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/10"
          )}
        >
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Planes Vigentes
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                  {planVigenteCount}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  de {totalPacientes} pacientes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                En tratamiento activo continuo
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Users className="h-6 w-6 stroke-[2]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            Filtrar por:
          </span>

          <button
            type="button"
            onClick={() => onSelectFilter(null)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              selectedFilter === null
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            )}
          >
            Todos ({totalPacientes})
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter("Plan Vigente")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              selectedFilter === "Plan Vigente"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            )}
          >
            Vigentes ({planVigenteCount})
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter("Por Renovar (1 restante)")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              selectedFilter === "Por Renovar (1 restante)"
                ? "bg-amber-500 text-white font-semibold shadow-xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            )}
          >
            Por Renovar ({porRenovarCount})
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter("Plan Finalizado")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              selectedFilter === "Plan Finalizado"
                ? "bg-slate-700 text-white font-semibold shadow-xs"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            )}
          >
            Finalizados (
            {patients.filter((p) => p.estado_plan === "Plan Finalizado").length}
            )
          </button>
        </div>

        {selectedFilter && (
          <button
            type="button"
            onClick={() => onSelectFilter(null)}
            className="text-xs font-semibold text-clinic-600 hover:text-clinic-800 underline underline-offset-2"
          >
            Limpiar filtro
          </button>
        )}
      </div>
    </div>
  );
}
