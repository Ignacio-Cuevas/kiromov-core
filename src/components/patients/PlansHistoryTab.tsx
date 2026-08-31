"use client";

import * as React from "react";
import { CompraPlan } from "@/types/database";
import { formatDateChile, formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, PackageCheck, Calendar, Plus, Sparkles } from "lucide-react";

interface PlansHistoryTabProps {
  planes: CompraPlan[];
  isLoading?: boolean;
  onOpenRenewModal?: () => void;
}

export function PlansHistoryTab({
  planes,
  isLoading = false,
  onOpenRenewModal,
}: PlansHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-clinic-600 border-t-transparent mb-2" />
        <p className="text-sm">Cargando historial de planes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add/Renew Plan Button */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-clinic-600" />
          Historial de Planes Adquiridos ({planes.length})
        </h4>

        {onOpenRenewModal && (
          <Button
            size="sm"
            onClick={onOpenRenewModal}
            className="h-8 gap-1.5 bg-clinic-600 hover:bg-clinic-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Vender / Renovar Plan</span>
          </Button>
        )}
      </div>

      {planes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50 space-y-3">
          <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-600">
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
              className="bg-clinic-600 hover:bg-clinic-700 text-white text-xs font-semibold gap-1.5"
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

            return (
              <div
                key={plan.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300 space-y-3"
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

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-500 block">Total Sesiones</span>
                    <span className="text-base font-bold text-slate-800">
                      {plan.total_sesiones} sesiones
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-500 block">Monto Total</span>
                    <span className="text-base font-bold text-clinic-700">
                      {formatCLP(plan.valor_total || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
