"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { PayPlanModal } from "./PayPlanModal";
import { EditPatientDialog } from "./EditPatientDialog";
import { ReimbursementCertificate } from "@/components/clinical/ReimbursementCertificate";
import { SOAPModal } from "@/components/clinical/SOAPModal";
import { SoapTimelineAccordion } from "./SoapTimelineAccordion";
import {
  VistaResumenPaciente,
  CitaAtencion,
  CompraPlan,
  EvolucionSOAP,
  EstadoPlan,
} from "@/types/database";
import {
  supabase,
  fetchCitasByPaciente,
  fetchPlanesByPaciente,
  fetchEvolucionesByPaciente,
  registrarAsistenciaHoy,
} from "@/lib/supabase";
import { formatRut, formatCLP, getWhatsAppUrl } from "@/lib/utils";
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
  FileText,
  Printer,
  Edit2,
  Receipt,
  AlertTriangle,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface PatientDrawerProps {
  patient: VistaResumenPaciente | any | null;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAttendanceRegistered?: (patientId: string) => void;
}

// Helper para determinar si un estado de cita corresponde a una atención consumida
export function isAttendedStatus(estado?: string | null): boolean {
  if (!estado) return false;
  const s = estado.toLowerCase().trim();
  return (
    s === "asistió" ||
    s === "asistio" ||
    s === "atendido" ||
    s === "completada" ||
    s === "completado" ||
    s === "inasistencia (descuenta sesión)"
  );
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

  const [currentPatient, setCurrentPatient] = useState<any | null>(patient);

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
  const [isPayPlanOpen, setIsPayPlanOpen] = useState(false);
  const [selectedPlanToPay, setSelectedPlanToPay] = useState<CompraPlan | null>(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [selectedBoletaForCert, setSelectedBoletaForCert] = useState<string | null>(null);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isSOAPModalOpen, setIsSOAPModalOpen] = useState(false);

  // 1. Cargar Datos del Paciente desde Supabase (Citas, Planes, SOAP)
  const loadPatientData = useCallback(async () => {
    if (!currentPatient?.id) return;
    setLoadingHistory(true);

    let soapData: EvolucionSOAP[] | null = null;
    let citasData: CitaAtencion[] | null = null;
    let planesData: CompraPlan[] | null = null;

    try {
      if (supabase) {
        // A. Citas y Atenciones
        const { data: cData, error: citasError } = await supabase
          .from("citas_atenciones")
          .select("*")
          .eq("paciente_id", currentPatient.id)
          .order("fecha", { ascending: false });

        if (!citasError && cData) {
          citasData = cData as CitaAtencion[];
        }

        // B. Compras y Planes Activos
        const { data: pData, error: planesError } = await supabase
          .from("compras_planes")
          .select("*")
          .eq("paciente_id", currentPatient.id)
          .order("fecha_compra", { ascending: false });

        if (!planesError && pData) {
          planesData = pData as CompraPlan[];
        }

        // C. Notas SOAP
        const { data: sData, error: soapError } = await supabase
          .from("evoluciones_soap")
          .select("*")
          .eq("paciente_id", currentPatient.id)
          .order("fecha", { ascending: false });

        if (!soapError && sData) {
          soapData = sData as EvolucionSOAP[];
        }
      }
    } catch (err) {
      console.warn("Error en consulta a Supabase:", err);
    }

    // Fallbacks locales
    if (!citasData) {
      citasData = await fetchCitasByPaciente(currentPatient.id);
    }
    if (!planesData) {
      planesData = await fetchPlanesByPaciente(currentPatient.id);
    }
    if (!soapData) {
      soapData = await fetchEvolucionesByPaciente(currentPatient.id);
    }

    setCitasPrevias(citasData || []);
    setPlanes(planesData || []);
    setEvoluciones(soapData || []);
    setLoadingHistory(false);
  }, [currentPatient?.id]);

  useEffect(() => {
    if (currentPatient?.id && isDrawerOpen) {
      loadPatientData();
    }
  }, [currentPatient?.id, isDrawerOpen, loadPatientData]);

  // 2. Cálculo Real de Consumo de Sesiones
  const {
    sesionesConsumidas,
    totalSesiones,
    sesionesRestantes,
    progressPercent,
    computedEstadoPlan,
    activePlan,
    isActivePlanPendingPayment,
  } = useMemo(() => {
    // Total de sesiones asistidas/completadas contabilizadas en citas_atenciones
    const countAttended = citasPrevias.filter((c) => isAttendedStatus(c.estado)).length;

    // Total de sesiones compradas en planes
    let totalPurchased = planes.reduce((acc, p) => acc + (p.total_sesiones || p.sesiones_totales || 0), 0);
    if (totalPurchased === 0 && currentPatient?.total_sesiones) {
      totalPurchased = currentPatient.total_sesiones;
    }

    const firstActivePlan = planes.find((p) => p.estado === "activo") || planes[0] || null;
    const isPending = (firstActivePlan?.estado_pago || "").toLowerCase().includes("pendiente") || (firstActivePlan?.estado_pago || "").toLowerCase() === "pending";

    const finalTotal = totalPurchased > 0 ? totalPurchased : countAttended > 0 ? countAttended : 0;
    const remaining = Math.max(0, finalTotal - countAttended);
    const percent = finalTotal > 0 ? Math.min(100, Math.round((countAttended / finalTotal) * 100)) : 0;

    let estadoPlan: EstadoPlan = "Sin Plan Activo";
    if (finalTotal === 0) {
      estadoPlan = "Sin Plan Activo";
    } else if (remaining === 0) {
      estadoPlan = "Plan Finalizado";
    } else if (remaining === 1) {
      estadoPlan = "Por Renovar (1 restante)";
    } else {
      estadoPlan = "Plan Vigente";
    }

    return {
      sesionesConsumidas: countAttended,
      totalSesiones: finalTotal,
      sesionesRestantes: remaining,
      progressPercent: percent,
      computedEstadoPlan: estadoPlan,
      activePlan: firstActivePlan,
      isActivePlanPendingPayment: isPending,
    };
  }, [citasPrevias, planes, currentPatient?.total_sesiones]);

  if (!currentPatient) return null;

  // 3. Acción [ ✓ Registrar Asistencia Hoy ]
  const handleRegisterAttendance = async () => {
    setIsRegisteringAttendance(true);

    try {
      const result = await registrarAsistenciaHoy(
        currentPatient.id,
        "Klgo. Ignacio Cuevas Silva"
      );

      if (result.success && result.data) {
        toast.success("¡Asistencia registrada correctamente!", {
          description: `Atención marcada para ${currentPatient.nombre_completo} hoy a las ${result.data.hora?.slice(0, 5) || "09:00"}`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        await loadPatientData();
        onAttendanceRegistered?.(currentPatient.id);
      } else {
        toast.error("No se pudo registrar la asistencia.");
      }
    } catch {
      toast.error("Error de conexión al registrar asistencia.");
    } finally {
      setIsRegisteringAttendance(false);
    }
  };

  const handleEvolutionSaved = (newEvo: EvolucionSOAP) => {
    setEvoluciones((prev) => [newEvo, ...prev]);
    loadPatientData();
  };

  const handlePlanPurchased = (newPlan: CompraPlan) => {
    setPlanes((prev) => [newPlan, ...prev]);
    loadPatientData();
    onAttendanceRegistered?.(currentPatient.id);
  };

  // Verificar si ya asistió hoy
  const nowLocal = new Date();
  const year = nowLocal.getFullYear();
  const month = String(nowLocal.getMonth() + 1).padStart(2, "0");
  const day = String(nowLocal.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const isTodayAttended = citasPrevias.some((c) => {
    return c.fecha === todayStr && isAttendedStatus(c.estado);
  });

  const inasistenciasCount = citasPrevias.filter((c) => {
    const st = (c.estado || "").toLowerCase();
    return (
      st.includes("inasistencia") ||
      st.includes("no asistió") ||
      st.includes("no asistio")
    );
  }).length;

  return (
    <>
      <Sheet open={isDrawerOpen} onOpenChange={handleClose}>
        <SheetHeader className="relative bg-slate-50/70 border-b border-slate-200">
          <SheetClose onClick={() => handleClose(false)} />

          <div className="space-y-3 pr-8">
            {/* Header: Código, Badge Estado del Plan e Inasistencias */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  {currentPatient.codigo_paciente || "PAC-CLINIC"}
                </span>
                <EstadoPlanBadge estado={computedEstadoPlan} />
                {inasistenciasCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {inasistenciasCount} inasistencia{inasistenciasCount > 1 ? "s" : ""}
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
                  onClick={() => {
                    setSelectedBoletaForCert(activePlan?.numero_boleta || null);
                    setIsCertificateOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200 shadow-2xs"
                  title="Generar certificado médico para reembolso"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>📄 Certificado Reembolso</span>
                </button>
              </div>
            </div>

            {/* Nombre del Paciente */}
            <SheetTitle className="text-2xl font-bold text-slate-900 leading-tight">
              {currentPatient.nombre_completo || currentPatient.full_name}
            </SheetTitle>

            {/* Metadata: RUT, Previsión, Teléfono con WhatsApp */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-400">RUT:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatRut(currentPatient.rut)}
                </span>
              </div>

              {(currentPatient.prevision || currentPatient.prevision_salud || currentPatient.health_insurance) && (
                <div className="flex items-center gap-1 font-medium">
                  <span className="text-slate-400">Previsión:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-xs">
                    {currentPatient.prevision || currentPatient.prevision_salud || currentPatient.health_insurance}
                  </span>
                </div>
              )}

              {currentPatient.telefono && (
                <a
                  href={getWhatsAppUrl(currentPatient.telefono, currentPatient.nombre_completo || currentPatient.full_name)}
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

            {/* Diagnóstico Clínico si está disponible */}
            {(currentPatient.diagnostico_principal || currentPatient.diagnostico_medico || currentPatient.medical_notes) && (
              <div className="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-blue-600 font-bold">🩺 Diagnóstico Clínico:</span>
                <span>
                  {currentPatient.diagnostico_principal ||
                    currentPatient.diagnostico_medico ||
                    currentPatient.medical_notes}
                </span>
              </div>
            )}

            {/* Tarjeta de Consumo de Sesiones Real y Estado de Pago */}
            <div className="mt-2 rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">
                    Consumo de Sesiones:{" "}
                    <strong className="text-slate-900 font-extrabold text-sm">
                      {sesionesConsumidas} / {totalSesiones}
                    </strong>
                  </span>
                  {activePlan?.numero_boleta && (
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                      <Receipt className="h-3 w-3" />
                      Boleta N°: {activePlan.numero_boleta}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      sesionesRestantes <= 1
                        ? "font-bold text-amber-600"
                        : "font-semibold text-blue-700"
                    }
                  >
                    {sesionesRestantes} restantes ({progressPercent}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRenewPlanOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 ml-1"
                  >
                    <Plus className="h-3 w-3" />
                    Renovar
                  </button>
                </div>
              </div>

              <Progress value={progressPercent} />

              {/* Si el plan activo tiene pago pendiente, mostrar aviso destacado */}
              {isActivePlanPendingPayment && activePlan && (
                <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      ⚠️ Pago Pendiente ({formatCLP(activePlan.total_final_clp ?? activePlan.valor_total ?? activePlan.monto_clp ?? 0)})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPlanToPay(activePlan);
                      setIsPayPlanOpen(true);
                    }}
                    className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1 rounded-lg shadow-2xs"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pagar</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Botón de Acción Rápida: Registrar Asistencia Hoy */}
            <div className="pt-1">
              <Button
                onClick={handleRegisterAttendance}
                disabled={isRegisteringAttendance}
                className={`w-full h-12 text-base font-bold shadow-md transition-all flex items-center justify-center gap-2 rounded-xl ${
                  isTodayAttended
                    ? "bg-slate-800 hover:bg-slate-900 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20"
                }`}
              >
                <Check className="h-5 w-5 stroke-[2.5]" />
                {isRegisteringAttendance
                  ? "Registrando atención..."
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
                badge={citasPrevias.length}
                className="text-xs sm:text-sm font-semibold"
              >
                <CalendarCheck className="h-4 w-4 hidden sm:inline" />
                Asistencias ({citasPrevias.length})
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                badge={planes.length}
                className="text-xs sm:text-sm font-semibold"
              >
                <Package className="h-4 w-4 hidden sm:inline" />
                Planes ({planes.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: FORMULARIO SOAP */}
            <TabsContent value="soap" className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  onClick={() => setIsSOAPModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
                >
                  + Nueva Evolución SOAP
                </Button>
              </div>
              <SoapTimelineAccordion
                evoluciones={evoluciones}
                isLoading={loadingHistory}
              />
            </TabsContent>

            {/* TAB 2: HISTORIAL DE ASISTENCIAS Y EVOLUCIONES */}
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
                    onClick={() => {
                      setSelectedBoletaForCert(activePlan?.numero_boleta || null);
                      setIsCertificateOpen(true);
                    }}
                    className="h-8 gap-1.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
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

            {/* TAB 3: PLANES */}
            <TabsContent value="plans">
              <PlansHistoryTab
                planes={planes}
                isLoading={loadingHistory}
                sesionesConsumidas={sesionesConsumidas}
                onOpenRenewModal={() => setIsRenewPlanOpen(true)}
                onEmitCertificate={(plan) => {
                  setSelectedBoletaForCert(plan?.numero_boleta || null);
                  setIsCertificateOpen(true);
                }}
                onPayPlan={(plan) => {
                  setSelectedPlanToPay(plan);
                  setIsPayPlanOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </SheetBody>
      </Sheet>

      {/* Modales Auxiliares */}
      {isRenewPlanOpen && (
        <RenewPlanDialog
          pacienteId={currentPatient.id}
          pacienteNombre={currentPatient.nombre_completo || currentPatient.full_name}
          open={isRenewPlanOpen}
          onOpenChange={setIsRenewPlanOpen}
          onPlanPurchased={handlePlanPurchased}
        />
      )}

      {isPayPlanOpen && selectedPlanToPay && (
        <PayPlanModal
          open={isPayPlanOpen}
          onOpenChange={setIsPayPlanOpen}
          onClose={() => {
            setIsPayPlanOpen(false);
            setSelectedPlanToPay(null);
          }}
          plan={selectedPlanToPay}
          patientName={currentPatient.nombre_completo || currentPatient.full_name}
          onSuccess={() => {
            loadPatientData();
            onAttendanceRegistered?.(currentPatient.id);
          }}
        />
      )}

      {isCertificateOpen && (
        <ReimbursementCertificate
          isOpen={isCertificateOpen}
          onClose={() => {
            setIsCertificateOpen(false);
            setSelectedBoletaForCert(null);
          }}
          patient={currentPatient}
          evoluciones={evoluciones}
          citas={citasPrevias}
          numeroBoleta={selectedBoletaForCert}
        />
      )}

      {isEditPatientOpen && (
        <EditPatientDialog
          isOpen={isEditPatientOpen}
          onClose={() => setIsEditPatientOpen(false)}
          patient={currentPatient}
          onPatientUpdated={(updated) => {
            setCurrentPatient(updated);
            loadPatientData();
            onAttendanceRegistered?.(currentPatient.id);
          }}
        />
      )}

      {isSOAPModalOpen && (
        <SOAPModal
          isOpen={isSOAPModalOpen}
          onClose={() => setIsSOAPModalOpen(false)}
          pacienteId={currentPatient.id}
          pacienteNombre={currentPatient.nombre_completo || currentPatient.full_name}
          onEvolutionSaved={handleEvolutionSaved}
        />
      )}
    </>
  );
}

export default PatientDrawer;
