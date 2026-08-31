'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  PlanCatalogo,
  VistaResumenPaciente,
  MedioPago,
  EstadoPago,
  CompraPlan,
} from '@/types/database';
import {
  fetchCatalogoPlanes,
  fetchVistaResumenPacientes,
  registrarCompraPlan,
  validarCupon,
} from '@/lib/supabase';
import { formatCLP, formatRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DollarSign,
  ShoppingCart,
  User,
  Layers,
  CreditCard,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPatient?: VistaResumenPaciente | null;
  onSaleRegistered?: (newSale: CompraPlan) => void;
}

export function RegisterSaleDialog({
  open,
  onOpenChange,
  selectedPatient,
  onSaleRegistered,
}: RegisterSaleDialogProps) {
  const [patients, setPatients] = useState<VistaResumenPaciente[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [planes, setPlanes] = useState<PlanCatalogo[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Form Fields
  const [nombrePlan, setNombrePlan] = useState('');
  const [totalSesiones, setTotalSesiones] = useState<number>(4);
  const [precioBase, setPrecioBase] = useState<number>(100000);
  const [descuentoCLP, setDescuentoCLP] = useState<number>(0);
  const [totalFinalCLP, setTotalFinalCLP] = useState<number>(100000);
  const [medioPago, setMedioPago] = useState<MedioPago>('Transferencia');
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('Pagado');
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponMensaje, setCuponMensaje] = useState<{ text: string; isError?: boolean } | null>(null);
  const [notas, setNotas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    if (open) {
      // Load active catalog plans
      fetchCatalogoPlanes(true).then((data) => {
        setPlanes(data);
        if (data.length > 0 && !selectedPlanId) {
          const first = data[0];
          setSelectedPlanId(first.id);
          setNombrePlan(first.nombre_plan);
          setTotalSesiones(first.total_sesiones);
          setPrecioBase(first.precio_clp);
          setTotalFinalCLP(first.precio_clp);
        }
      });

      // Load patients
      fetchVistaResumenPacientes().then((data) => {
        setPatients(data);
      });

      if (selectedPatient) {
        setSelectedPatientId(selectedPatient.id);
        setPatientSearch(selectedPatient.nombre_completo);
      } else {
        setSelectedPatientId('');
        setPatientSearch('');
      }

      setDescuentoCLP(0);
      setCodigoCupon('');
      setCuponMensaje(null);
      setNotas('');
      setMedioPago('Transferencia');
      setEstadoPago('Pagado');
    }
  }, [open, selectedPatient]);

  // When selected plan changes
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = planes.find((p) => p.id === planId);
    if (plan) {
      setNombrePlan(plan.nombre_plan);
      setTotalSesiones(plan.total_sesiones);
      setPrecioBase(plan.precio_clp);
      const final = Math.max(0, plan.precio_clp - descuentoCLP);
      setTotalFinalCLP(final);
    }
  };

  // Coupon validation
  const handleApplyCoupon = async () => {
    if (!codigoCupon.trim()) return;
    const res = await validarCupon(codigoCupon.trim(), precioBase);
    if (res.valido && res.cupon && res.descuentoCalculadoCLP !== undefined) {
      setDescuentoCLP(res.descuentoCalculadoCLP);
      const finalVal = Math.max(0, precioBase - res.descuentoCalculadoCLP);
      setTotalFinalCLP(finalVal);
      setCuponMensaje({
        text: `✓ Cupón "${res.cupon.codigo}" aplicado (-${formatCLP(res.descuentoCalculadoCLP)})`,
      });
      toast.success(`Cupón "${res.cupon.codigo}" aplicado`);
    } else {
      setDescuentoCLP(0);
      setTotalFinalCLP(precioBase);
      setCuponMensaje({
        text: `✗ ${res.mensaje || 'Cupón no válido'}`,
        isError: true,
      });
      toast.error(res.mensaje || 'Cupón inválido');
    }
  };

  // Filtered patients for dropdown
  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase().trim();
    const rutClean = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : '';
    const qClean = q.replace(/[^0-9kK]/g, '');
    return (
      (p.nombre_completo || '').toLowerCase().includes(q) ||
      (p.codigo_paciente || '').toLowerCase().includes(q) ||
      (qClean.length >= 2 && rutClean.includes(qClean))
    );
  });

  const currentPatient = patients.find((p) => p.id === selectedPatientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId) {
      toast.error('Por favor selecciona el paciente destinatario.');
      return;
    }

    if (!nombrePlan.trim()) {
      toast.error('El nombre del plan/servicio es obligatorio.');
      return;
    }

    if (totalSesiones <= 0) {
      toast.error('La cantidad de sesiones debe ser mayor a 0.');
      return;
    }

    setIsSaving(true);

    try {
      const result = await registrarCompraPlan({
        paciente_id: selectedPatientId,
        catalogo_plan_id: selectedPlanId.startsWith('cat-') ? selectedPlanId : null,
        nombre_plan: nombrePlan.trim(),
        total_sesiones: totalSesiones,
        precio_base: precioBase,
        descuento_clp: descuentoCLP,
        codigo_cupon: codigoCupon.trim() || null,
        valor_total: precioBase,
        total_final_clp: totalFinalCLP,
        medio_pago: medioPago,
        estado_pago: estadoPago,
        fecha_compra: new Date().toISOString().split('T')[0],
        estado: 'activo',
        notas: notas.trim() || null,
      });

      if (result.success && result.data) {
        toast.success('¡Venta registrada con éxito!', {
          description: `${result.data.nombre_plan} — ${formatCLP(result.data.total_final_clp || totalFinalCLP)} (${result.data.total_sesiones} sesiones asignadas)`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });

        if (onSaleRegistered) {
          onSaleRegistered(result.data);
        }
        onOpenChange(false);
      } else {
        toast.error('Error al registrar la venta: ' + (result.error || ''));
      }
    } catch (err: any) {
      toast.error('Error de conexión al procesar la venta');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Registrar Venta / Cobro de Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Asigna sesiones al saldo del paciente y registra el ingreso en el balance financiero.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* 1. Selección de Paciente */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-blue-600" />
            1. Paciente Destinatario
          </span>

          {selectedPatient ? (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-sm font-bold text-slate-900 block">
                  {selectedPatient.nombre_completo}
                </strong>
                <span className="text-xs text-slate-500 font-mono">
                  RUT: {formatRut(selectedPatient.rut)} • {selectedPatient.codigo_paciente}
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                Saldo: {selectedPatient.sesiones_restantes} sesiones
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar paciente por Nombre o RUT..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9 bg-white rounded-xl text-sm"
                />
              </div>

              {/* Patient select list */}
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {filteredPatients.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setPatientSearch(p.nombre_completo);
                    }}
                    className={`w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between ${
                      selectedPatientId === p.id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{p.nombre_completo}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatRut(p.rut)} • {p.codigo_paciente}
                      </span>
                    </div>
                    {selectedPatientId === p.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Selección de Plan / Tarifa */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            2. Plan o Servicio Adquirido
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Selector de Catálogo */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Catálogo de Planes Activos
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {planes.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.nombre_plan} — {formatCLP(pl.precio_clp)} ({pl.total_sesiones} ses.)
                  </option>
                ))}
              </select>
            </div>

            {/* Total de Sesiones */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Cantidad de Sesiones <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={totalSesiones}
                onChange={(e) => setTotalSesiones(parseInt(e.target.value, 10) || 1)}
                className="bg-white rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            {/* Precio Base */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Precio Base CLP</label>
              <Input
                type="number"
                step={1000}
                value={precioBase}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setPrecioBase(val);
                  setTotalFinalCLP(Math.max(0, val - descuentoCLP));
                }}
                className="bg-white rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            {/* Cupón de descuento */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Cupón de Descuento (Opcional)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Ej: BIENVENIDA, KIRO10"
                    value={codigoCupon}
                    onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                    className="pl-9 uppercase bg-white rounded-xl text-xs font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  className="rounded-xl text-xs font-bold"
                >
                  Aplicar
                </Button>
              </div>
              {cuponMensaje && (
                <p
                  className={`text-[11px] font-semibold ${
                    cuponMensaje.isError ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {cuponMensaje.text}
                </p>
              )}
            </div>

            {/* Monto Final a Cobrar */}
            <div className="space-y-1 sm:col-span-2 p-3 bg-white rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Total Final a Cobrar:</span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatCLP(totalFinalCLP)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Forma de Pago y Estado */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-purple-600" />
            3. Medio y Estado de Pago
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Medio de Pago */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Medio de Pago</label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value as MedioPago)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Débito / Transbank">Débito / Crédito (Transbank)</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Convenio">Convenio Institucional</option>
              </select>
            </div>

            {/* Estado de Pago */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Estado del Cobro</label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value as EstadoPago)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Pagado">✓ Pagado (Ingreso Realizado)</option>
                <option value="Pendiente de Pago">⏳ Pendiente de Pago</option>
                <option value="Parcial / Cuotas">🌓 Parcial / Cuotas</option>
              </select>
            </div>

            {/* Notas u Observaciones */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Observaciones / N° Comprobante (Opcional)
              </label>
              <Input
                placeholder="Ej: Transferencia Banco de Chile comprobante #994821"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="bg-white rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSaving ? 'Registrando...' : 'Confirmar y Asignar Sesiones'}</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default RegisterSaleDialog;
