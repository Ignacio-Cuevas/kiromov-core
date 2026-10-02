import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatCLP } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CuentaCorrienteTabProps {
  pacienteId: string;
}

export function CuentaCorrienteTab({ pacienteId }: CuentaCorrienteTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [citasPendientes, setCitasPendientes] = useState<any[]>([]);
  const [pagosRealizados, setPagosRealizados] = useState<any[]>([]);
  
  const [totalContratado, setTotalContratado] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);
  const [saldoPendiente, setSaldoPendiente] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Citas con estado pendiente_pago
        const { data: citasData } = await supabase
          .from('citas_atenciones')
          .select('id, fecha, monto_cobrado, notas, estado_pago')
          .eq('paciente_id', pacienteId)
          .in('estado_pago', ['pendiente_pago', 'pagado'])
          .order('fecha', { ascending: false });

        // 2. Pagos realizados
        const { data: pagosData } = await supabase
          .from('pagos_pacientes')
          .select('id, fecha, monto, metodo_pago, notas')
          .eq('paciente_id', pacienteId)
          .order('fecha', { ascending: false });

        const citas = citasData || [];
        const pagos = pagosData || [];
        
        let tCobrado = 0;
        let tPagado = 0;
        
        citas.forEach(c => {
          if (c.monto_cobrado) tCobrado += Number(c.monto_cobrado);
        });
        
        pagos.forEach(p => {
          if (p.monto) tPagado += Number(p.monto);
        });
        
        const debe = Math.max(0, tCobrado - tPagado);
        
        setTotalContratado(tCobrado);
        setTotalPagado(tPagado);
        setSaldoPendiente(debe);
        
        setCitasPendientes(citas.filter(c => c.estado_pago === 'pendiente_pago'));
        setPagosRealizados(pagos);
      } catch (err) {
        console.error('Error fetching cuenta corriente', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [pacienteId, supabase]);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Facturado</p>
          <p className="text-2xl font-black text-slate-800">{formatCLP(totalContratado)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Pagado</p>
          <p className="text-2xl font-black text-emerald-600">{formatCLP(totalPagado)}</p>
        </div>
        <div className={`p-4 rounded-xl shadow-xs border ${saldoPendiente > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-xs font-bold uppercase ${saldoPendiente > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            Saldo Pendiente / Deuda
          </p>
          <p className={`text-2xl font-black ${saldoPendiente > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatCLP(saldoPendiente)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">Cargos / Citas Pendientes de Pago</h3>
          </div>
          {citasPendientes.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No hay cargos pendientes.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {citasPendientes.map(cita => (
                <li key={cita.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">Cita Atendida</p>
                    <p className="text-xs text-slate-500">{format(new Date(cita.fecha), 'PPP', { locale: es })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">{formatCLP(cita.monto_cobrado || 0)}</p>
                    <p className="text-[10px] text-rose-400 font-semibold uppercase">Deuda</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">Historial de Pagos</h3>
          </div>
          {pagosRealizados.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Aún no se han registrado pagos.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pagosRealizados.map(pago => (
                <li key={pago.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-sm text-slate-800 capitalize">{pago.metodo_pago}</p>
                    <p className="text-xs text-slate-500">{format(new Date(pago.fecha), 'PPP', { locale: es })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCLP(pago.monto)}</p>
                    <p className="text-[10px] text-emerald-500 font-semibold uppercase">Abonado</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
