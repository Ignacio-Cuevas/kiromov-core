"use client";

import * as React from "react";
import { Header } from "@/components/dashboard/Header";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { PatientDrawer } from "@/components/patients/PatientDrawer";
import { VistaResumenPaciente } from "@/types/database";
import {
  fetchVistaResumenPacientes,
  registrarAsistenciaHoy,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { toast } from "sonner";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  RefreshCw,
  Sparkles,
  Users2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [patients, setPatients] = React.useState<VistaResumenPaciente[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] =
    React.useState<VistaResumenPaciente | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Load patients data from Supabase / vista_resumen_pacientes
  const loadPatients = React.useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchVistaResumenPacientes();
      setPatients(data);
      if (showToast) {
        toast.success("Datos actualizados correctamente");
      }
    } catch (err) {
      console.error("Error fetching patients summary:", err);
      toast.error("Error al cargar la lista de pacientes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Handle row click to open patient drawer
  const handleSelectPatient = (patient: VistaResumenPaciente) => {
    setSelectedPatient(patient);
    setIsDrawerOpen(true);
  };

  // Direct quick attendance button from table row
  const handleRegisterQuickAttendance = async (
    patientId: string,
    patientName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent opening drawer

    try {
      const result = await registrarAsistenciaHoy(
        patientId,
        "Klgo. Ignacio Cuevas Silva"
      );

      if (result.success && result.data) {
        toast.success("¡Asistencia Registrada!", {
          description: `Atención de hoy marcada para ${patientName}`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        // Refresh summary view to reflect session decrement and last attention date
        await loadPatients();
      } else {
        toast.error("No se pudo registrar la asistencia.");
      }
    } catch (err) {
      toast.error("Error de conexión al marcar asistencia.");
    }
  };

  // Callback when attendance is registered from inside the drawer
  const handleAttendanceRegisteredFromDrawer = async () => {
    await loadPatients();
  };

  // Filter patients by search query (Name or RUT) and by selected status
  const filteredPatients = React.useMemo(() => {
    return patients.filter((patient) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cleanRutQuery = query.replace(/[^0-9kK]/g, "");
        const cleanPatientRut = patient.rut.toLowerCase().replace(/[^0-9kK]/g, "");

        const matchesName = patient.nombre_completo.toLowerCase().includes(query);
        const matchesCode = patient.codigo_paciente.toLowerCase().includes(query);
        const matchesRut =
          cleanRutQuery.length > 0 && cleanPatientRut.includes(cleanRutQuery);

        if (!matchesName && !matchesCode && !matchesRut) {
          return false;
        }
      }

      // 2. Status Filter
      if (selectedFilter && patient.estado_plan !== selectedFilter) {
        return false;
      }

      return true;
    });
  }, [patients, searchQuery, selectedFilter]);

  // Compute today's attendances count (patients whose last attention was today)
  const todayAttendanceCount = React.useMemo(() => {
    return patients.filter((p) => p.dias_sin_atencion === 0).length;
  }, [patients]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSupabaseOnline={isSupabaseConfigured}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Welcome and Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Panel de Gestión Clínica</span>
              <span className="text-xs font-semibold text-clinic-700 bg-clinic-100/70 border border-clinic-300/60 px-2.5 py-0.5 rounded-full">
                En vivo
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Control de sesiones activas, atenciones del día y registro de notas SOAP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPatients(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-clinic-600" : ""}`}
              />
              <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </Button>
          </div>
        </div>

        {/* Resumen KPI Cards */}
        <KpiCards
          patients={patients}
          todayAttendanceCount={todayAttendanceCount}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        {/* Data Table Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Lista de Pacientes ({filteredPatients.length})
              </h2>
            </div>
            {selectedFilter && (
              <span className="text-xs text-slate-500 font-medium">
                Filtrado por: <strong className="text-slate-800">{selectedFilter}</strong>
              </span>
            )}
          </div>

          <PatientTable
            patients={filteredPatients}
            onSelectPatient={handleSelectPatient}
            onRegisterQuickAttendance={handleRegisterQuickAttendance}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Patient Drawer Side Panel (Sheet) */}
      <PatientDrawer
        patient={selectedPatient}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onAttendanceRegistered={handleAttendanceRegisteredFromDrawer}
      />

      {/* Modern Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} KIROMOV Centro Clínico. Todos los derechos reservados.</p>
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-clinic-500" />
              Kiromov Core v1.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
