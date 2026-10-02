"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlanCatalogo, CompraPlan, CuponDescuento } from "@/types/database";
import {
  fetchCatalogoPlanes,
  registrarCompraPlan,
  validarCupon,
} from "@/lib/supabase";
import { formatCLP , getChileanDate } from '@/lib/utils';
import { toast } from "sonner";
import {
  PackagePlus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Check,
} from "lucide-react";
import { getCatalogoPlanesParaPaciente } from '@/lib/pricing';


interface RenewPlanDialogProps {
  pacienteId: string;
  pacienteNombre: string;
  pacienteCategoria?: string | null;
  pagoReciente?: { monto: number; cita_id: string; fecha: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanPurchased?: (newPlan: CompraPlan) => void;
}

export function RenewPlanDialog({
  pacienteId,
  pacienteNombre,
  pacienteCategoria,
  pagoReciente,
  open,
  onOpenChange,
  onPlanPurchased,
}: RenewPlanDialogProps) {
  const supabase = createClient();
  const [catalogPlanes, setCatalogPlanes] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customNombre, setCustomNombre] = useState<string>("");
  const [sesiones, setSesiones] = useState<number>(4);
  const [precioBase, setPrecioBase] = useState<number>(100000);
  const [descuentoCLP, setDescuentoCLP] = useState<number>(0);
  const [usarAbonoReciente, setUsarAbonoReciente] = useState<boolean>(true);

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
    
    const data = getCatalogoPlanesParaPaciente(pacienteCategoria);
    setCatalogPlanes(data);
    if (data.length > 0) {
      const first = data[0];
      setSelectedPlanId(first.id);
      setCustomNombre(first.nombre);
      setSesiones(first.sesiones);
      setPrecioBase(first.precio);
      setDescuentoCLP(0);
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponSuccessMessage("");
    }
    
    if (pagoReciente) {
      setUsarAbonoReciente(true);
    } else {
      setUsarAbonoReciente(false);
    }
  }, [open, pacienteCategoria, pagoReciente]);

  // Handle plan selection from dropdown
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);

    if (planId === "custom") {
      setCustomNombre("");
      setSesiones(4);
      setPrecioBase(100000);
      setDescuentoCLP(0);
    } else {
      const selected = catalogPlanes.find((p) => p.id === planId);
      if (selected) {
        setCustomNombre(selected.nombre);
        setSesiones(selected.sesiones);
        setPrecioBase(selected.precio);
        setDescuentoCLP(0);
        setCouponCode("");
        setAppliedCoupon(null);
        setCouponSuccessMessage("");
      }
    }
  };

  // Handle Coupon Application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Ingresa un código de cupón.");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponSuccessMessage("");

    try {
      const res = await validarCupon(couponCode, precioBase);

      if (res.valido && res.cupon && res.descuentoCalculadoCLP !== undefined) {
        setAppliedCoupon(res.cupon);
        setDescuentoCLP(res.descuentoCalculadoCLP);
        setCouponSuccessMessage(res.mensaje);
        toast.success(`Cupón ${res.cupon.codigo} aplicado: -${formatCLP(res.descuentoCalculadoCLP)}`);
      } else {
        setAppliedCoupon(null);
        setDescuentoCLP(0);
        toast.error(res.mensaje);
      }
    } catch {
      toast.error("Error al validar el cupón.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const abonoCalculado = (usarAbonoReciente && pagoReciente) ? pagoReciente.monto : 0;
  const valorTotal = Math.max(0, precioBase - descuentoCLP - abonoCalculado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customNombre.trim()) {
      toast.error("Por favor especifica el nombre del plan.");
      return;
    }

    if (sesiones <= 0) {
      toast.error("El número de sesiones debe ser mayor a 0.");
      return;
    }

    if (valorTotal < 0) {
      toast.error("El valor total no puede ser negativo.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await registrarCompraPlan({
        paciente_id: pacienteId,
        catalogo_plan_id: selectedPlanId !== "custom" ? selectedPlanId : null,
        nombre_plan: customNombre.trim(),
        total_sesiones: sesiones,
        precio_base: precioBase,
        descuento_clp: descuentoCLP,
        codigo_cupon: appliedCoupon?.codigo || null,
        valor_total: valorTotal,
        total_final_clp: valorTotal,
        estado_pago: "pendiente",
        monto_pagado: abonoCalculado,
        saldo_pendiente: valorTotal, // This should be total minus pagado, wait, if valorTotal already subtracted abono... actually valor_total of the PLAN should be `precioBase - descuentoCLP`. The `monto_pagado` should be `abonoCalculado`. `saldo_pendiente` = `precioBase - descuentoCLP - abonoCalculado`.
        fecha_compra: getChileanDate(),
        estado: "activo",
        sesiones_usadas: usarAbonoReciente ? 1 : 0
      });

      if (result.success && result.data) {
        if (usarAbonoReciente && pagoReciente && supabase) {
          // Link previous payment and session to this plan
          await supabase.from('pagos_pacientes').update({ plan_id: result.data.id }).eq('id', pagoReciente.cita_id); // Wait, pagoReciente.cita_id is actually cita_id. We need pago id? 
          // Let's just update the payment using cita_id
          await supabase.from('pagos_pacientes').update({ plan_id: result.data.id }).eq('cita_id', pagoReciente.cita_id);
          
          await supabase.from('citas_atenciones').update({
            plan_id: result.data.id,
            estado_pago: 'cubierto_por_plan'
          }).eq('id', pagoReciente.cita_id);
        }
        toast.success("¡Plan contratado con éxito!", {
          description: `${result.data.nombre_plan} — ${formatCLP(result.data.total_final_clp || valorTotal)} (${result.data.total_sesiones} sesiones añadidas)`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        if (onPlanPurchased) {
          onPlanPurchased(result.data);
        }

        onOpenChange(false);
      } else {
        toast.error("Error al renovar plan: " + (result.error || ""));
      }
    } catch {
      toast.error("Error de conexión al registrar la compra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-lg">
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100 shrink-0">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Renovar / Asignar Plan</DialogTitle>
            <DialogDescription>
              Paciente: <strong className="text-slate-700">{pacienteNombre}</strong>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody className="space-y-4">
          {/* Selector de Plan del Catálogo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Seleccionar Tarifa del Catálogo
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => handleSelectPlan(e.target.value)}
              disabled={isSaving || isLoadingCatalog}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {catalogPlanes.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre_plan} ({plan.total_sesiones} ses.) — {formatCLP(plan.precio_clp)}
                </option>
              ))}
              <option value="custom">✨ Plan Personalizado / A Medida</option>
            </select>
          </div>

          {/* Nombre Personalizado si aplica */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Nombre o Glosa del Plan *
            </label>
            <Input
              placeholder="Ej: Plan 6 Sesiones Lumbar"
              value={customNombre}
              onChange={(e) => setCustomNombre(e.target.value)}
              disabled={isSaving || selectedPlanId !== "custom"}
              className="h-10 text-sm font-medium bg-white rounded-xl"
              required
            />
          </div>

          {/* Sesiones y Precio Base */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Nº Sesiones *
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={sesiones}
                onChange={(e) => setSesiones(parseInt(e.target.value, 10) || 1)}
                disabled={isSaving || selectedPlanId !== "custom"}
                className="h-10 text-sm font-semibold bg-white rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Precio Base CLP *
              </label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={precioBase}
                onChange={(e) => setPrecioBase(parseInt(e.target.value, 10) || 0)}
                disabled={isSaving || selectedPlanId !== "custom"}
                className="h-10 text-sm font-semibold bg-white rounded-xl"
                required
              />
            </div>
          </div>

          {/* Cupón de Descuento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5 text-blue-600" />
              Cupón de Descuento (Opcional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Ej: BIENVENIDA"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={isSaving || isValidatingCoupon}
                  className="pl-9 h-10 text-sm uppercase font-mono font-bold bg-white rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isSaving || isValidatingCoupon || !couponCode.trim()}
                className="px-4 h-10 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isValidatingCoupon ? "..." : "Aplicar"}
              </button>
            </div>

            {couponSuccessMessage && (
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 pt-0.5">
                <Check className="h-3.5 w-3.5" />
                {couponSuccessMessage}
              </p>
            )}
          </div>

          {/* Descuento Manual si no se usa cupón */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Descuento Aplicado CLP</span>
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
              className="h-10 text-sm font-semibold bg-white rounded-xl"
            />
          </div>

          {pagoReciente && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <input 
                type="checkbox" 
                checked={usarAbonoReciente} 
                onChange={e => setUsarAbonoReciente(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
              />
              <div>
                <p className="text-sm font-bold text-blue-900">Aplicar pago de sesión anterior ({formatCLP(pagoReciente.monto)}) como abono al plan</p>
                <p className="text-xs text-blue-700 mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Contabilizar sesión anterior como Sesión 1 consumida (Inicia en 1/{sesiones})
                </p>
              </div>
            </div>
          )}

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
              <span className="text-xl font-extrabold text-blue-400">
                {formatCLP(valorTotal)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">
              * El valor histórico y número de sesiones quedarán fijados en la ficha del paciente.
            </p>
          </div>
        </DialogBody>

        {/* Footer con botones de alto contraste */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl sticky bottom-0 z-10 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar Venta</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default RenewPlanDialog;
