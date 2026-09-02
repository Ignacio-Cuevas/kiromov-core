'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { RegisterSaleDialog } from '@/components/finanzas/RegisterSaleDialog';
import { Header } from '@/components/dashboard/Header';
import { formatCLP, formatRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet, ArrowDownRight, ArrowUpRight, Plus, Loader2, CreditCard, Search, Clock, CheckCircle2
} from 'lucide-react';

type PeriodoFiltro = 'mes' | 'todo';

function FinanzasContent() {
  const supabase = createClient();
  const [compras, setCompras] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [activeTab, setActiveTab] = useState<'transacciones' | 'por_cobrar' | 'egresos'>('transacciones');

  const [isRegisterSaleOpen, setIsRegisterSaleOpen] = useState(false);

  // Nuevo Egreso Modal
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito' });
  const [savingEgreso, setSavingEgreso] = useState(false);

  // Settle Payment Modal
  const [settlingPlan, setSettlingPlan] = useState<any | null>(null);
  const [settleForm, setSettleForm] = useState({ metodo_pago: 'Transferencia Bancaria', boleta: '' });
  const [savingSettle, setSavingSettle] = useState(false);

  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: cData } = await supabase.from('compras_planes').select('*, pacientes(nombre_completo, rut)').order('fecha_compra', { ascending: false });
      const { data: eData } = await supabase.from('egresos_caja').select('*').order('fecha', { ascending: false });
      setCitas(cData || []);
      setCompras(cData || []);
      setEgresos(eData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setCitas = (d: any) => {};

  useEffect(() => { loadData(); }, []);

  const estaEnPeriodo = (fechaStr: string) => {
    if (!fechaStr || periodo === 'todo') return true;
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
  };

  const comprasFiltradas = useMemo(() => compras.filter(c => estaEnPeriodo(c.fecha_compra)), [compras, periodo]);
  const egresosFiltrados = useMemo(() => egresos.filter(e => estaEnPeriodo(e.fecha)), [egresos, periodo]);

  const totalIngresos = useMemo(() => comprasFiltradas.filter(t => t.estado_pago?.toLowerCase() === 'pagado').reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.total_final_clp || curr.valor_total) || 0), 0), [comprasFiltradas]);
  const cuentasPendientes = useMemo(() => comprasFiltradas.filter(t => ['pendiente', 'pendiente de pago'].includes(t.estado_pago?.toLowerCase() || '')), [comprasFiltradas]);
  const totalPorCobrar = useMemo(() => cuentasPendientes.reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.total_final_clp || curr.valor_total) || 0), 0), [cuentasPendientes]);
  const totalEgresos = useMemo(() => egresosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0), [egresosFiltrados]);
  const balanceNeto = totalIngresos - totalEgresos;

  const handleAddEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !egresoForm.concepto || !egresoForm.monto) return;
    setSavingEgreso(true);
    const nuevoEgreso = {
      concepto: egresoForm.concepto, categoria: egresoForm.categoria,
      monto_clp: parseInt(egresoForm.monto, 10), medio_pago: egresoForm.formaPago,
      fecha: new Date().toISOString().split('T')[0], responsable: 'Klgo. Ignacio Cuevas'
    };
    try {
      await supabase.from('egresos_caja').insert([nuevoEgreso]);
      toast.success('Egreso guardado');
      setShowEgresoModal(false);
      setEgresoForm({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito' });
      loadData();
    } catch (err) { toast.error('Error guardando egreso'); } finally { setSavingEgreso(false); }
  };

  const handleSettlePayment = async () => {
    if (!supabase || !settlingPlan) return;
    setSavingSettle(true);
    try {
      const { error } = await supabase.from('compras_planes').update({
        estado_pago: 'pagado',
        medio_pago: settleForm.metodo_pago,
        numero_boleta: settleForm.boleta?.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', settlingPlan.id);
      if (error) throw error;
      toast.success('¡Cobro registrado exitosamente!');
      setSettlingPlan(null);
      loadData();
    } catch (err) { toast.error('Error registrando cobro'); } finally { setSavingSettle(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Finanzas & Caja</h1>
            <p className="text-sm text-slate-500">Gestión de ingresos, egresos y cuentas por cobrar.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl">
            <button onClick={() => setPeriodo('mes')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${periodo === 'mes' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}>Mes Actual</button>
            <button onClick={() => setPeriodo('todo')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${periodo === 'todo' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}>Todo el Historial</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4 text-emerald-500"/> Ingresos Reales</span>
            <span className="text-2xl font-black text-emerald-600 mt-2">{formatCLP(totalIngresos)}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500"/> Por Cobrar ({cuentasPendientes.length})</span>
            <span className="text-2xl font-black text-amber-600 mt-2">{formatCLP(totalPorCobrar)}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><ArrowDownRight className="w-4 h-4 text-rose-500"/> Egresos del Mes</span>
            <span className="text-2xl font-black text-rose-600 mt-2">{formatCLP(totalEgresos)}</span>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Wallet className="w-4 h-4 text-slate-300"/> Balance Neto</span>
            <span className="text-2xl font-black text-white mt-2">{formatCLP(balanceNeto)}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            <button onClick={() => setActiveTab('transacciones')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'transacciones' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Transacciones / Ventas</button>
            <button onClick={() => setActiveTab('por_cobrar')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'por_cobrar' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Cuentas por Cobrar {cuentasPendientes.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">{cuentasPendientes.length}</span>}</button>
            <button onClick={() => setActiveTab('egresos')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'egresos' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Egresos de Caja</button>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                <p className="text-sm font-medium">Cargando registros...</p>
              </div>
            ) : activeTab === 'transacciones' ? (
              <div>
                <div className="p-4 border-b border-slate-100 flex justify-end bg-slate-50/50">
                  <Button onClick={() => setIsRegisterSaleOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm h-9">
                    <Plus className="w-4 h-4 mr-1.5" /> Registrar Venta
                  </Button>
                </div>
                {comprasFiltradas.length === 0 ? (
                  <p className="text-sm text-slate-400 py-12 text-center">No hay transacciones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Paciente</th>
                          <th className="py-3 px-4">Detalle</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Monto CLP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {comprasFiltradas.map((c) => {
                          const pagado = c.estado_pago?.toLowerCase() === 'pagado';
                          const montoNum = Number(c.monto_clp || c.total_final_clp || c.valor_total) || 0;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 text-slate-500 text-xs">{c.fecha_compra}</td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.pacientes?.nombre_completo || c.paciente_nombre || 'Paciente'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{formatRut(c.pacientes?.rut) || ''}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-700 text-xs">{c.nombre_plan}</div>
                                <div className="text-[10px] text-slate-400">{c.medio_pago || 'Medio no especificado'} {c.numero_boleta ? `• Bol #${c.numero_boleta}` : ''}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${pagado ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                  {pagado ? 'Pagado' : 'Pendiente'}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-right font-black ${pagado ? 'text-emerald-700' : 'text-amber-600'}`}>
                                {formatCLP(montoNum)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : activeTab === 'por_cobrar' ? (
              <div>
                {cuentasPendientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                    <p className="text-base font-bold text-slate-700">¡Todo al día!</p>
                    <p className="text-sm mt-1 text-slate-500">No hay cuentas por cobrar en este período.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-amber-50 text-amber-700 border-b border-amber-100 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="py-3 px-4">Fecha Origen</th>
                          <th className="py-3 px-4">Paciente</th>
                          <th className="py-3 px-4">Plan Adeudado</th>
                          <th className="py-3 px-4 text-right">Monto Deuda</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cuentasPendientes.map((c) => {
                          const montoNum = Number(c.monto_clp || c.total_final_clp || c.valor_total) || 0;
                          return (
                            <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-4 text-slate-500 text-xs">{c.fecha_compra}</td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.pacientes?.nombre_completo || c.paciente_nombre || 'Paciente'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{formatRut(c.pacientes?.rut) || ''}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-700 text-xs">{c.nombre_plan}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-amber-600 text-lg">
                                {formatCLP(montoNum)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button onClick={() => setSettlingPlan(c)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm h-8">
                                  <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Registrar Cobro
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-slate-100 flex justify-end bg-slate-50/50">
                  <Button onClick={() => setShowEgresoModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm h-9">
                    <Plus className="w-4 h-4 mr-1.5" /> Nuevo Egreso
                  </Button>
                </div>
                {egresosFiltrados.length === 0 ? (
                  <p className="text-sm text-slate-400 py-12 text-center">No hay egresos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Concepto</th>
                          <th className="py-3 px-4">Categoría</th>
                          <th className="py-3 px-4">Medio</th>
                          <th className="py-3 px-4 text-right">Monto CLP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {egresosFiltrados.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-slate-500 text-xs">{e.fecha}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{e.concepto}</td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                                {e.categoria}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 font-medium">{e.medio_pago || 'Débito'}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-600">
                              {formatCLP(e.monto_clp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <RegisterSaleDialog open={isRegisterSaleOpen} onOpenChange={setIsRegisterSaleOpen} onSaleRegistered={loadData} />

      <Dialog open={showEgresoModal} onOpenChange={setShowEgresoModal}>
        <DialogHeader>
          <DialogTitle>Registrar Egreso de Caja</DialogTitle>
          <DialogDescription>Añade un nuevo gasto operativo a la clínica.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Concepto / Descripción</label>
            <Input required placeholder="Ej: Insumos de punción seca..." value={egresoForm.concepto} onChange={e => setEgresoForm({...egresoForm, concepto: e.target.value})} className="bg-slate-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Categoría</label>
              <select value={egresoForm.categoria} onChange={e => setEgresoForm({...egresoForm, categoria: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10 outline-none">
                <option value="Insumos Clínicos">Insumos Clínicos</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Arriendo">Arriendo</option>
                <option value="Marketing">Marketing / Publicidad</option>
                <option value="Equipamiento">Equipamiento</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Monto CLP</label>
              <Input type="number" required min="100" placeholder="Ej: 25000" value={egresoForm.monto} onChange={e => setEgresoForm({...egresoForm, monto: e.target.value})} className="bg-slate-50 font-bold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Medio de Pago</label>
            <select value={egresoForm.formaPago} onChange={e => setEgresoForm({...egresoForm, formaPago: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10 outline-none">
              <option value="Débito">Débito / Transbank</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEgresoModal(false)}>Cancelar</Button>
          <Button onClick={handleAddEgreso} disabled={savingEgreso} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">{savingEgreso ? 'Guardando...' : 'Guardar Egreso'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!settlingPlan} onOpenChange={(open) => !open && setSettlingPlan(null)}>
        <DialogHeader>
          <DialogTitle className="text-amber-600">Registrar Cobro Pendiente</DialogTitle>
          <DialogDescription>Confirma el pago del plan adeudado para actualizar el saldo.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase">{settlingPlan?.pacientes?.nombre_completo}</p>
              <p className="text-sm font-medium text-amber-900 mt-1">{settlingPlan?.nombre_plan}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-amber-600 font-bold uppercase">Monto a Cobrar</p>
              <p className="text-2xl font-black text-amber-600">{formatCLP(Number(settlingPlan?.monto_clp || settlingPlan?.total_final_clp || settlingPlan?.valor_total) || 0)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Medio de Pago Recibido</label>
            <select value={settleForm.metodo_pago} onChange={e => setSettleForm({...settleForm, metodo_pago: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-10 outline-none">
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Débito / Crédito">Débito / Crédito (Transbank)</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Convenio">Convenio</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">N° de Boleta Tributaria (Opcional)</label>
            <Input placeholder="Ej: 14592" value={settleForm.boleta} onChange={e => setSettleForm({...settleForm, boleta: e.target.value})} className="bg-slate-50 font-mono" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSettlingPlan(null)}>Cancelar</Button>
          <Button onClick={handleSettlePayment} disabled={savingSettle} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">{savingSettle ? 'Procesando...' : 'Confirmar Pago'}</Button>
        </DialogFooter>
      </Dialog>

    </div>
  );
}

export default function FinanzasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <FinanzasContent />
    </Suspense>
  );
}
