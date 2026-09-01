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
  Printer,
  Receipt,
  Ticket,
} from "lucide-react";

interface PlansHistoryTabProps {
  planes: CompraPlan[];
  isLoading?: boolean;
  onOpenRenewModal?: () => void;
  onEmitCertificate?: (plan?: CompraPlan) => void;
}

export function PlansHistoryTab({
  planes,
  isLoading = false,
  onOpenRenewModal,
  onEmitCertificate,
}: PlansHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
        <p className="text-sm">Cargando historial de planes...</p>
      </div>
    );
  }

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

            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-colors hover:border-slate-300 space-y-3"
              >
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
                  <Badge
                    variant={isActivo ? "success" : "neutral"}
                    className="capitalize"
                  >
                    {plan.estado}
                  </Badge>
                </div>

                {/* Badge N° de Boleta y Medio de Pago */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-600 font-medium">Boleta N°:</span>
                    {boleta ? (
                      <span className="font-mono font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-md">
                        {boleta}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Sin boleta asociada</span>
                    )}
                  </div>

                  {plan.medio_pago && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Medio: {plan.medio_pago}
                    </span>
                  )}
                </div>

                {/* Métricas: Sesiones y Monto Total */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="text-slate-500 block text-[11px]">Total Sesiones</span>
                    <span className="text-base font-bold text-slate-800">
                      {plan.total_sesiones || plan.sesiones_totales} sesiones
                    </span>
                  </div>

                  <div className="rounded-xl bg-blue-50/70 p-2.5 border border-blue-100">
                    <span className="text-blue-800 block text-[11px]">Monto Total</span>
                    <span className="text-base font-extrabold text-blue-700">
                      {formatCLP(plan.total_final_clp ?? plan.valor_total ?? plan.monto_clp ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Botón para emitir certificado de reembolso con los datos de esta boleta */}
                {onEmitCertificate && (
                  <div className="pt-1 border-t border-slate-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEmitCertificate(plan)}
                      className="h-8 gap-1.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Emitir Certificado Reembolso</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlansHistoryTab;
