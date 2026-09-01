"use client";

import * as React from "react";
import { CompraPlan } from "@/types/database";
import { formatDateChile, formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  PackageCheck,
  Calendar,
  Plus,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface PlansHistoryTabProps {
  planes: CompraPlan[];
  isLoading?: boolean;
  sesionesConsumidas?: number;
  onOpenRenewModal?: () => void;
  onEmitCertificate?: (plan?: CompraPlan) => void;
  onPayPlan?: (plan: CompraPlan) => void;
}

export function PlansHistoryTab({
  planes,
  isLoading = false,
  sesionesConsumidas = 0,
  onOpenRenewModal,
  onEmitCertificate,
  onPayPlan,
}: PlansHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
        <p className="text-sm">Cargando historial de planes...</p>
      </div>
    );
  }

  const isPendingPayment = (plan: CompraPlan) => {
    const st = (plan.estado_pago || "").toLowerCase().trim();
    return st.includes("pendiente") || st === "pending" || st === "unpaid";
  };

  return (
    <div className="space-y-4">
      {/* Header with Add/Renew Plan Button */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-blue-600" />
          Historial de Planes Adquiridos ({planes.length})
        </h4>

        {onOpenRenewModal && (
          <Button
            size="sm"
            onClick={onOpenRenewModal}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Vender / Renovar Plan</span>
          </Button>
        )}
      </div>

      {planes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50 space-y-3">
          <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
          <div>
            <p className="text-sm font-bold text-slate-700">
              No hay planes contratados registrados.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Puedes asignar un nuevo plan desde el catálogo de tarifas.
            </p>
          </div>
          {onOpenRenewModal && (
            <Button
              size="sm"
              onClick={onOpenRenewModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Vender Primer Plan</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {planes.map((plan) => {
            const isActivo = plan.estado === "activo";
            const boleta = plan.numero_boleta;
            const pending = isPendingPayment(plan);
            const planTotalSessions = plan.total_sesiones || plan.sesiones_totales || 1;
            const usedSessions = plan.sesiones_usadas ?? sesionesConsumidas;
            const remainingSessions = Math.max(0, planTotalSessions - usedSessions);
            const planAmount = plan.total_final_clp ?? plan.valor_total ?? plan.monto_clp ?? 0;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-white p-4 shadow-2xs transition-colors space-y-3 ${
                  pending
                    ? "border-amber-300/80 bg-amber-50/20 hover:border-amber-400"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Cabecera del Plan */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">
                      {plan.nombre_plan}
                    </h5>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Fecha de compra: {formatDateChile(plan.fecha_compra)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={isActivo ? "success" : "neutral"}
                      className="capitalize"
                    >
                      {plan.estado}
                    </Badge>
                  </div>
                </div>

                {/* Progreso de Sesiones del Plan */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    Progreso:{" "}
                    <strong className="text-slate-900 font-extrabold">
                      {usedSessions} / {planTotalSessions} sesiones consumidas
                    </strong>
                  </span>
                  <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {remainingSessions} restantes
                  </span>
                </div>

                {/* Badge de Estado de Pago */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs">
                  {pending ? (
                    <div className="flex items-center gap-2 text-amber-900 font-bold bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span>⚠️ Pago Pendiente ({formatCLP(planAmount)})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>
                        ✓ Pagado {boleta ? `(Boleta N°: ${boleta})` : "(Sin boleta asociada)"}
                      </span>
                    </div>
                  )}

                  {plan.medio_pago && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Medio: {plan.medio_pago}
                    </span>
                  )}
                </div>

                {/* Acciones del Plan: Registrar Cobro si está pendiente, o Emitir Certificado */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {pending && onPayPlan && (
                      <Button
                        size="sm"
                        onClick={() => onPayPlan(plan)}
                        className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>💳 Registrar Cobro / Pago</span>
                      </Button>
                    )}
                  </div>

                  {onEmitCertificate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEmitCertificate(plan)}
                      className="h-8 gap-1.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Emitir Certificado Reembolso</span>
                    </Button>
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

export default PlansHistoryTab;
