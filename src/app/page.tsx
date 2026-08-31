"use client";

import * as React from "react";
import { Header } from "@/components/dashboard/Header";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { PatientDrawer } from "@/components/patients/PatientDrawer";
import { CreatePatientDialog } from "@/components/patients/CreatePatientDialog";
import { RegisterSaleDialog } from "@/components/finanzas/RegisterSaleDialog";
import { VistaResumenPaciente, Paciente, CompraPlan } from "@/types/database";
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
  Search,
  X,
  UserPlus,
  ShoppingCart,
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

  // Dialogs
  const [isCreatePatientOpen, setIsCreatePatientOpen] = React.useState(false);
  const [isRegisterSaleOpen, setIsRegisterSaleOpen] = React.useState(false);
  const [salePatientTarget, setSalePatientTarget] =
    React.useState<VistaResumenPaciente | null>(null);

  // Load patients data from Supabase / vista_resumen_pacientes
  const loadPatients = React.useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchVistaResumenPacientes();
      setPatients(data || []);
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

  // Open sale registration for specific patient
  const handleOpenSaleForPatient = (patient: VistaResumenPaciente) => {
    setSalePatientTarget(patient);
    setIsRegisterSaleOpen(true);
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

  const handlePatientCreated = async (newPatient: Paciente) => {
    await loadPatients();
  };

  const handleSaleRegistered = async (newSale: CompraPlan) => {
    await loadPatients();
  };

  // Filter patients with strict null-safety (Name, RUT, Phone, Code)
  const filteredPatients = React.useMemo(() => {
    const query = (searchQuery || "").trim().toLowerCase();
    const queryDigits = query.replace(/[^0-9kK]/g, "");

    return (patients || []).filter((p) => {
      // 1. Filtro por estado del plan
      if (selectedFilter) {
        if (selectedFilter === "Vigentes" && p?.estado_plan !== "Plan Vigente") return false;
        if (selectedFilter === "Por Renovar" && !p?.estado_plan?.includes("Por Renovar")) return false;
        if (selectedFilter === "Finalizados" && p?.estado_plan !== "Plan Finalizado") return false;
        if (
          selectedFilter !== "Vigentes" &&
          selectedFilter !== "Por Renovar" &&
          selectedFilter !== "Finalizados" &&
          p?.estado_plan !== selectedFilter
        ) {
          return false;
        }
      }

      // 2. Si no hay texto de búsqueda, pasa el filtro
      if (!query) return true;

      // 3. Extracción segura de campos (evitando null/undefined)
      const nombre = (p?.nombre_completo || "").toLowerCase();
      const rutRaw = (p?.rut || "").toLowerCase();
      const rutDigits = rutRaw.replace(/[^0-9kK]/g, "");
      const codigo = (p?.codigo_paciente || "").toLowerCase();
      const telefono = (p?.telefono || "").replace(/\D/g, "");

      return (
        nombre.includes(query) ||
        rutRaw.includes(query) ||
        (queryDigits.length >= 2 && rutDigits.includes(queryDigits)) ||
        codigo.includes(query) ||
        (queryDigits.length >= 3 && telefono.includes(queryDigits))
      );
    });
  }, [patients, searchQuery, selectedFilter]);

  // Compute today's attendances count (patients whose last attention was today)
  const todayAttendanceCount = React.useMemo(() => {
    return (patients || []).filter((p) => p?.dias_sin_atencion === 0).length;
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
              Control de sesiones activas, directorio de pacientes y emisión de ventas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <span>Actualizar</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setSalePatientTarget(null);
                setIsRegisterSaleOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>+ Registrar Venta</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreatePatientOpen(true)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Nuevo Paciente</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Directorio de Pacientes ({filteredPatients.length})
              </h2>
              {selectedFilter && (
                <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold ml-2">
                  Filtro: {selectedFilter}
                </span>
              )}
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Nombre, RUT o Teléfono..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <PatientTable
            patients={filteredPatients}
            onSelectPatient={handleSelectPatient}
            onRegisterQuickAttendance={handleRegisterQuickAttendance}
            onOpenSale={handleOpenSaleForPatient}
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

      {/* Create Patient Dialog */}
      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onPatientCreated={handlePatientCreated}
      />

      {/* Register Sale Dialog */}
      <RegisterSaleDialog
        open={isRegisterSaleOpen}
        onOpenChange={setIsRegisterSaleOpen}
        selectedPatient={salePatientTarget}
        onSaleRegistered={handleSaleRegistered}
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
