"use client";

import React, { useState, useEffect } from "react";
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
import { PlanCatalogo, CategoriaPlan, TipoPlan } from "@/types/database";
import { crearPlanCatalogo, actualizarPlanCatalogo } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import { toast } from "sonner";
import { Layers, Save, Tag, DollarSign, ListOrdered, CheckCircle2, Activity } from "lucide-react";

interface PlanEditDialogProps {
  plan: PlanCatalogo | null; // null when creating a new plan
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanSaved: (plan: PlanCatalogo) => void;
}

export function PlanEditDialog({
  plan,
  open,
  onOpenChange,
  onPlanSaved,
}: PlanEditDialogProps) {
  const [nombrePlan, setNombrePlan] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPlan>("General");
  const [tipo, setTipo] = useState<TipoPlan>("plan");
  const [totalSesiones, setTotalSesiones] = useState<number>(4);
  const [precioCLP, setPrecioCLP] = useState<number>(100000);
  const [activo, setActivo] = useState<boolean>(true);
  const [descripcion, setDescripcion] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setNombrePlan(plan.nombre_plan);
      setCategoria(plan.categoria);
      setTipo(plan.tipo || (plan.total_sesiones === 1 ? "single_session" : "plan"));
      setTotalSesiones(plan.total_sesiones);
      setPrecioCLP(plan.precio_clp);
      setActivo(plan.activo);
      setDescripcion(plan.descripcion || "");
    } else {
      setNombrePlan("");
      setCategoria("General");
      setTipo("plan");
      setTotalSesiones(4);
      setPrecioCLP(100000);
      setActivo(true);
      setDescripcion("");
    }
  }, [plan, open]);

  // When type changes, default sessions
  const handleTypeChange = (newType: TipoPlan) => {
    setTipo(newType);
    if (newType === "single_session" || newType === "evaluation") {
      setTotalSesiones(1);
    } else if (totalSesiones === 1) {
      setTotalSesiones(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombrePlan.trim()) {
      toast.error("Por favor ingresa el nombre del plan.");
      return;
    }
    if (totalSesiones <= 0) {
      toast.error("El número de sesiones debe ser mayor a 0.");
      return;
    }
    if (precioCLP < 0) {
      toast.error("El precio no puede ser negativo.");
      return;
    }

    setIsSaving(true);

    try {
      if (plan) {
        // Edit existing
        const result = await actualizarPlanCatalogo(plan.id, {
          nombre_plan: nombrePlan.trim(),
          categoria,
          tipo,
          total_sesiones: totalSesiones,
          precio_clp: precioCLP,
          activo,
          descripcion: descripcion.trim() || null,
        });

        if (result.success && result.data) {
          toast.success("Plan actualizado correctamente", {
            description: `${result.data.nombre_plan} — ${formatCLP(result.data.precio_clp)}`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });
          onPlanSaved(result.data);
          onOpenChange(false);
        } else {
          toast.error("Error al actualizar el plan: " + (result.error || ""));
        }
      } else {
        // Create new
        const result = await crearPlanCatalogo({
          nombre_plan: nombrePlan.trim(),
          categoria,
          tipo,
          total_sesiones: totalSesiones,
          precio_clp: precioCLP,
          activo,
          descripcion: descripcion.trim() || null,
        });

        if (result.success && result.data) {
          toast.success("¡Nuevo plan creado con éxito!", {
            description: `${result.data.nombre_plan} agregado al catálogo`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });
          onPlanSaved(result.data);
          onOpenChange(false);
        } else {
          toast.error("Error al crear el plan: " + (result.error || ""));
        }
      }
    } catch (err) {
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
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {plan ? "Editar Plan / Tarifa" : "Nuevo Plan / Tarifa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {plan
                ? "Modifica los valores del catálogo maestro en Supabase"
                : "Agrega una nueva tarifa disponible para la venta y asignación de sesiones"}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Nombre del plan */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Nombre del Plan / Tarifa *
          </label>
          <Input
            placeholder="Ej: Plan 10 Sesiones Pro Care / Evaluación Kine + TMO"
            value={nombrePlan}
            onChange={(e) => setNombrePlan(e.target.value)}
            disabled={isSaving}
            className="h-10 text-sm font-medium"
            required
          />
        </div>

        {/* Tipo de Servicio y Categoría */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tipo de Servicio
            </label>
            <select
              value={tipo}
              onChange={(e) => handleTypeChange(e.target.value as TipoPlan)}
              disabled={isSaving}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20 font-medium"
            >
              <option value="plan">Plan / Paquete de Sesiones</option>
              <option value="single_session">Sesión Individual</option>
              <option value="evaluation">Evaluación Kine + TMO</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaPlan)}
              disabled={isSaving}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20 font-medium"
            >
              <option value="General">General</option>
              <option value="Convenio">Convenio</option>
              <option value="Promoción">Promoción</option>
              <option value="Personalizado">Personalizado</option>
            </select>
          </div>
        </div>

        {/* Sesiones, Precio y Estado Activo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <ListOrdered className="h-3.5 w-3.5 text-clinic-600" />
              Nº Sesiones *
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={totalSesiones}
              onChange={(e) => setTotalSesiones(parseInt(e.target.value, 10) || 1)}
              disabled={isSaving}
              className="h-10 text-sm font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-clinic-600" />
              Precio CLP *
            </label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={precioCLP}
              onChange={(e) => setPrecioCLP(parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
              className="h-10 text-sm font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Estado en Venta
            </label>
            <div className="flex items-center h-10">
              <label className="relative inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  disabled={isSaving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="text-xs font-semibold text-slate-700">
                  {activo ? "Activo" : "Inactivo"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Previsualización de Valor Unitario por Sesión */}
        {totalSesiones > 0 && precioCLP > 0 && (
          <div className="rounded-lg bg-clinic-50 p-2.5 border border-clinic-200/60 flex items-center justify-between text-xs text-clinic-900">
            <span>Valor por Sesión Individual:</span>
            <span className="font-bold text-clinic-700">
              {formatCLP(Math.round(precioCLP / totalSesiones))} / sesión
            </span>
          </div>
        )}

        {/* Descripción opcional */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">
            Descripción / Beneficios incluidos (Opcional)
          </label>
          <Textarea
            placeholder="Ej: Evaluación postural TMO, reeducación funcional, punción seca y pauta kinesiológica personalizada..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
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
            className="bg-clinic-600 hover:bg-clinic-700 text-white font-bold gap-2 px-5 shadow-xs"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : plan ? "Guardar Cambios" : "Crear Plan"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default PlanEditDialog;
