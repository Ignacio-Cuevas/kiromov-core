"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EstadoPlanBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VistaResumenPaciente } from "@/types/database";
import { formatRut, formatDateChile } from "@/lib/utils";
import {
  Calendar,
  Plus,
  FolderOpen,
  Eye,
  ShoppingCart,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientTableProps {
  patients: VistaResumenPaciente[];
  onSelectPatient: (patient: VistaResumenPaciente) => void;
  onRegisterQuickAttendance: (
    patientId: string,
    patientName: string,
    e: React.MouseEvent
  ) => void;
  onOpenSale?: (patient: VistaResumenPaciente) => void;
  isLoading?: boolean;
}

export function PatientTable({
  patients,
  onSelectPatient,
  onRegisterQuickAttendance,
  onOpenSale,
  isLoading = false,
}: PatientTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-clinic-600 border-t-transparent mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Cargando datos clínicos de pacientes...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Consultando registros de pacientes en Supabase
        </p>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <FolderOpen className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800">
          No se encontraron pacientes
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Intenta con otro término de búsqueda o registra un nuevo paciente con el botón superior.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="w-[100px] min-w-[90px]">Código</TableHead>
            <TableHead className="min-w-[180px]">Paciente</TableHead>
            <TableHead className="hidden md:table-cell min-w-[130px]">RUT</TableHead>
            <TableHead className="hidden sm:table-cell min-w-[110px]">Previsión</TableHead>
            <TableHead className="w-[180px] min-w-[160px]">Saldo Sesiones</TableHead>
            <TableHead className="hidden lg:table-cell min-w-[130px]">Última Atención</TableHead>
            <TableHead className="min-w-[140px]">Estado del Plan</TableHead>
            <TableHead className="text-right w-[240px] min-w-[240px]">Acciones Rápidas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => {
            const percent =
              patient.total_sesiones > 0
                ? Math.min(
                    100,
                    Math.round(
                      (patient.sesiones_consumidas / patient.total_sesiones) * 100
                    )
                  )
                : 0;

            const isWarning =
              patient.estado_plan === "Por Renovar (1 restante)";

            return (
              <TableRow
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="cursor-pointer group hover:bg-clinic-50/40 transition-colors"
              >
                {/* Código */}
                <TableCell className="font-mono text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span className="bg-slate-100 group-hover:bg-white group-hover:border-slate-300 border border-slate-200 px-2 py-1 rounded transition-colors">
                    {patient.codigo_paciente}
                  </span>
                </TableCell>

                {/* Nombre */}
                <TableCell className="font-medium text-slate-900 min-w-[180px]">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 group-hover:text-clinic-700 transition-colors block text-sm">
                      {patient.nombre_completo}
                    </span>
                    <div className="flex items-center gap-2 md:hidden">
                      <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                        {formatRut(patient.rut)}
                      </span>
                      {patient.prevision_salud && (
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-600">
                          {patient.prevision_salud}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* RUT con formato chileno estricto sin corte de línea */}
                <TableCell className="hidden md:table-cell whitespace-nowrap font-mono text-sm text-slate-700 min-w-[130px]">
                  {formatRut(patient.rut)}
                </TableCell>

                {/* Previsión */}
                <TableCell className="hidden sm:table-cell min-w-[110px]">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-md font-semibold inline-block whitespace-nowrap",
                      patient.prevision_salud === "Fonasa"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : patient.prevision_salud === "Isapre"
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : patient.prevision_salud === "Convenio"
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    )}
                  >
                    {patient.prevision_salud || "Particular"}
                  </span>
                </TableCell>

                {/* Progreso de Sesiones */}
                <TableCell className="min-w-[160px]">
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center justify-between text-xs whitespace-nowrap">
                      <span className="font-semibold text-slate-700">
                        {patient.sesiones_consumidas} / {patient.total_sesiones}{" "}
                        <span className="text-slate-400 font-normal">ses.</span>
                      </span>
                      <span
                        className={cn(
                          "font-bold text-[11px]",
                          isWarning ? "text-amber-600" : "text-slate-500"
                        )}
                      >
                        {patient.sesiones_restantes} rest.
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      indicatorColor={
                        isWarning
                          ? "bg-amber-500"
                          : percent >= 100
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                      }
                      className="h-2"
                    />
                  </div>
                </TableCell>

                {/* Última Atención */}
                <TableCell className="hidden lg:table-cell min-w-[130px] whitespace-nowrap">
                  {patient.ultima_atencion ? (
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDateChile(patient.ultima_atencion)}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {patient.dias_sin_atencion === 0
                          ? "Hoy"
                          : patient.dias_sin_atencion === 1
                          ? "Ayer"
                          : `Hace ${patient.dias_sin_atencion} días`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Sin atenciones
                    </span>
                  )}
                </TableCell>

                {/* Estado del Plan */}
                <TableCell className="min-w-[140px] whitespace-nowrap">
                  <EstadoPlanBadge estado={patient.estado_plan} />
                </TableCell>

                {/* Acciones Rápidas */}
                <TableCell className="text-right min-w-[240px]">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                    {/* Botón Nueva Venta */}
                    {onOpenSale && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSale(patient);
                        }}
                        className="h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 font-semibold text-xs transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                        title="Registrar nueva venta o recarga de plan"
                      >
                        <ShoppingCart className="h-3 w-3 shrink-0" />
                        <span>Venta</span>
                      </Button>
                    )}

                    {/* Botón Agendar */}
                    <Link
                      href={`/agenda?pacienteId=${patient.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 px-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 font-semibold text-xs transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                      title="Agendar cita en calendario"
                    >
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      <span>Agendar</span>
                    </Link>

                    {/* Botón Asistencia Rápida */}
                    <Button
                      size="sm"
                      onClick={(e) =>
                        onRegisterQuickAttendance(
                          patient.id,
                          patient.nombre_completo,
                          e
                        )
                      }
                      className="h-8 rounded-lg bg-clinic-50 text-clinic-700 hover:bg-clinic-600 hover:text-white border border-clinic-200 hover:border-clinic-600 font-semibold text-xs transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                      title="Registrar asistencia de hoy"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5] shrink-0" />
                      <span>Asist.</span>
                    </Button>

                    {/* Botón Ver Ficha */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient(patient);
                      }}
                      className="h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold text-xs transition-all flex items-center gap-1 shadow-2xs shrink-0"
                      title="Abrir ficha clínica completa"
                    >
                      <Eye className="h-3.5 w-3.5 text-clinic-600 shrink-0" />
                      <span>Ficha</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
