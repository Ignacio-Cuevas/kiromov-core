"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EstadoPlanBadge } from "@/components/ui/badge";
import { SoapEvolutionForm } from "./SoapEvolutionForm";
import { AttendanceHistoryTab } from "./AttendanceHistoryTab";
import { PlansHistoryTab } from "./PlansHistoryTab";
import { RenewPlanDialog } from "./RenewPlanDialog";
import { ClinicalCertificateDialog } from "./ClinicalCertificateDialog";
import { EditPatientDialog } from "./EditPatientDialog";
import {
  VistaResumenPaciente,
  CitaAtencion,
  CompraPlan,
  EvolucionSOAP,
} from "@/types/database";
import {
  supabase,
  fetchCitasByPaciente,
  fetchPlanesByPaciente,
  fetchEvolucionesByPaciente,
  registrarAsistenciaHoy,
} from "@/lib/supabase";
import { formatRut, getWhatsAppUrl } from "@/lib/utils";
import { toast } from "sonner";
import {
  MessageCircle,
  CalendarCheck,
  Stethoscope,
  Package,
  Check,
  CheckCircle2,
  Mail,
  Plus,
  CreditCard,
  FileText,
  Printer,
  Edit2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface PatientDrawerProps {
  patient: VistaResumenPaciente | null;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAttendanceRegistered?: (patientId: string) => void;
}

export function PatientDrawer({
  patient,
  open,
  isOpen,
  onOpenChange,
  onClose,
  onAttendanceRegistered,
}: PatientDrawerProps) {
  const isDrawerOpen = isOpen ?? open ?? false;
  const handleClose = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    if (!nextOpen && onClose) onClose();
  };

  const [currentPatient, setCurrentPatient] = useState<VistaResumenPaciente | null>(patient);

  useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

  const [activeTab, setActiveTab] = useState("soap");
  const [evoluciones, setEvoluciones] = useState<EvolucionSOAP[]>([]);
  const [citasPrevias, setCitasPrevias] = useState<CitaAtencion[]>([]);
  const [planes, setPlanes] = useState<CompraPlan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRegisteringAttendance, setIsRegisteringAttendance] = useState(false);
  const [isRenewPlanOpen, setIsRenewPlanOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);

  // Hook que se dispara cada vez que cambia el paciente o se abre el drawer
  useEffect(() => {
    if (!currentPatient?.id || !isDrawerOpen) return;

    let isMounted = true;

    async function loadPatientData() {
      if (!currentPatient?.id) return;
      setLoadingHistory(true);

      let soapData: EvolucionSOAP[] | null = null;
      let citasData: CitaAtencion[] | null = null;
      let planesData: CompraPlan[] | null = null;

      try {
        if (supabase) {
          // 1. Obtener notas SOAP directamente de Supabase
          const { data: sData, error: soapError } = await supabase
            .from("evoluciones_soap")
            .select("*")
            .eq("paciente_id", currentPatient.id)
            .order("fecha", { ascending: false });

          if (soapError) {
            console.error("Error SOAP:", soapError);
          } else if (sData && sData.length > 0) {
            soapData = sData as EvolucionSOAP[];
          }

          // 2. Obtener historial de citas directamente de Supabase
          const { data: cData, error: citasError } = await supabase
            .from("citas_atenciones")
            .select("*")
            .eq("paciente_id", currentPatient.id)
            .order("fecha", { ascending: false });

          if (citasError) {
            console.error("Error Citas:", citasError);
          } else if (cData && cData.length > 0) {
            citasData = cData as CitaAtencion[];
          }

          // 3. Obtener planes directamente de Supabase
          const { data: pData, error: planesError } = await supabase
            .from("compras_planes")
            .select("*")
            .eq("paciente_id", currentPatient.id)
            .order("fecha_compra", { ascending: false });

          if (planesError) {
            console.error("Error Planes:", planesError);
          } else if (pData && pData.length > 0) {
            planesData = pData as CompraPlan[];
          }
        }
      } catch (err) {
        console.warn("Error en consulta a Supabase, usando respaldo:", err);
      }

      // Si no hay datos en BD o está en modo local/fallback, consultar respaldo
      if (!soapData) {
        soapData = await fetchEvolucionesByPaciente(currentPatient.id);
      }
      if (!citasData) {
        citasData = await fetchCitasByPaciente(currentPatient.id);
      }
      if (!planesData) {
        planesData = await fetchPlanesByPaciente(currentPatient.id);
      }

      if (isMounted) {
        setEvoluciones(soapData || []);
        setCitasPrevias(citasData || []);
        setPlanes(planesData || []);
        setLoadingHistory(false);
      }
    }

    loadPatientData();

    return () => {
      isMounted = false;
    };
  }, [currentPatient?.id, isDrawerOpen]);

  if (!currentPatient) return null;

  const handleRegisterAttendance = async () => {
    setIsRegisteringAttendance(true);

    try {
      const result = await registrarAsistenciaHoy(
        currentPatient.id,
        "Klgo. Ignacio Cuevas Silva"
      );

      if (result.success && result.data) {
        setCitasPrevias((prev) => [result.data!, ...prev]);
        toast.success("¡Asistencia registrada correctamente!", {
          description: `Atención marcada para ${currentPatient.nombre_completo} hoy a las ${result.data.hora || "09:00"}`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        onAttendanceRegistered?.(currentPatient.id);
      } else {
        toast.error("No se pudo registrar la asistencia.");
      }
    } catch (err) {
      toast.error("Error de conexión al registrar asistencia.");
    } finally {
      setIsRegisteringAttendance(false);
    }
  };

  const handleEvolutionSaved = (newEvo: EvolucionSOAP) => {
    setEvoluciones((prev) => [newEvo, ...prev]);
  };

  const handlePlanPurchased = (newPlan: CompraPlan) => {
    setPlanes((prev) => [newPlan, ...prev]);
    onAttendanceRegistered?.(currentPatient.id);
  };

  const progressPercent =
    currentPatient.total_sesiones > 0
      ? Math.min(
          100,
          Math.round(
            (currentPatient.sesiones_consumidas / currentPatient.total_sesiones) * 100
          )
        )
      : 0;

  const isTodayAttended = citasPrevias.some((c) => {
    const today = new Date().toISOString().split("T")[0];
    return c.fecha === today && c.estado === "Asistió";
  });

  const inasistenciasCount =
    currentPatient.inasistencias_acumuladas ??
    citasPrevias.filter(
      (c) =>
        c.estado === "Inasistencia (Descuenta Sesión)" ||
        c.estado === "No Asistió"
    ).length;

  return (
    <>
      <Sheet open={isDrawerOpen} onOpenChange={handleClose}>
        <SheetHeader className="relative bg-slate-50/70 border-b border-slate-200">
          <SheetClose onClick={() => handleClose(false)} />

          <div className="space-y-3 pr-8">
            {/* Code, Status Badge, Inasistencias and Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  {currentPatient.codigo_paciente}
                </span>
                <EstadoPlanBadge estado={currentPatient.estado_plan} />
                {inasistenciasCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    ⚠️ {inasistenciasCount} inasistencia{inasistenciasCount > 1 ? "s" : ""} registrada{inasistenciasCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Botones de Cabecera: Editar y Certificado */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditPatientOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
                  title="Editar ficha y diagnóstico del paciente"
                >
                  <Edit2 className="h-3 w-3 text-slate-600" />
                  <span>✏️ Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200 shadow-2xs"
                  title="Generar certificado médico para reembolso"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>📄 Certificado Reembolso</span>
                </button>
              </div>
            </div>

            {/* Name */}
            <SheetTitle className="text-2xl font-bold text-slate-900 leading-tight">
              {currentPatient.nombre_completo}
            </SheetTitle>

            {/* Metadata: RUT, Phone with WhatsApp */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-400">RUT:</span>
                <span className="font-semibold text-slate-800">
                  {formatRut(currentPatient.rut)}
                </span>
              </div>

              {currentPatient.telefono && (
                <a
                  href={getWhatsAppUrl(currentPatient.telefono, currentPatient.nombre_completo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors border border-emerald-200"
                  title="Abrir chat de WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                  <span>{currentPatient.telefono}</span>
                </a>
              )}

              {currentPatient.email && (
                <div className="hidden sm:flex items-center gap-1 text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{currentPatient.email}</span>
                </div>
              )}
            </div>

            {/* Diagnóstico Médico si está ingresado */}
            {(currentPatient.diagnostico_medico || currentPatient.diagnostico_principal) && (
              <div className="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-blue-600 font-bold">🩺 Diagnóstico Clínico:</span>
                <span>{currentPatient.diagnostico_medico || currentPatient.diagnostico_principal}</span>
              </div>
            )}

            {/* Session Progress Card with Quick Plan Renewal Button */}
            <div className="mt-2 rounded-xl bg-white p-3 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600">
                  Consumo de Sesiones:{" "}
                  <strong className="text-slate-900">
                    {currentPatient.sesiones_consumidas} / {currentPatient.total_sesiones}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      currentPatient.sesiones_restantes <= 1
                        ? "font-bold text-amber-600"
                        : "font-semibold text-clinic-700"
                    }
                  >
                    {currentPatient.sesiones_restantes} restantes ({progressPercent}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRenewPlanOpen(true)}
                    className="text-[11px] font-bold text-clinic-600 hover:text-clinic-800 hover:underline flex items-center gap-0.5 ml-1"
                  >
                    <Plus className="h-3 w-3" />
                    Renovar
                  </button>
                </div>
              </div>
              <Progress value={progressPercent} />
            </div>

            {/* Featured Quick Action: Registrar Asistencia Hoy */}
            <div className="pt-1">
              <Button
                onClick={handleRegisterAttendance}
                disabled={isRegisteringAttendance}
                className={`w-full h-12 text-base font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  isTodayAttended
                    ? "bg-slate-800 hover:bg-slate-900 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25"
                }`}
              >
                <Check className="h-5 w-5 stroke-[2.5]" />
                {isRegisteringAttendance
                  ? "Registrando..."
                  : isTodayAttended
                  ? "✓ Registrar Nueva Atención Hoy"
                  : "✓ Registrar Asistencia Hoy"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="bg-slate-50/30">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-200/70 p-1 rounded-xl">
              <TabsTrigger value="soap" className="text-xs sm:text-sm font-semibold">
                <Stethoscope className="h-4 w-4 hidden sm:inline" />
                Evolución SOAP
              </TabsTrigger>
              <TabsTrigger
                value="history"
                badge={citasPrevias.length + evoluciones.length}
                className="text-xs sm:text-sm font-semibold"
              >
                <CalendarCheck className="h-4 w-4 hidden sm:inline" />
                Historial
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                badge={planes.length}
                className="text-xs sm:text-sm font-semibold"
              >
                <Package className="h-4 w-4 hidden sm:inline" />
                Planes
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SOAP EVOLUTION */}
            <TabsContent value="soap">
              <SoapEvolutionForm
                pacienteId={currentPatient.id}
                pacienteNombre={currentPatient.nombre_completo}
                onEvolutionSaved={handleEvolutionSaved}
                previousEvolutions={evoluciones}
                isLoadingEvolutions={loadingHistory}
              />
            </TabsContent>

            {/* TAB 2: ATTENDANCE & SOAP HISTORY */}
            <TabsContent value="history">
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Certificación de Atenciones para Reembolso</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCertificateOpen(true)}
                    className="h-8 gap-1.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Emitir Certificado</span>
                  </Button>
                </div>

                <AttendanceHistoryTab
                  citas={citasPrevias}
                  evoluciones={evoluciones}
                  isLoading={loadingHistory}
                />
              </div>
            </TabsContent>

            {/* TAB 3: PLANS */}
            <TabsContent value="plans">
              <PlansHistoryTab
                planes={planes}
                isLoading={loadingHistory}
                onOpenRenewModal={() => setIsRenewPlanOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </SheetBody>
      </Sheet>

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        isOpen={isEditPatientOpen}
        open={isEditPatientOpen}
        onClose={() => setIsEditPatientOpen(false)}
        onOpenChange={setIsEditPatientOpen}
        patient={currentPatient}
        onPatientUpdated={(updated) => {
          setCurrentPatient(updated);
          onAttendanceRegistered?.(updated.id);
        }}
      />

      {/* Dynamic Plan Sale / Renewal Dialog */}
      <RenewPlanDialog
        pacienteId={currentPatient.id}
        pacienteNombre={currentPatient.nombre_completo}
        open={isRenewPlanOpen}
        onOpenChange={setIsRenewPlanOpen}
        onPlanPurchased={handlePlanPurchased}
      />

      {/* Clinical Certificate & Reimbursement Dialog */}
      <ClinicalCertificateDialog
        patient={currentPatient}
        citas={citasPrevias}
        citasAsistidas={citasPrevias}
        open={isCertificateOpen}
        isOpen={isCertificateOpen}
        onOpenChange={setIsCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
      />
    </>
  );
}

export default PatientDrawer;
