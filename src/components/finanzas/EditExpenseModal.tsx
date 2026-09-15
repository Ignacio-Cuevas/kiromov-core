"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { formatCLP, getChileanDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Receipt,
  DollarSign,
  Calendar,
  Save,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  egreso: any | null;
  onSuccess: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  egreso,
  onSuccess,
}: EditExpenseModalProps) {
  const supabase = createClient();

  const [fecha, setFecha] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("Insumos Clínicos");
  const [monto, setMonto] = useState<string | number>("");
  const [medioPago, setMedioPago] = useState<string>("Débito");
  const [observacion, setObservacion] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (egreso) {
      setFecha(egreso.fecha || (egreso.created_at ? egreso.created_at.split("T")[0] : getChileanDate()));
      setConcepto(egreso.concepto || "");
      setCategoria(egreso.categoria || "Insumos Clínicos");
      setMonto(egreso.monto_clp ?? "");
      setMedioPago(egreso.medio_pago || egreso.metodo_pago || "Débito");
      setObservacion(egreso.observacion || "");
    }
  }, [egreso, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!egreso?.id) return;

    if (!concepto.trim()) {
      toast.error("Por favor ingresa el concepto del egreso.");
      return;
    }

    const montoNum = parseInt(String(monto).replace(/\D/g, ""), 10) || 0;
    if (montoNum <= 0) {
      toast.error("El monto debe ser superior a $0 CLP.");
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) throw new Error("No hay conexión con la base de datos");

      const updatePayload = {
        concepto: concepto.trim(),
        categoria,
        monto_clp: montoNum,
        medio_pago: medioPago,
        metodo_pago: medioPago,
        fecha: fecha || getChileanDate(),
        observacion: observacion.trim() || null,
      };

      const { error } = await supabase
        .from("egresos_caja")
        .update(updatePayload)
        .eq("id", egreso.id);

      if (error) {
        console.error("Error al actualizar egreso:", error);
        throw new Error(error.message);
      }

      toast.success("Gasto / Egreso actualizado exitosamente", {
        description: `${concepto} — ${formatCLP(montoNum)}`,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar egreso");
    } finally {
      setIsSaving(false);
    }
  };

  const montoNum = parseInt(String(monto).replace(/\D/g, ""), 10) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-slate-800">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Editar Gasto / Egreso
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifica los detalles, fecha o monto del egreso registrado.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <DialogBody className="space-y-4">
          {/* Fecha y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="h-10 text-sm font-medium bg-slate-50/50"
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
                step={100}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={isSaving}
                className="h-10 text-sm font-extrabold text-rose-700 bg-slate-50/50"
                required
              />
            </div>
          </div>

          {/* Previsualización del Monto CLP */}
          {montoNum > 0 && (
            <div className="rounded-lg bg-rose-50/70 p-2.5 border border-rose-100 flex items-center justify-between text-xs text-rose-900">
              <span>Total a descontar del flujo:</span>
              <span className="font-extrabold text-rose-700 text-sm">
                - {formatCLP(montoNum)}
              </span>
            </div>
          )}

          {/* Concepto del gasto */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Concepto / Descripción *
            </label>
            <Input
              placeholder='Ej: "Insumos - Cintas kinesiológicas", "Estacionamiento", "Arriendo"'
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              disabled={isSaving}
              className="h-10 text-sm font-medium bg-slate-50/50"
              required
            />
          </div>

          {/* Categoría y Medio de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={isSaving}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Insumos Clínicos">Insumos Clínicos</option>
                <option value="Insumos">Insumos</option>
                <option value="Arriendo">Arriendo</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Servicios">Servicios</option>
                <option value="Traslado / Estacionamiento">Traslado / Estacionamiento</option>
                <option value="Marketing / Publicidad">Marketing / Publicidad</option>
                <option value="Equipamiento">Equipamiento</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Medio de Pago
              </label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                disabled={isSaving}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Débito">Débito</option>
                <option value="Débito / Transbank">Débito / Transbank</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
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
              placeholder="Detalles adicionales, proveedor, factura..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              disabled={isSaving}
              rows={2}
              className="text-sm bg-slate-50/50"
            />
          </div>
        </DialogBody>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
