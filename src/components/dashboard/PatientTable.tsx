"use client";

import * as React from "react";
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
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  User,
  Activity,
  AlertCircle,
  FolderOpen,
  Eye,
  FileText,
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
  isLoading?: boolean;
}

export function PatientTable({
  patients,
  onSelectPatient,
  onRegisterQuickAttendance,
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
          Consultando vista_resumen_pacientes
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
          Intenta con otro término de búsqueda o cambia los filtros de estado aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="w-[110px]">Código</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="hidden md:table-cell">RUT</TableHead>
            <TableHead className="w-[200px]">Progreso Sesiones</TableHead>
            <TableHead className="hidden lg:table-cell">Última Atención</TableHead>
            <TableHead>Estado del Plan</TableHead>
            <TableHead className="text-right w-[200px]">Acciones</TableHead>
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
                <TableCell className="font-mono text-xs font-bold text-slate-500">
                  <span className="bg-slate-100 group-hover:bg-white group-hover:border-slate-300 border border-slate-200 px-2 py-1 rounded transition-colors">
                    {patient.codigo_paciente}
                  </span>
                </TableCell>

                {/* Nombre */}
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 group-hover:text-clinic-700 transition-colors block text-sm">
                      {patient.nombre_completo}
                    </span>
                    <span className="md:hidden text-xs text-slate-400 block font-mono">
                      {formatRut(patient.rut)}
                    </span>
                  </div>
                </TableCell>

                {/* RUT */}
                <TableCell className="hidden md:table-cell font-mono text-xs text-slate-600">
                  {formatRut(patient.rut)}
                </TableCell>

                {/* Progreso de Sesiones */}
                <TableCell>
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {patient.sesiones_consumidas} / {patient.total_sesiones}{" "}
                        <span className="text-slate-400 font-normal">sesiones</span>
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
                <TableCell className="hidden lg:table-cell">
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
                <TableCell>
                  <EstadoPlanBadge estado={patient.estado_plan} />
                </TableCell>

                {/* Acciones: [ + Asistencia ] y [ Ver Ficha ] */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      onClick={(e) =>
                        onRegisterQuickAttendance(
                          patient.id,
                          patient.nombre_completo,
                          e
                        )
                      }
                      className="h-8 rounded-lg bg-clinic-50 text-clinic-700 hover:bg-clinic-600 hover:text-white border border-clinic-200 hover:border-clinic-600 font-semibold text-xs transition-all shadow-2xs hover:shadow-xs flex items-center gap-1"
                      title="Registrar asistencia hoy"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Asistencia</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient(patient);
                      }}
                      className="h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold text-xs transition-all flex items-center gap-1 shadow-2xs"
                      title="Abrir ficha clínica completa"
                    >
                      <Eye className="h-3.5 w-3.5 text-clinic-600" />
                      <span>Ver Ficha</span>
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
