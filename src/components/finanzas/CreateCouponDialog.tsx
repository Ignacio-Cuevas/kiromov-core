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
import { CuponDescuento, TipoDescuentoCupon } from "@/types/database";
import { crearCupon } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import { toast } from "sonner";
import { Ticket, Percent, DollarSign, Plus, CheckCircle2, Calendar } from "lucide-react";

interface CreateCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCouponCreated: (coupon: CuponDescuento) => void;
}

export function CreateCouponDialog({
  open,
  onOpenChange,
  onCouponCreated,
}: CreateCouponDialogProps) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoDescuentoCupon>("monto_fijo");
  const [valorDescuento, setValorDescuento] = useState<number>(15000);
  const [limiteUsos, setLimiteUsos] = useState<string>("");
  const [fechaExpiracion, setFechaExpiracion] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      toast.error("Por favor ingresa un código de cupón.");
      return;
    }
    if (!descripcion.trim()) {
      toast.error("Por favor describe el propósito del cupón.");
      return;
    }
    if (valorDescuento <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await crearCupon({
        codigo: codigo.trim().toUpperCase(),
        descripcion: descripcion.trim(),
        tipo,
        valor_descuento: valorDescuento,
        limite_usos: limiteUsos ? parseInt(limiteUsos, 10) : null,
        activo: true,
        fecha_expiracion: fechaExpiracion || null,
      });

      if (result.success && result.data) {
        toast.success("¡Cupón creado exitosamente!", {
          description: `Código: ${result.data.codigo} (${result.data.tipo === "porcentaje" ? `${result.data.valor_descuento}%` : formatCLP(result.data.valor_descuento)})`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
        onCouponCreated(result.data);
        onOpenChange(false);
        // Reset form
        setCodigo("");
        setDescripcion("");
        setTipo("monto_fijo");
        setValorDescuento(15000);
        setLimiteUsos("");
        setFechaExpiracion("");
      } else {
        toast.error("Error al crear el cupón: " + (result.error || ""));
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
          <div className="rounded-xl bg-clinic-50 p-2.5 text-clinic-600 border border-clinic-100">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Crear Nuevo Cupón / GiftCard
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define el código promocional y el beneficio aplicable en las ventas.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Código */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Código Promocional *
          </label>
          <Input
            placeholder="Ej: BIENVENIDA, KIRO15, CONVENIO2026"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            disabled={isSaving}
            className="h-10 text-sm uppercase font-mono tracking-wider font-bold"
            required
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Descripción / Motivo *
          </label>
          <Input
            placeholder="Ej: Descuento primerizos por apertura o convenio institucional"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={isSaving}
            className="h-10 text-sm"
            required
          />
        </div>

        {/* Tipo de Descuento y Valor */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tipo de Descuento
            </label>
            <select
              value={tipo}
              onChange={(e) => {
                const newTipo = e.target.value as TipoDescuentoCupon;
                setTipo(newTipo);
                if (newTipo === "porcentaje" && valorDescuento > 100) {
                  setValorDescuento(10);
                } else if (newTipo === "monto_fijo" && valorDescuento <= 100) {
                  setValorDescuento(15000);
                }
              }}
              disabled={isSaving}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20"
            >
              <option value="monto_fijo">Monto Fijo (CLP)</option>
              <option value="porcentaje">Porcentaje (%)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              {tipo === "porcentaje" ? (
                <Percent className="h-3.5 w-3.5 text-clinic-600" />
              ) : (
                <DollarSign className="h-3.5 w-3.5 text-clinic-600" />
              )}
              {tipo === "porcentaje" ? "Porcentaje (%)" : "Valor (CLP)"} *
            </label>
            <Input
              type="number"
              min={1}
              max={tipo === "porcentaje" ? 100 : 1000000}
              step={tipo === "porcentaje" ? 1 : 1000}
              value={valorDescuento}
              onChange={(e) => setValorDescuento(parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
              className="h-10 text-sm font-semibold"
              required
            />
          </div>
        </div>

        {/* Límite de usos y Fecha de expiración */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Límite de Usos (Opcional)
            </label>
            <Input
              type="number"
              min={1}
              placeholder="Ilimitado"
              value={limiteUsos}
              onChange={(e) => setLimiteUsos(e.target.value)}
              disabled={isSaving}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Fecha Expiración (Opcional)
            </label>
            <Input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              disabled={isSaving}
              className="h-10 text-sm"
            />
          </div>
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
            className="bg-clinic-600 hover:bg-clinic-700 text-white font-bold gap-2 px-5"
          >
            <Plus className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Crear Cupón"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
