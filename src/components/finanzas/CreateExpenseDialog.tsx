"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EgresoCaja, CategoriaEgreso, MedioPago } from "@/types/database";
import { crearEgresoCaja } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import { toast } from "sonner";
import {
  Receipt,
  DollarSign,
  Plus,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  FileText,
} from "lucide-react";

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseCreated: (expense: EgresoCaja) => void;
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onExpenseCreated,
}: CreateExpenseDialogProps) {
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] =
    useState<CategoriaEgreso>("Insumos Clínicos");
  const [montoCLP, setMontoCLP] = useState<number>(35000);
  const [medioPago, setMedioPago] =
    useState<MedioPago>("Transferencia");
  const [observacion, setObservacion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!concepto.trim()) {
      toast.error("Por favor ingresa el concepto del egreso o gasto.");
      return;
    }
    if (montoCLP <= 0) {
      toast.error("El monto debe ser superior a $0 CLP.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await crearEgresoCaja({
        fecha: fecha || new Date().toISOString().split("T")[0],
        concepto: concepto.trim(),
        categoria,
        monto_clp: montoCLP,
        medio_pago: medioPago,
        observacion: observacion.trim() || null,
        responsable: "Klgo. Ignacio Cuevas Silva",
      });

      if (result.success && result.data) {
        toast.success("¡Egreso registrado correctamente!", {
          description: `${result.data.concepto} — ${formatCLP(result.data.monto_clp)}`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
        onExpenseCreated(result.data);
        onOpenChange(false);
        // Reset form
        setConcepto("");
        setCategoria("Insumos Clínicos");
        setMontoCLP(35000);
        setMedioPago("Transferencia");
        setObservacion("");
      } else {
        toast.error("Error al registrar el egreso: " + (result.error || ""));
      }
    } catch {
      toast.error("Ocurrió un error inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-slate-800">
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 border border-rose-100">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Registrar Egreso / Gasto de Caja
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Asienta salidas de dinero, compras de insumos o costos de operación.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Fecha y Monto */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Fecha *
            </label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={isSaving}
              className="h-10 text-sm font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-rose-600" />
              Monto en CLP *
            </label>
            <Input
              type="number"
              min={1}
              step={1000}
              value={montoCLP}
              onChange={(e) => setMontoCLP(parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
              className="h-10 text-sm font-extrabold text-rose-700"
              required
            />
          </div>
        </div>

        {/* Previsualización del Monto CLP */}
        {montoCLP > 0 && (
          <div className="rounded-lg bg-rose-50/70 p-2.5 border border-rose-100 flex items-center justify-between text-xs text-rose-900">
            <span>Total a descontar del flujo:</span>
            <span className="font-extrabold text-rose-700 text-sm">
              - {formatCLP(montoCLP)}
            </span>
          </div>
        )}

        {/* Concepto del gasto */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Concepto del Gasto *
          </label>
          <Input
            placeholder='Ej: "Insumos - Cintas kinesiológicas", "Estacionamiento", "Arriendo"'
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            disabled={isSaving}
            className="h-10 text-sm font-medium"
            required
          />
        </div>

        {/* Categoría y Medio de Pago */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaEgreso)}
              disabled={isSaving}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20"
            >
              <option value="Insumos Clínicos">Insumos Clínicos</option>
              <option value="Traslado / Estacionamiento">Traslado / Estacionamiento</option>
              <option value="Servicios Básicos">Servicios Básicos</option>
              <option value="Arriendo">Arriendo</option>
              <option value="Marketing / Publicidad">Marketing / Publicidad</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Medio de Pago
            </label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPago)}
              disabled={isSaving}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20"
            >
              <option value="Débito / Transbank">Débito / Transbank</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </div>
        </div>

        {/* Observación Opcional */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Observación / Detalle Adicional (Opcional)
          </label>
          <Textarea
            placeholder="Ej: Número de factura, proveedor, detalle de insumos o motivo del traslado..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            disabled={isSaving}
            rows={2}
            className="text-sm"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 px-5"
          >
            <Plus className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Registrar Egreso"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
