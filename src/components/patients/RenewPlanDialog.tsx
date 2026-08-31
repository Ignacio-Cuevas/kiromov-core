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
import { PlanCatalogo, CompraPlan, CuponDescuento } from "@/types/database";
import {
  fetchCatalogoPlanes,
  registrarCompraPlan,
  validarCupon,
} from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import { toast } from "sonner";
import {
  PackagePlus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Ticket,
  Check,
  Percent,
} from "lucide-react";

interface RenewPlanDialogProps {
  pacienteId: string;
  pacienteNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanPurchased?: (newPlan: CompraPlan) => void;
}

export function RenewPlanDialog({
  pacienteId,
  pacienteNombre,
  open,
  onOpenChange,
  onPlanPurchased,
}: RenewPlanDialogProps) {
  const [catalogPlanes, setCatalogPlanes] = useState<PlanCatalogo[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customNombre, setCustomNombre] = useState<string>("");
  const [sesiones, setSesiones] = useState<number>(4);
  const [precioBase, setPrecioBase] = useState<number>(100000);
  const [descuentoCLP, setDescuentoCLP] = useState<number>(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<CuponDescuento | null>(null);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string>("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  // Load active catalog plans when dialog opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoadingCatalog(true);

    fetchCatalogoPlanes(true)
      .then((data) => {
        if (isMounted) {
          setCatalogPlanes(data);
          if (data.length > 0) {
            const first = data[0];
            setSelectedPlanId(first.id);
            setCustomNombre(first.nombre_plan);
            setSesiones(first.total_sesiones);
            setPrecioBase(first.precio_clp);
            setDescuentoCLP(0);
            setCouponCode("");
            setAppliedCoupon(null);
            setCouponSuccessMessage("");
          }
        }
      })
      .catch((err) => {
        console.error("Error loading catalog planes:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Handle plan selection from dropdown
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = catalogPlanes.find((p) => p.id === planId);
    if (plan) {
      setCustomNombre(plan.nombre_plan);
      setSesiones(plan.total_sesiones);
      setPrecioBase(plan.precio_clp);

      // Re-calculate coupon discount if one is already applied
      if (appliedCoupon) {
        let newDesc = 0;
        if (appliedCoupon.tipo === "porcentaje") {
          newDesc = Math.round((plan.precio_clp * appliedCoupon.valor_descuento) / 100);
        } else {
          newDesc = appliedCoupon.valor_descuento;
        }
        newDesc = Math.min(newDesc, plan.precio_clp);
        setDescuentoCLP(newDesc);
      }
    }
  };

  // Coupon validation
  const handleApplyCoupon = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) {
      toast.error("Por favor ingresa un código de cupón.");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const res = await validarCupon(couponCode, precioBase);

      if (res.valido && res.cupon && res.descuentoCalculadoCLP !== undefined) {
        setAppliedCoupon(res.cupon);
        setDescuentoCLP(res.descuentoCalculadoCLP);
        setCouponSuccessMessage(
          `Descuento de ${formatCLP(res.descuentoCalculadoCLP)} aplicado (${res.cupon.descripcion})`
        );
        toast.success("¡Cupón aplicado!", {
          description: res.mensaje,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
      } else {
        setAppliedCoupon(null);
        setCouponSuccessMessage("");
        toast.error("Cupón no válido", {
          description: res.mensaje,
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        });
      }
    } catch (err) {
      toast.error("Error al validar el cupón.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setDescuentoCLP(0);
    setCouponSuccessMessage("");
  };

  // Group active catalog plans by category
  const categories = ["General", "Convenio", "Promoción", "Personalizado"] as const;
  const groupedPlans = categories
    .map((cat) => ({
      category: cat,
      plans: catalogPlanes.filter((p) => p.categoria === cat),
    }))
    .filter((g) => g.plans.length > 0);

  const valorTotal = Math.max(0, precioBase - descuentoCLP);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customNombre.trim()) {
      toast.error("Por favor ingresa un nombre para el plan.");
      return;
    }
    if (sesiones <= 0) {
      toast.error("El número de sesiones debe ser mayor a 0.");
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      const result = await registrarCompraPlan({
        paciente_id: pacienteId,
        catalogo_plan_id: selectedPlanId || null,
        nombre_plan: customNombre.trim(),
        total_sesiones: sesiones,
        precio_base: precioBase,
        descuento_clp: descuentoCLP,
        codigo_cupon: appliedCoupon ? appliedCoupon.codigo : null,
        valor_total: valorTotal,
        total_final_clp: valorTotal,
        fecha_compra: today,
        estado: "activo",
      });

      if (result.success && result.data) {
        toast.success("¡Plan contratado con éxito!", {
          description: `${result.data.nombre_plan} asignado a ${pacienteNombre} (${result.data.total_sesiones} sesiones)`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        onPlanPurchased?.(result.data);
        onOpenChange(false);
      } else {
        toast.error("Error al registrar la venta del plan.");
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
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Venta / Renovación de Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Paciente: <strong>{pacienteNombre}</strong>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Selector de Plan desde Catálogo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>Seleccionar Plan del Catálogo</span>
            {isLoadingCatalog && (
              <span className="text-[11px] text-slate-400">Cargando tarifas...</span>
            )}
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => handleSelectPlan(e.target.value)}
            disabled={isLoadingCatalog || isSaving}
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-500/20 font-medium"
          >
            {groupedPlans.map((group) => (
              <optgroup key={group.category} label={`── ${group.category} ──`}>
                {group.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_plan} ({p.total_sesiones} ses.) — {formatCLP(p.precio_clp)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Nombre personalizado / editable */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">
            Nombre del Plan (en la ficha)
          </label>
          <Input
            value={customNombre}
            onChange={(e) => setCustomNombre(e.target.value)}
            disabled={isSaving}
            className="h-10 text-sm"
          />
        </div>

        {/* Sesiones y Precio Base */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Nº de Sesiones
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={sesiones}
              onChange={(e) => setSesiones(parseInt(e.target.value, 10) || 1)}
              disabled={isSaving}
              className="h-10 text-sm font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Precio Base (CLP)
            </label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={precioBase}
              onChange={(e) => {
                const newBase = parseInt(e.target.value, 10) || 0;
                setPrecioBase(newBase);
                if (appliedCoupon) {
                  const newDesc =
                    appliedCoupon.tipo === "porcentaje"
                      ? Math.round((newBase * appliedCoupon.valor_descuento) / 100)
                      : Math.min(appliedCoupon.valor_descuento, newBase);
                  setDescuentoCLP(newDesc);
                }
              }}
              disabled={isSaving}
              className="h-10 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Validador de Cupones */}
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 border border-slate-200">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-clinic-600" />
              Código de Cupón o GiftCard
            </span>
            {appliedCoupon && (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline"
              >
                Quitar cupón
              </button>
            )}
          </label>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Ej: BIENVENIDA, KIRO10..."
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={isSaving || isValidatingCoupon || !!appliedCoupon}
              className="h-9 text-xs uppercase font-mono tracking-wider bg-white"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCoupon}
              disabled={isSaving || isValidatingCoupon || !couponCode.trim() || !!appliedCoupon}
              className="h-9 px-3 bg-clinic-600 hover:bg-clinic-700 text-white text-xs font-bold gap-1 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isValidatingCoupon ? "Validando..." : "Aplicar"}</span>
            </Button>
          </div>

          {/* Mensaje de Cupón Aplicado */}
          {appliedCoupon && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs font-medium text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{couponSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Descuento Manual / Resumen */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-clinic-600" />
              Descuento Total en CLP
            </span>
            {descuentoCLP > 0 && (
              <span className="text-xs font-bold text-emerald-600">
                - {formatCLP(descuentoCLP)}
              </span>
            )}
          </label>
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="0"
            value={descuentoCLP || ""}
            onChange={(e) => {
              setDescuentoCLP(parseInt(e.target.value, 10) || 0);
              if (appliedCoupon) {
                setAppliedCoupon(null);
                setCouponSuccessMessage("");
              }
            }}
            disabled={isSaving}
            className="h-10 text-sm font-semibold"
          />
        </div>

        {/* Resumen de Cobro Histórico */}
        <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Sesiones:</span>
            <span className="font-bold text-white text-sm">{sesiones} sesiones</span>
          </div>

          {descuentoCLP > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Precio Base:</span>
              <span className="line-through text-slate-500">{formatCLP(precioBase)}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-800 pt-2">
            <span className="text-sm font-medium text-slate-300">Total a Cobrar:</span>
            <span className="text-xl font-extrabold text-clinic-400">
              {formatCLP(valorTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 italic pt-1">
            * El valor histórico y número de sesiones quedarán fijados en la ficha del paciente.
          </p>
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
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Guardando Compra..." : "Confirmar Venta / Renovación"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
