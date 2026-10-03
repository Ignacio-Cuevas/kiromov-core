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
  onPlanPurchased?: (newPlan?: any) => void;
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
  const [montoPagadoHoy, setMontoPagadoHoy] = useState<number>(0);
  const [medioPago, setMedioPago] = useState<string>('transferencia');
  const [numeroBoleta, setNumeroBoleta] = useState<string>('');
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
  const valorTotal = Math.max(0, precioBase - descuentoCLP);
  const saldoPendiente = Math.max(0, valorTotal - abonoCalculado - montoPagadoHoy);

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
      const citaHoyId = usarAbonoReciente && pagoReciente ? pagoReciente.cita_id : null;
      if (!supabase) throw new Error("No database client");
      const { data, error } = await supabase.rpc("contratar_plan_transaccional", {
        p_paciente_id: pacienteId,
        p_nombre_plan: customNombre.trim(),
        p_sesiones_totales: Number(sesiones),
        p_valor_total: Number(precioBase - descuentoCLP),
        p_abono_hoy: Number(montoPagadoHoy + abonoCalculado),
        p_metodo_pago: medioPago,
        p_numero_boleta: numeroBoleta ? String(numeroBoleta).trim() : null,
        p_cita_hoy_id: citaHoyId || null
      });

      if (error) {
        console.error("[AsignarPlan RPC Error]:", error);
        toast.error("Error al contratar plan: " + error.message);
        return;
      }

      toast.success("Plan contratado y registrado exitosamente");
      if (onPlanPurchased) {
        onPlanPurchased();
      }

      onOpenChange(false);
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
              {catalogPlanes.map((plan) => {
                const nombre = plan.nombre_plan || plan.nombre_plan || plan.nombre || "Plan";
                const sesiones = plan.total_sesiones || plan.total_sesiones || plan.sesiones || 0;
                const precio = Number(plan.valor_total || plan.valor_total || plan.valor_total || plan.precio || plan.precio_clp || 0);

                return (
                  <option key={plan.id || nombre} value={plan.id}>
                    {nombre} ({sesiones} ses.) — ${precio.toLocaleString("es-CL")}
                  </option>
                );
              })}
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

          {/* Cobro Hoy */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Abono Hoy (CLP)
              </label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={montoPagadoHoy}
                onChange={(e) => setMontoPagadoHoy(parseInt(e.target.value, 10) || 0)}
                disabled={isSaving}
                className="h-10 text-sm font-semibold bg-white rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Medio de Pago
              </label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                disabled={isSaving}
                className="w-full h-10 text-sm p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="debito">Tarjeta Débito</option>
                <option value="credito">Tarjeta Crédito</option>
              </select>
            </div>
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
