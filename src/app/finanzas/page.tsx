'use client';

import React, { Suspense, useEffect, useState, useMemo, Fragment } from "react";
import { PaymentCheckoutModal } from "@/components/sales/PaymentCheckoutModal";
import { CancelPlanModal } from "@/components/sales/CancelPlanModal";
import { EditExpenseModal } from "@/components/finanzas/EditExpenseModal";
import { createClient } from "@/utils/supabase/client";
import { formatCLP, formatRut, getChileanDate } from '@/lib/utils';
import {
  Loader2,
  Plus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Copy,
  Receipt,
  FileText,
  Calendar,
  Building2,
  Sparkles,
  Check,
  Clock,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getArancel } from '@/lib/pricing';

export interface DesgloseDeuda {
  tipo: 'plan' | 'cita';
  id: string;
  fecha: string;
  detalle: string;
  saldo: number;
}

export type AgingCategory = 'reciente' | 'por_gestionar' | 'mora_critica';

export interface DeudorConsolidado {
  pacienteId: string;
  paciente: any;
  totalDeuda: number;
  desglose: DesgloseDeuda[];
  diasAntiguedad: number;
  fechaMasAntigua: string;
  agingCategory: AgingCategory;
  agingLabel: string;
}

export type PeriodoFiltro = 'hoy' | 'semana' | 'este_mes' | 'mes_anterior' | 'personalizado';
export type TabName = 'deben' | 'pagados' | 'planes' | 'egresos';

const CATEGORIAS_EGRESO = [
  'Arriendo Box (Bulnes 470)',
  'Insumos Clínicos (Punción, cremas, toallas)',
  'Servicios Básicos e Internet',
  'Software / Marketing',
  'Equipamiento Clínico',
  'Otros Gastos'
];

// Fecha en que comenzó la operación formal de cobros en Kiromov Core
const FECHA_CORTE_OPERACIONAL = '2026-09-01';

function FinanzasContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Submódulo 1: Control de período flexible
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('este_mes');
  const [fechaPersonalizadaDesde, setFechaPersonalizadaDesde] = useState('');
  const [fechaPersonalizadaHasta, setFechaPersonalizadaHasta] = useState('');

  // Navegación de pestañas
  const [activeTab, setActiveTab] = useState<TabName>('deben');

  // Submódulo 2: Filtro de aging para cobranzas
  const [filtroAging, setFiltroAging] = useState<'todos' | AgingCategory>('todos');

  // Submódulo 3: Filtro de boletas exentas
  const [filtroBoleta, setFiltroBoleta] = useState<'todos' | 'con_boleta' | 'sin_boleta'>('todos');

  // Datos base desde Supabase
  const [citas, setCitas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  // Modales
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [savingEgreso, setSavingEgreso] = useState(false);
  const [egresoForm, setEgresoForm] = useState({
    concepto: '',
    categoria: 'Insumos Clínicos (Punción, cremas, toallas)',
    monto: '',
    formaPago: 'Débito / Transbank',
    fecha: ''
  });
  const [editingEgreso, setEditingEgreso] = useState<any | null>(null);

  // Modal para conciliar Boleta Electrónica Exenta
  const [boletaModalPago, setBoletaModalPago] = useState<any | null>(null);
  const [boletaInputNumero, setBoletaInputNumero] = useState('');
  const [savingBoleta, setSavingBoleta] = useState(false);

  // Checkout y gestión de cobranzas
  const [expandedDeudores, setExpandedDeudores] = useState<Set<string>>(new Set());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDeudorForCheckout, setSelectedDeudorForCheckout] = useState<DeudorConsolidado | null>(null);
  const [selectedDeudaItemForCheckout, setSelectedDeudaItemForCheckout] = useState<any | null>(null);
  const [cancelingPlan, setCancelingPlan] = useState<any>(null);

  const hoyStr = new Date().toISOString().split('T')[0];

  // Cálculo de rangos de fechas (YYYY-MM-DD sin desfase horario)
  const { inicioStr, finStr } = useMemo(() => {
    const ahora = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (periodo === 'hoy') {
      const hStr = formatYMD(ahora);
      return { inicioStr: hStr, finStr: hStr };
    }

    if (periodo === 'semana') {
      const diaSemana = (ahora.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
      const lunes = new Date(ahora);
      lunes.setDate(ahora.getDate() - diaSemana);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return { inicioStr: formatYMD(lunes), finStr: formatYMD(domingo) };
    }

    if (periodo === 'este_mes') {
      const y = ahora.getFullYear();
      const m = ahora.getMonth();
      const primerDia = new Date(y, m, 1);
      const ultimoDia = new Date(y, m + 1, 0);
      return { inicioStr: formatYMD(primerDia), finStr: formatYMD(ultimoDia) };
    }

    if (periodo === 'mes_anterior') {
      const y = ahora.getFullYear();
      const m = ahora.getMonth() - 1;
      const primerDia = new Date(y, m, 1);
      const ultimoDia = new Date(y, m + 1, 0);
      return { inicioStr: formatYMD(primerDia), finStr: formatYMD(ultimoDia) };
    }

    if (periodo === 'personalizado') {
      return {
        inicioStr: fechaPersonalizadaDesde || '2020-01-01',
        finStr: fechaPersonalizadaHasta || '2030-12-31'
      };
    }

    return { inicioStr: '2020-01-01', finStr: '2030-12-31' };
  }, [periodo, fechaPersonalizadaDesde, fechaPersonalizadaHasta]);

  // Carga de datos centralizada
  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [resCitas, resCompras, resEgresos, resPagos] = await Promise.all([
        supabase
          .from('citas_atenciones')
          .select('*, pacientes(id, nombre_completo, rut, telefono, prevision, prevision_salud)')
          .in('estado', ['asistio', 'asistió', 'Asistió', 'atendido', 'atendida'])
          .order('fecha', { ascending: true }),
        supabase
          .from('compras_planes')
          .select('*, pacientes(id, nombre_completo, rut, telefono, prevision, prevision_salud)')
          .order('fecha_compra', { ascending: false }),
        supabase
          .from('egresos_caja')
          .select('*')
          .order('fecha', { ascending: false }),
        supabase
          .from('pagos_pacientes')
          .select('*, pacientes(id, nombre_completo, rut, telefono, prevision, prevision_salud)')
          .order('fecha', { ascending: false })
      ]);

      setCitas(resCitas.data || []);
      setCompras(resCompras.data || []);
      setEgresos(resEgresos.data || []);
      setPagos(resPagos.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando finanzas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrado temporal para Flujo de Caja
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      if (!p.fecha) return false;
      const fStr = p.fecha.split('T')[0];
      return fStr >= inicioStr && fStr <= finStr;
    });
  }, [pagos, inicioStr, finStr]);

  const egresosFiltrados = useMemo(() => {
    return egresos.filter((e) => {
      const fStr = (e.fecha ? e.fecha.split('T')[0] : '') || (e.created_at ? e.created_at.split('T')[0] : '');
      if (!fStr) return false;
      return fStr >= inicioStr && fStr <= finStr;
    });
  }, [egresos, inicioStr, finStr]);

  // Submódulo 1: Desglose de ingresos en 3 canales (Efectivo Box, POS Débito, Transferencias)
  const { totalEfectivo, totalDebito, totalTransferencia } = useMemo(() => {
    let ef = 0;
    let deb = 0;
    let trans = 0;

    pagosFiltrados.forEach((p) => {
      const monto = Number(p.monto) || 0;
      const metodo = String(p.metodo_pago || '').toLowerCase();

      if (metodo.includes('efectivo') || metodo.includes('cash')) {
        ef += monto;
      } else if (
        metodo.includes('débito') ||
        metodo.includes('debito') ||
        metodo.includes('transbank') ||
        metodo.includes('tarjeta') ||
        metodo.includes('pos') ||
        metodo.includes('crédito') ||
        metodo.includes('credito')
      ) {
        deb += monto;
      } else {
        trans += monto;
      }
    });

    return { totalEfectivo: ef, totalDebito: deb, totalTransferencia: trans };
  }, [pagosFiltrados]);

  const ingresosPeriodo = useMemo(() => {
    return totalEfectivo + totalDebito + totalTransferencia;
  }, [totalEfectivo, totalDebito, totalTransferencia]);

  const egresosPeriodo = useMemo(() => {
    return egresosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);
  }, [egresosFiltrados]);

  const flujoNetoPeriodo = useMemo(() => {
    return ingresosPeriodo - egresosPeriodo;
  }, [ingresosPeriodo, egresosPeriodo]);

  // Submódulo 2: Centro de Cobranzas Histórico con Aging
  const deudoresConsolidados = useMemo<DeudorConsolidado[]>(() => {
    const map = new Map<string, DeudorConsolidado>();

    const pacienteIds = Array.from(
      new Set([
        ...compras.map((p) => p.paciente_id),
        ...citas.map((c) => c.paciente_id),
        ...pagos.map((pp) => pp.paciente_id)
      ])
    ).filter(Boolean) as string[];

    pacienteIds.forEach((pacId) => {
      // 1. Obligaciones por planes (solo planes contratados a partir de la fecha de corte operacional)
      const planesPaciente = compras.filter((p) => {
        if (p.paciente_id !== pacId) return false;
        const stPago = String(p.estado_pago || '').toLowerCase().trim();
        const stEstado = String(p.estado || '').toLowerCase().trim();
        if (stPago === 'cancelado' || stEstado === 'cancelado') return false;
        const fPlan = (p.fecha_compra ? p.fecha_compra.split('T')[0] : '') || (p.created_at ? p.created_at.split('T')[0] : '');
        return !fPlan || fPlan >= FECHA_CORTE_OPERACIONAL;
      });

      const deudaPlanes = planesPaciente.reduce(
        (acc, p) => acc + (Number(p.saldo_pendiente) || 0),
        0
      );

      // 2. Citas efectivamente asistidas desde la fecha de corte (ignorar citas de marzo/abril/mayo)
      const citasAsistidasValidas = citas
        .filter((c) => {
          if (c.paciente_id !== pacId) return false;
          const st = String(c.estado || '').toLowerCase().trim();
          const esAsistio = st === 'asistio' || st === 'asistió' || st === 'atendido' || st === 'atendida';
          return (
            esAsistio &&
            c.fecha &&
            c.fecha >= FECHA_CORTE_OPERACIONAL &&
            c.fecha <= hoyStr
          );
        })
        .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

      // Cantidad de sesiones cubiertas por planes contratados
      const totalSesionesCubiertasPorPlanes = planesPaciente.reduce(
        (acc, p) => acc + (Number(p.total_sesiones || p.sesiones_totales || p.cantidad_sesiones_totales) || 0),
        0
      );

      // Citas particulares que exceden los planes (o todas si no tiene plan)
      const numCitasParticulares =
        planesPaciente.length === 0
          ? citasAsistidasValidas.length
          : Math.max(0, citasAsistidasValidas.length - totalSesionesCubiertasPorPlanes);

      // 3. Pagos realizados por el paciente para citas particulares (Desde septiembre a la fecha)
      const pagosCitasPaciente = pagos.filter((pp) => {
        if (pp.paciente_id !== pacId) return false;
        const fPago = (pp.fecha_pago || pp.fecha || pp.created_at)
          ? String(pp.fecha_pago || pp.fecha || pp.created_at).split('T')[0]
          : '';
        if (fPago && fPago < FECHA_CORTE_OPERACIONAL) return false;

        // Si el paciente tiene plan, descartar pagos asociados a planes (abonos o venta de plan)
        if (planesPaciente.length > 0) {
          if (pp.tipo_concepto === 'venta_plan' || pp.tipo_concepto === 'abono_plan') return false;
          if (pp.plan_id && !pp.cita_id && pp.tipo_concepto !== 'sesion_individual') return false;
        }
        return true;
      });

      const numPagosRealizados = pagosCitasPaciente.length;

      // 4. Balance de sesiones (Regla 1 a 1: 1 cita asistida queda saldada con 1 pago individual)
      const sesionesImpagas = Math.max(0, numCitasParticulares - numPagosRealizados);

      // Datos del paciente para arancel y ficha clínica
      const pacienteData =
        compras.find((p) => p.paciente_id === pacId)?.pacientes ||
        citas.find((c) => c.paciente_id === pacId)?.pacientes ||
        pagos.find((pp) => pp.paciente_id === pacId)?.pacientes ||
        { id: pacId, nombre_completo: 'Paciente sin registrar', rut: '', telefono: '' };

      // Arancel base por sesión impaga según previsión/convenio ($25.000 convenio, $28.000 particular/otros)
      const prevStr = String(pacienteData.prevision || pacienteData.prevision_salud || '').toLowerCase();
      const arancelSugerido = prevStr.includes('convenio') ? 25000 : 28000;
      const deudaCitas = sesionesImpagas * arancelSugerido;

      // 5. Deuda total consolidada
      const deudaTotal = deudaPlanes + deudaCitas;

      // Solo si deudaTotal > 0 es un deudor legítimo
      if (deudaTotal > 0) {
        const desglose: DesgloseDeuda[] = [];

        // Detalle de planes
        if (deudaPlanes > 0) {
          planesPaciente.forEach((p) => {
            const saldo = Number(p.saldo_pendiente ?? (String(p.estado_pago || '').toLowerCase().includes('pend') ? p.valor_total : 0)) || 0;
            if (saldo > 0) {
              desglose.push({
                tipo: 'plan',
                id: p.id,
                fecha: p.fecha_compra ? p.fecha_compra.split('T')[0] : '',
                detalle: p.nombre_plan || 'Plan Kinésico',
                saldo
              });
            }
          });
        }

        // Detalle de citas particulares impagas
        if (deudaCitas > 0) {
          const citasParticularesList = planesPaciente.length === 0
            ? citasAsistidasValidas
            : citasAsistidasValidas.slice(totalSesionesCubiertasPorPlanes);

          const citasImpagasDetalle = sesionesImpagas > 0
            ? citasParticularesList.slice(-sesionesImpagas)
            : [];

          citasImpagasDetalle.forEach((c) => {
            desglose.push({
              tipo: 'cita',
              id: c.id,
              fecha: c.fecha || '',
              detalle: c.motivo_consulta || (planesPaciente.length > 0 ? 'Sesión Kinésica TMO (Excedente)' : 'Sesión Kinésica TMO'),
              saldo: arancelSugerido
            });
          });

          if (desglose.filter((x) => x.tipo === 'cita').length === 0) {
            desglose.push({
              tipo: 'cita',
              id: `cita-saldo-${pacId}`,
              fecha: hoyStr,
              detalle: 'Sesión(es) Kinésica(s) TMO Particular',
              saldo: deudaCitas
            });
          }
        }

        // Cálculo de Antigüedad (Aging) en días respecto a la obligación más antigua
        const fechasValidas = desglose.map((d) => d.fecha).filter(Boolean);
        const fechaMasAntigua = fechasValidas.sort()[0] || hoyStr;
        const fechaObj = new Date(fechaMasAntigua + 'T00:00:00');
        const hoyObj = new Date(hoyStr + 'T00:00:00');
        const diffMs = hoyObj.getTime() - fechaObj.getTime();
        const diasAntiguedad = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        let agingCategory: AgingCategory = 'reciente';
        let agingLabel = `Al Día (${diasAntiguedad}d)`;

        if (diasAntiguedad > 30) {
          agingCategory = 'mora_critica';
          agingLabel = `Mora Crítica (${diasAntiguedad}d)`;
        } else if (diasAntiguedad > 15) {
          agingCategory = 'por_gestionar';
          agingLabel = `Por Gestionar (${diasAntiguedad}d)`;
        }

        map.set(pacId, {
          pacienteId: pacId,
          paciente: { ...pacienteData, id: pacId },
          totalDeuda: deudaTotal,
          desglose,
          diasAntiguedad,
          fechaMasAntigua,
          agingCategory,
          agingLabel
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalDeuda - a.totalDeuda);
  }, [compras, citas, pagos, hoyStr]);

  const deudoresCount = deudoresConsolidados.length;

  const porCobrarPeriodo = useMemo(() => {
    return deudoresConsolidados.reduce((acc, curr) => acc + curr.totalDeuda, 0);
  }, [deudoresConsolidados]);

  // Aging KPIs
  const { totalReciente, countReciente, totalPorGestionar, countPorGestionar, totalMoraCritica, countMoraCritica } = useMemo(() => {
    let tRec = 0, cRec = 0;
    let tGes = 0, cGes = 0;
    let tMor = 0, cMor = 0;

    deudoresConsolidados.forEach((d) => {
      if (d.agingCategory === 'mora_critica') {
        tMor += d.totalDeuda;
        cMor++;
      } else if (d.agingCategory === 'por_gestionar') {
        tGes += d.totalDeuda;
        cGes++;
      } else {
        tRec += d.totalDeuda;
        cRec++;
      }
    });

    return {
      totalReciente: tRec,
      countReciente: cRec,
      totalPorGestionar: tGes,
      countPorGestionar: cGes,
      totalMoraCritica: tMor,
      countMoraCritica: cMor
    };
  }, [deudoresConsolidados]);

  // Filtrado de deudores por Aging
  const deudoresFiltrados = useMemo(() => {
    if (filtroAging === 'todos') return deudoresConsolidados;
    return deudoresConsolidados.filter((d) => d.agingCategory === filtroAging);
  }, [deudoresConsolidados, filtroAging]);

  const totalDeudaFiltrada = useMemo(() => {
    return deudoresFiltrados.reduce((acc, d) => acc + d.totalDeuda, 0);
  }, [deudoresFiltrados]);

  // Submódulo 3: Conciliación de Boletas Electrónicas Exentas (SII)
  const { pagosConBoleta, pagosSinBoleta, montoConBoleta, montoSinBoleta, pctConBoleta } = useMemo(() => {
    const conB = pagosFiltrados.filter((p) => !!(p.numero_boleta || p.n_boleta || p.comprobante));
    const sinB = pagosFiltrados.filter((p) => !(p.numero_boleta || p.n_boleta || p.comprobante));
    const mCon = conB.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    const mSin = sinB.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    const total = mCon + mSin;
    const pct = total > 0 ? Math.round((mCon / total) * 100) : 0;
    return {
      pagosConBoleta: conB,
      pagosSinBoleta: sinB,
      montoConBoleta: mCon,
      montoSinBoleta: mSin,
      pctConBoleta: pct
    };
  }, [pagosFiltrados]);

  const pagosAMostrar = useMemo(() => {
    if (filtroBoleta === 'con_boleta') return pagosConBoleta;
    if (filtroBoleta === 'sin_boleta') return pagosSinBoleta;
    return pagosFiltrados;
  }, [filtroBoleta, pagosFiltrados, pagosConBoleta, pagosSinBoleta]);

  const planesActivosLista = useMemo(() => {
    return compras.filter((t) => t.estado === 'activo' && (t.total_sesiones > t.sesiones_usadas));
  }, [compras]);

  const toggleExpandDeudor = (pacienteId: string) => {
    setExpandedDeudores((prev) => {
      const next = new Set(prev);
      if (next.has(pacienteId)) next.delete(pacienteId);
      else next.add(pacienteId);
      return next;
    });
  };

  // Submódulo 1: Copiar Rendición de Jornada Diaria
  const handleCopiarRendicion = () => {
    const ahora = new Date();
    const fechaChile = ahora.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const texto = `📋 RENDICIÓN DE CAJA DIARIA — KIROMOV
📍 Box Bulnes 470
📅 ${fechaChile}

💵 Efectivo en Cajón: ${formatCLP(totalEfectivo)}
💳 Vouchers Débito / POS: ${formatCLP(totalDebito)}
🏦 Transferencias Bancarias: ${formatCLP(totalTransferencia)}
----------------------------------------
💰 Total Ingresos: ${formatCLP(ingresosPeriodo)}
📉 Egresos Operativos: ${formatCLP(egresosPeriodo)}
✨ Flujo Neto del Día: ${formatCLP(flujoNetoPeriodo)}
----------------------------------------
Generado desde Kiromov Core`;

    navigator.clipboard.writeText(texto);
    toast.success('Rendición diaria copiada al portapapeles');
  };

  // Submódulo 2: Cobranza por WhatsApp con mensaje cordial adaptado al aging
  const handleCobrarWhatsApp = (deudor: DeudorConsolidado) => {
    const telefono = deudor.paciente?.telefono || '';
    const cleanPhone = telefono.replace(/\D/g, '').slice(-9);
    if (!cleanPhone) {
      toast.error('Paciente sin teléfono registrado');
      return;
    }

    const primerNombre = (deudor.paciente?.nombre_completo || '').split(' ')[0] || 'Estimado/a';

    let saludo = `Hola ${primerNombre}, te saludamos de KIROMOV Centro Clínico. Esperamos que tu tratamiento vaya muy bien.`;
    if (deudor.agingCategory === 'mora_critica') {
      saludo = `Estimado/a ${primerNombre}, nos comunicamos de KIROMOV Centro Clínico respecto a tu cuenta pendiente de atención.`;
    } else if (deudor.agingCategory === 'por_gestionar') {
      saludo = `Hola ${primerNombre}, te saludamos de KIROMOV Centro Clínico para coordinar la regularización de tu saldo pendiente.`;
    }

    const texto = `${saludo}
Te recordamos que mantienes un saldo pendiente consolidado de ${formatCLP(deudor.totalDeuda)}.

Datos para transferencia:
• Banco: Santander
• Tipo de Cuenta: Corriente
• N° Cuenta: 7654321
• RUT: 76.543.210-9
• Correo: pagos@kiromov.cl

Por favor envíanos tu comprobante por este medio al realizar el pago para emitir tu Boleta Electrónica Exenta. ¡Muchas gracias!`;

    window.open(`https://wa.me/56${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Submódulo 3: Asignar / Editar Boleta Electrónica Exenta
  const handleAbrirAsignarBoleta = (pago: any) => {
    setBoletaModalPago(pago);
    setBoletaInputNumero(pago.numero_boleta || pago.n_boleta || pago.comprobante || '');
  };

  const handleGuardarBoleta = async () => {
    if (!supabase || !boletaModalPago) return;
    setSavingBoleta(true);
    const boletaLimpia = boletaInputNumero.trim() || null;
    try {
      let { error } = await supabase
        .from('pagos_pacientes')
        .update({ numero_boleta: boletaLimpia })
        .eq('id', boletaModalPago.id);

      if (error && error.message?.includes('numero_boleta')) {
        const res = await supabase
          .from('pagos_pacientes')
          .update({ n_boleta: boletaLimpia })
          .eq('id', boletaModalPago.id);
        error = res.error;
      }

      if (error) throw error;
      toast.success('Boleta Electrónica Exenta guardada');
      setBoletaModalPago(null);
      setBoletaInputNumero('');
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar boleta: ' + (err.message || ''));
    } finally {
      setSavingBoleta(false);
    }
  };

  // Submódulo 4: Egresos de clínica
  const handleAddEgreso = async () => {
    if (!supabase) return;
    if (!egresoForm.concepto || !egresoForm.monto) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSavingEgreso(true);
    const payload = {
      concepto: egresoForm.concepto.trim(),
      categoria: egresoForm.categoria || 'Otros Gastos',
      medio_pago: egresoForm.formaPago || 'Débito / Transbank',
      monto_clp: parseInt(String(egresoForm.monto).replace(/\D/g, ''), 10) || 0,
      fecha: egresoForm.fecha || getChileanDate(),
      responsable: 'Clínica'
    };
    try {
      const { error } = await supabase.from('egresos_caja').insert([payload]);
      if (error) {
        console.error('Error en Supabase:', error);
        throw new Error(error.message);
      }
      toast.success('Egreso registrado exitosamente');
      setShowEgresoModal(false);
      setEgresoForm({
        concepto: '',
        categoria: 'Insumos Clínicos (Punción, cremas, toallas)',
        monto: '',
        formaPago: 'Débito / Transbank',
        fecha: ''
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar egreso');
    } finally {
      setSavingEgreso(false);
    }
  };

  const handleAbrirEditarEgreso = (egreso: any) => {
    setEditingEgreso(egreso);
  };

  const handleEliminarEgreso = async (egresoId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto / egreso? Esta acción no se puede deshacer.')) {
      return;
    }
    if (!supabase) return;
    try {
      const { error } = await supabase.from('egresos_caja').delete().eq('id', egresoId);
      if (error) throw error;
      toast.success('Egreso eliminado correctamente');
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar egreso: ' + (err.message || ''));
    }
  };

  return (
    <div className="min-h-screen bg-cloud pb-20 font-sans text-ink-navy">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 sm:space-y-8 print:hidden">

        {/* HEADER Y SELECTOR DE PERÍODO FLEXIBLE (SUBMÓDULO 1) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-ink-navy tracking-tight flex items-center gap-2.5">
              <span>Finanzas & Caja</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                En vivo
              </span>
            </h1>
            <p className="text-xs sm:text-[14px] text-slate-gray mt-1">
              Flujo de caja en box, cobranzas con aging y conciliación de Boletas Electrónicas Exentas.
            </p>
          </div>

          {/* Control Segmentado de Período Flexible */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 bg-paper p-1 rounded-xl border border-hairline shadow-xs">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'este_mes', label: 'Este Mes' },
                { id: 'mes_anterior', label: 'Mes Anterior' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setPeriodo(btn.id as PeriodoFiltro)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodo === btn.id
                      ? 'bg-ink-navy text-white shadow-xs'
                      : 'text-slate-gray hover:text-ink-navy hover:bg-pebble'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {periodo === 'personalizado' && (
              <div className="flex items-center gap-1.5 bg-paper p-1 rounded-xl border border-hairline shadow-xs">
                <input
                  type="date"
                  value={fechaPersonalizadaDesde}
                  onChange={(e) => setFechaPersonalizadaDesde(e.target.value)}
                  className="bg-transparent text-xs font-medium text-ink-navy px-2 py-1 outline-none"
                  title="Fecha desde"
                />
                <span className="text-xs text-slate-400">a</span>
                <input
                  type="date"
                  value={fechaPersonalizadaHasta}
                  onChange={(e) => setFechaPersonalizadaHasta(e.target.value)}
                  className="bg-transparent text-xs font-medium text-ink-navy px-2 py-1 outline-none"
                  title="Fecha hasta"
                />
              </div>
            )}
          </div>
        </div>

        {/* SUBMÓDULO 1: TARJETA DE RENDICIÓN DE JORNADA DIARIA (CUANDO SE SELECCIONA HOY) */}
        {periodo === 'hoy' && (
          <div className="bg-gradient-to-r from-signal-blue/5 via-pebble to-signal-blue/10 border border-signal-blue/20 rounded-2xl p-5 sm:p-6 shadow-calendly flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold text-ink-navy flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-signal-blue" />
                  Rendición de Jornada Diaria — Bulnes 470
                </h3>
                <span className="text-xs bg-signal-blue/10 text-signal-blue font-bold px-2 py-0.5 rounded-md">
                  Hoy
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-gray">
                Cuadre físico de jornada: verifica el cajón en box con billetes y los vouchers del POS Transbank.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="bg-white/90 border border-hairline px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
                  💵 Efectivo en Gaveta: <span className="font-bold text-ink-navy font-mono">{formatCLP(totalEfectivo)}</span>
                </div>
                <div className="bg-white/90 border border-hairline px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
                  💳 Vouchers POS: <span className="font-bold text-ink-navy font-mono">{formatCLP(totalDebito)}</span>
                </div>
                <div className="bg-white/90 border border-hairline px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
                  🏦 Transferencias: <span className="font-bold text-ink-navy font-mono">{formatCLP(totalTransferencia)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full md:w-auto">
              <Button
                type="button"
                onClick={handleCopiarRendicion}
                className="w-full sm:w-auto min-h-[44px] bg-ink-navy hover:bg-ink-navy/90 text-white font-bold text-xs rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Rendición del Día</span>
              </Button>
              <Button
                type="button"
                onClick={() => setShowEgresoModal(true)}
                className="w-full sm:w-auto min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Gasto Hoy</span>
              </Button>
            </div>
          </div>
        )}

        {/* KPIS DE CAJA Y FINANZAS (4 COLUMNAS CON DESGLOSE DE 3 CANALES EN BOX) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Card 1: Ingresos Reales con Micro-píldoras */}
          <div className="bg-paper rounded-cards p-4 sm:p-5 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-inputs bg-pebble flex items-center justify-center text-signal-blue shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-[11px] font-bold text-slate-gray uppercase tracking-wider">Ingresos Reales</h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">
                {pagosFiltrados.length} {pagosFiltrados.length === 1 ? 'pago' : 'pagos'}
              </span>
            </div>
            <p className="text-2xl lg:text-[28px] font-bold text-ink-navy leading-tight truncate">
              {formatCLP(ingresosPeriodo)}
            </p>

            {/* Micro-píldoras de los 3 canales de cobro */}
            <div className="mt-3 pt-3 border-t border-hairline/80 grid grid-cols-3 gap-1.5 text-[11px]">
              <div className="bg-pebble/70 rounded-lg p-1.5 text-center">
                <span className="block text-[10px] text-slate-500 font-medium">💵 Efectivo</span>
                <span className="font-bold text-ink-navy font-mono text-[11px] truncate block">
                  {formatCLP(totalEfectivo)}
                </span>
              </div>
              <div className="bg-pebble/70 rounded-lg p-1.5 text-center">
                <span className="block text-[10px] text-slate-500 font-medium">💳 POS Débito</span>
                <span className="font-bold text-ink-navy font-mono text-[11px] truncate block">
                  {formatCLP(totalDebito)}
                </span>
              </div>
              <div className="bg-pebble/70 rounded-lg p-1.5 text-center">
                <span className="block text-[10px] text-slate-500 font-medium">🏦 Transf.</span>
                <span className="font-bold text-ink-navy font-mono text-[11px] truncate block">
                  {formatCLP(totalTransferencia)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Egresos Operativos */}
          <div className="bg-paper rounded-cards p-4 sm:p-5 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-inputs bg-pebble flex items-center justify-center text-rose-600 shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-gray uppercase tracking-wider">Egresos</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  {egresosFiltrados.length} {egresosFiltrados.length === 1 ? 'gasto' : 'gastos'}
                </span>
              </div>
              <p className="text-2xl lg:text-[28px] font-bold text-ink-navy leading-tight truncate">
                {formatCLP(egresosPeriodo)}
              </p>
            </div>
            <p className="text-[11px] text-slate-gray mt-2 pt-2 border-t border-hairline/80 truncate">
              Arriendo Box, insumos y software
            </p>
          </div>

          {/* Card 3: Flujo Neto Real */}
          <div className="bg-paper rounded-cards p-4 sm:p-5 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-inputs bg-cloud flex items-center justify-center text-deep-cobalt shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-gray uppercase tracking-wider">Flujo Neto</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flujoNetoPeriodo >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {flujoNetoPeriodo >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <p className={`text-2xl lg:text-[28px] font-bold leading-tight truncate ${flujoNetoPeriodo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCLP(flujoNetoPeriodo)}
              </p>
            </div>
            <p className="text-[11px] text-slate-gray mt-2 pt-2 border-t border-hairline/80">
              Ingresos reales menos gastos operativos
            </p>
          </div>

          {/* Card 4: Por Cobrar Acumulado Histórico con Aging */}
          <div className="bg-paper rounded-cards p-4 sm:p-5 shadow-calendly border border-hairline transition-all hover:shadow-calendly-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-inputs bg-pebble flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-gray uppercase tracking-wider">Por Cobrar</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Histórico
                </span>
              </div>
              <p className="text-2xl lg:text-[28px] font-bold text-ink-navy leading-tight truncate">
                {formatCLP(porCobrarPeriodo)}
              </p>
            </div>
            <div className="text-[11px] text-slate-gray mt-2 pt-2 border-t border-hairline/80 flex items-center justify-between">
              <span>{deudoresCount} pacientes</span>
              {totalMoraCritica > 0 && (
                <span className="text-rose-600 font-bold text-[10px]">
                  🔴 {formatCLP(totalMoraCritica)} en mora
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TABS PRINCIPALES */}
        <div className="bg-paper rounded-cards shadow-calendly border border-hairline overflow-hidden">
          <div className="border-b border-hairline flex overflow-x-auto no-scrollbar bg-cloud">
            <button
              onClick={() => setActiveTab('deben')}
              className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'deben'
                  ? 'border-amber-500 text-amber-700 bg-paper'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <span>⚠️ Centro de Cobranzas</span>
              {deudoresCount > 0 && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {deudoresCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pagados')}
              className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'pagados'
                  ? 'border-emerald-600 text-emerald-700 bg-paper'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <span>💰 Libro de Ingresos & Boletas Exentas</span>
              {pagosSinBoleta.length > 0 && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {pagosSinBoleta.length} sin boleta
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('egresos')}
              className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'egresos'
                  ? 'border-rose-500 text-rose-600 bg-paper'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <span>📉 Egresos Operativos</span>
            </button>

            <button
              onClick={() => setActiveTab('planes')}
              className={`min-h-[48px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'planes'
                  ? 'border-signal-blue text-signal-blue bg-paper'
                  : 'border-transparent text-slate-gray hover:text-ink-navy hover:bg-pebble'
              }`}
            >
              <span>📦 Planes Activos</span>
              {planesActivosLista.length > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {planesActivosLista.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-0 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="font-semibold text-sm">Cargando registros contables...</p>
              </div>
            ) : (
              <>
                {/* ========================================================================= */}
                {/* SUBMÓDULO 2: CENTRO DE COBRANZAS HISTÓRICO CON AGING (TAB 'deben') */}
                {/* ========================================================================= */}
                {activeTab === 'deben' && (
                  <div>
                    {/* Mini-filtro por Antigüedad de Deuda (Aging) */}
                    <div className="p-4 border-b border-hairline flex flex-wrap items-center justify-between gap-3 bg-cloud/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setFiltroAging('todos')}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filtroAging === 'todos'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-paper text-slate-gray border border-hairline hover:bg-pebble'
                          }`}
                        >
                          Todos ({deudoresConsolidados.length})
                        </button>
                        <button
                          onClick={() => setFiltroAging('reciente')}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filtroAging === 'reciente'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-paper text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          🟢 Recientes 0-15d ({countReciente})
                        </button>
                        <button
                          onClick={() => setFiltroAging('por_gestionar')}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filtroAging === 'por_gestionar'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-paper text-amber-800 border border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          🟡 Por Gestionar 16-30d ({countPorGestionar})
                        </button>
                        <button
                          onClick={() => setFiltroAging('mora_critica')}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filtroAging === 'mora_critica'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-paper text-rose-800 border border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          🔴 Mora Crítica &gt;30d ({countMoraCritica})
                        </button>
                      </div>

                      <div className="text-xs text-slate-gray font-medium">
                        <span>Total listado: </span>
                        <span className="font-bold font-mono text-rose-600 text-sm">
                          {formatCLP(totalDeudaFiltrada)}
                        </span>
                      </div>
                    </div>

                    {deudoresFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-base font-bold text-slate-700">¡Cuentas al día!</p>
                        <p className="text-sm mt-1 text-slate-500">
                          {filtroAging === 'todos'
                            ? 'No hay saldos pendientes legítimos registrados en la clínica.'
                            : 'No hay deudores en la categoría de antigüedad seleccionada.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-amber-50 text-amber-900 border-b border-amber-200 text-xs uppercase tracking-wider font-bold">
                            <tr>
                              <th className="py-3 px-4">Paciente</th>
                              <th className="py-3 px-4">Antigüedad (Aging)</th>
                              <th className="py-3 px-4">Teléfono</th>
                              <th className="py-3 px-4">Obligaciones</th>
                              <th className="py-3 px-4 text-right">Deuda Consolidada</th>
                              <th className="py-3 px-4 text-center">Acciones de Cobro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deudoresFiltrados.map((d) => {
                              const isExpanded = expandedDeudores.has(d.pacienteId);
                              const p = d.paciente;

                              // Badge de aging
                              let badgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              if (d.agingCategory === 'mora_critica') {
                                badgeCls = 'bg-rose-50 text-rose-700 border-rose-200';
                              } else if (d.agingCategory === 'por_gestionar') {
                                badgeCls = 'bg-amber-50 text-amber-800 border-amber-200';
                              }

                              return (
                                <React.Fragment key={d.pacienteId}>
                                  <tr className="hover:bg-amber-50/30 transition-colors">
                                    {/* Paciente y Toggle Acordeón */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandDeudor(d.pacienteId)}
                                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                          title={isExpanded ? "Ocultar desglose" : "Ver desglose de obligaciones"}
                                        >
                                          <span className={`inline-block transform transition-transform text-xs font-bold ${isExpanded ? 'rotate-90' : ''}`}>
                                            ▶
                                          </span>
                                        </button>
                                        <div>
                                          <div
                                            className="font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                                            onClick={() => toggleExpandDeudor(d.pacienteId)}
                                          >
                                            {p.nombre_completo || 'Paciente sin registrar'}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            {p.rut ? formatRut(p.rut) : 'Sin RUT'}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Badge Semafórico de Aging */}
                                    <td className="py-3 px-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeCls}`}>
                                        <Clock className="w-3 h-3 shrink-0" />
                                        {d.agingLabel}
                                      </span>
                                    </td>

                                    {/* Teléfono */}
                                    <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                                      {p.telefono || 'Sin teléfono'}
                                    </td>

                                    {/* Ítems pendientes */}
                                    <td className="py-3 px-4 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandDeudor(d.pacienteId)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer text-xs"
                                      >
                                        <span>{d.desglose.length} {d.desglose.length === 1 ? 'ítem' : 'ítems'}</span>
                                        <span className="text-[10px] text-amber-700">{isExpanded ? '▲' : '▼'}</span>
                                      </button>
                                    </td>

                                    {/* Deuda Consolidada */}
                                    <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-600 text-base tabular-nums">
                                      {formatCLP(d.totalDeuda)}
                                    </td>

                                    {/* Acciones */}
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedDeudorForCheckout(d);
                                            setSelectedDeudaItemForCheckout(null);
                                            setIsCheckoutOpen(true);
                                          }}
                                          className="min-h-[36px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                          title="Cobrar deuda consolidada con Webpay/Transbank o Transferencia"
                                        >
                                          <CreditCard className="w-3.5 h-3.5" />
                                          <span>Cobrar</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleCobrarWhatsApp(d)}
                                          className="min-h-[36px] px-2.5 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                                          title={`Enviar recordatorio de cobro por WhatsApp a ${p.nombre_completo}`}
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">WhatsApp</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Acordeón desplegable: Subdesglose por obligación */}
                                  {isExpanded && (
                                    <tr className="bg-slate-50/90 border-b border-slate-200/90">
                                      <td colSpan={6} className="py-3 px-6 sm:px-8">
                                        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                                            <span>Detalle de Obligaciones Pendientes</span>
                                            <span>Subtotal Pendiente</span>
                                          </div>
                                          <div className="divide-y divide-slate-100 text-xs">
                                            {d.desglose.map((sub, sIdx) => (
                                              <div key={sIdx} className="py-2 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                                    sub.tipo === 'plan' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                  }`}>
                                                    {sub.tipo}
                                                  </span>
                                                  <span className="font-semibold text-slate-800 truncate">{sub.detalle}</span>
                                                  {sub.fecha && (
                                                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                                      📅 {sub.fecha}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                  <span className="font-mono font-bold text-rose-600 tabular-nums">
                                                    {formatCLP(sub.saldo)}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedDeudaItemForCheckout({
                                                        tipo: sub.tipo,
                                                        id: sub.id,
                                                        plan_id: sub.tipo === 'plan' ? sub.id : undefined,
                                                        cita_id: sub.tipo === 'cita' ? sub.id : undefined,
                                                        concepto: sub.detalle,
                                                        deudaTotal: sub.saldo,
                                                        fecha: sub.fecha
                                                      });
                                                      setSelectedDeudorForCheckout(d);
                                                      setIsCheckoutOpen(true);
                                                    }}
                                                    className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                                                  >
                                                    Cobrar este ítem
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* SUBMÓDULO 3: LIBRO DE INGRESOS Y CONCILIACIÓN DE BOLETAS EXENTAS (TAB 'pagados') */}
                {/* ========================================================================= */}
                {activeTab === 'pagados' && (
                  <div>
                    {/* Barra de Cumplimiento Tributario SII */}
                    <div className="p-4 sm:p-5 border-b border-hairline bg-gradient-to-r from-emerald-50/60 to-cloud space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-ink-navy flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-emerald-600" />
                            Conciliación de Boletas Electrónicas Exentas (SII)
                          </h3>
                          <p className="text-xs text-slate-gray mt-0.5">
                            Respaldo tributario exento de IVA para kinesiología y terapia manual ortopédica.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-gray">Cumplimiento:</span>
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${pctConBoleta >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {pctConBoleta}% Emitido
                          </span>
                        </div>
                      </div>

                      {/* Barra de progreso de emisión */}
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-500"
                          style={{ width: `${pctConBoleta}%` }}
                          title={`Emitidas: ${pctConBoleta}% (${formatCLP(montoConBoleta)})`}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all duration-500"
                          style={{ width: `${100 - pctConBoleta}%` }}
                          title={`Pendientes: ${100 - pctConBoleta}% (${formatCLP(montoSinBoleta)})`}
                        />
                      </div>

                      {/* Resumen y filtros */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            Emitidas: <strong className="font-mono">{formatCLP(montoConBoleta)}</strong> ({pagosConBoleta.length})
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Pendientes: <strong className="font-mono">{formatCLP(montoSinBoleta)}</strong> ({pagosSinBoleta.length})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setFiltroBoleta('todos')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              filtroBoleta === 'todos'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-paper text-slate-gray border border-hairline hover:bg-pebble'
                            }`}
                          >
                            Todos ({pagosFiltrados.length})
                          </button>
                          <button
                            onClick={() => setFiltroBoleta('con_boleta')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              filtroBoleta === 'con_boleta'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-paper text-slate-gray border border-hairline hover:bg-pebble'
                            }`}
                          >
                            Con Boleta Exenta
                          </button>
                          <button
                            onClick={() => setFiltroBoleta('sin_boleta')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              filtroBoleta === 'sin_boleta'
                                ? 'bg-amber-600 text-white'
                                : 'bg-paper text-amber-800 border border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            ⚠️ Pendientes ({pagosSinBoleta.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {pagosAMostrar.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">
                        No hay pagos registrados para este filtro o período.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-emerald-50 text-emerald-800 border-b border-emerald-100 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-3 px-4">Fecha Pago</th>
                              <th className="py-3 px-4">Paciente</th>
                              <th className="py-3 px-4">Servicio / Glosa</th>
                              <th className="py-3 px-4">Canal de Pago</th>
                              <th className="py-3 px-4">Respaldo SII (Boleta Exenta)</th>
                              <th className="py-3 px-4 text-right">Monto CLP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pagosAMostrar.map((p) => {
                              const boletaFolio = p.numero_boleta || p.n_boleta || p.comprobante;
                              return (
                                <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                                    {p.fecha ? p.fecha.split('T')[0] : ''}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900">{p.pacientes?.nombre_completo || 'Paciente'}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {p.pacientes?.rut ? formatRut(p.pacientes.rut) : 'Sin RUT'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-medium text-slate-700 text-xs">
                                    {p.notas || 'Sesión Kinésica TMO'}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-600">
                                    <span className="font-medium">{p.metodo_pago || 'Transferencia'}</span>
                                  </td>

                                  {/* Respaldo Tributario Boleta Electrónica Exenta */}
                                  <td className="py-3 px-4">
                                    {boletaFolio ? (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-xs">
                                        <span>📄 Boleta Exenta N° {boletaFolio}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirAsignarBoleta(p)}
                                          className="text-emerald-800 hover:text-emerald-950 p-0.5 rounded cursor-pointer"
                                          title="Modificar número de boleta"
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleAbrirAsignarBoleta(p)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold border border-amber-200 text-xs cursor-pointer transition-colors"
                                      >
                                        <span>+ Asignar Boleta Exenta</span>
                                      </button>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                                    {formatCLP(p.monto)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* SUBMÓDULO 4: EGRESOS OPERATIVOS DE CLÍNICA (TAB 'egresos') */}
                {/* ========================================================================= */}
                {activeTab === 'egresos' && (
                  <div>
                    <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-ink-navy">
                          Gastos Operativos del Centro Clínico
                        </h3>
                        <p className="text-xs text-slate-gray">
                          Arriendo de Box en Bulnes 470, insumos de punción y gastos de operación.
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowEgresoModal(true)}
                        className="min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm px-4 py-2 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Nuevo Egreso
                      </Button>
                    </div>

                    {egresosFiltrados.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">
                        No hay egresos registrados en este período.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Concepto / Glosa</th>
                              <th className="py-3 px-4">Categoría Clínica</th>
                              <th className="py-3 px-4">Canal</th>
                              <th className="py-3 px-4 text-right">Monto CLP</th>
                              <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {egresosFiltrados.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                                  {e.fecha}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {e.concepto}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold">
                                    {e.categoria}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                                  {e.medio_pago || 'Débito / Transbank'}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-rose-600 font-mono">
                                  {formatCLP(e.monto_clp)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirEditarEgreso(e)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="Editar gasto"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarEgreso(e.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Eliminar gasto"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* SUBMÓDULO: PLANES ACTIVOS (TAB 'planes') */}
                {/* ========================================================================= */}
                {activeTab === 'planes' && (
                  <div className="overflow-x-auto">
                    {planesActivosLista.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center">
                        No hay planes activos en este momento.
                      </p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-signal-blue/10 text-signal-blue border-b border-signal-blue/20 text-xs uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Paciente</th>
                            <th className="py-3 px-4">Plan / Tratamiento</th>
                            <th className="py-3 px-4">Progreso de Sesiones</th>
                            <th className="py-3 px-4 text-right">Saldo de Plan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {planesActivosLista.map((p) => {
                            const usadas = p.sesiones_usadas || 0;
                            const totales = p.total_sesiones || 0;
                            const porcentaje = totales > 0 ? (usadas / totales) * 100 : 0;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {p.pacientes?.nombre_completo || 'Paciente'}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700 text-xs">
                                  {p.nombre_plan || 'Plan Kinésico'}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">
                                      {usadas} / {totales}
                                    </span>
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-signal-blue rounded-full"
                                        style={{ width: `${porcentaje}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                  {p.saldo_pendiente > 0 ? (
                                    <span className="text-rose-600 font-bold font-mono">
                                      Debe {formatCLP(p.saldo_pendiente)}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold">Al día</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* MODAL PARA AGREGAR EGRESO OPERATIVO */}
      <Dialog open={showEgresoModal} onOpenChange={setShowEgresoModal}>
        <DialogHeader>
          <DialogTitle>Registrar Egreso de Caja</DialogTitle>
          <DialogDescription>Añade un nuevo gasto operativo a la clínica.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Concepto / Descripción</label>
            <Input
              required
              placeholder="Ej: Insumos punción seca, bolsas hielo..."
              value={egresoForm.concepto}
              onChange={(e) => setEgresoForm({ ...egresoForm, concepto: e.target.value })}
              className="bg-slate-50/50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fecha</label>
              <Input
                type="date"
                value={egresoForm.fecha}
                onChange={(e) => setEgresoForm({ ...egresoForm, fecha: e.target.value })}
                className="bg-slate-50/50 text-sm h-10"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-slate-700">Categoría Clínica</label>
              <select
                value={egresoForm.categoria}
                onChange={(e) => setEgresoForm({ ...egresoForm, categoria: e.target.value })}
                className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10 outline-none"
              >
                {CATEGORIAS_EGRESO.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Monto CLP</label>
              <Input
                type="number"
                required
                min="100"
                placeholder="Ej: 25000"
                value={egresoForm.monto}
                onChange={(e) => setEgresoForm({ ...egresoForm, monto: e.target.value })}
                className="bg-slate-50/50 font-bold"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Medio de Pago</label>
            <select
              value={egresoForm.formaPago}
              onChange={(e) => setEgresoForm({ ...egresoForm, formaPago: e.target.value })}
              className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10 outline-none"
            >
              <option value="Débito / Transbank">Débito / Transbank (POS)</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Efectivo">Efectivo en Box</option>
            </select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEgresoModal(false)}>Cancelar</Button>
          <Button
            onClick={handleAddEgreso}
            disabled={savingEgreso}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold min-h-[44px]"
          >
            {savingEgreso ? 'Guardando...' : 'Guardar Egreso'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL PARA ASIGNAR / CONCILIAR BOLETA ELECTRÓNICA EXENTA (SII) */}
      <Dialog open={!!boletaModalPago} onOpenChange={(open) => { if (!open) setBoletaModalPago(null); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Conciliar Boleta Electrónica Exenta (SII)
          </DialogTitle>
          <DialogDescription>
            Asigna o modifica el número de folio de la boleta electrónica emitida en el portal del SII.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          {boletaModalPago && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Paciente:</span>
                <span className="font-bold text-slate-800">{boletaModalPago.pacientes?.nombre_completo || 'Paciente'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto:</span>
                <span className="font-bold font-mono text-emerald-700">{formatCLP(boletaModalPago.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Pago:</span>
                <span className="font-mono text-slate-700">{boletaModalPago.fecha ? boletaModalPago.fecha.split('T')[0] : 'Hoy'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Canal:</span>
                <span className="font-medium text-slate-700">{boletaModalPago.metodo_pago || 'N/A'}</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">N° Folio Boleta Electrónica Exenta</label>
            <Input
              type="text"
              placeholder="Ej: 18045"
              value={boletaInputNumero}
              onChange={(e) => setBoletaInputNumero(e.target.value)}
              className="bg-white font-mono text-sm"
              autoFocus
            />
            <p className="text-[11px] text-slate-400">
              Ingresa el folio oficial generado en sii.cl para respaldar este ingreso exento de IVA.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBoletaModalPago(null)}>Cancelar</Button>
          <Button
            onClick={handleGuardarBoleta}
            disabled={savingBoleta}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[44px]"
          >
            {savingBoleta ? 'Guardando...' : 'Guardar Boleta Exenta'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CHECKOUT MODAL DE COBRANZA */}
      <PaymentCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedDeudorForCheckout(null);
          setSelectedDeudaItemForCheckout(null);
        }}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          setSelectedDeudorForCheckout(null);
          setSelectedDeudaItemForCheckout(null);
          loadData();
        }}
        initialMode="deuda"
        paciente={selectedDeudorForCheckout?.paciente}
        pacienteId={selectedDeudorForCheckout?.pacienteId}
        deudaInfo={selectedDeudaItemForCheckout || (selectedDeudorForCheckout ? {
          deudaTotal: selectedDeudorForCheckout.totalDeuda,
          concepto: `Deuda consolidada (${selectedDeudorForCheckout.desglose.length} ítems)`,
          plan_id: selectedDeudorForCheckout.desglose.find((x) => x.tipo === 'plan')?.id,
          cita_id: selectedDeudorForCheckout.desglose.find((x) => x.tipo === 'cita')?.id
        } : null)}
      />

      {/* CANCELAR PLAN MODAL */}
      <CancelPlanModal
        isOpen={!!cancelingPlan}
        onClose={() => setCancelingPlan(null)}
        plan={cancelingPlan}
        patientName={cancelingPlan?.pacientes?.nombre_completo}
        onSuccess={() => { setCancelingPlan(null); loadData(); }}
      />

      {/* EDITAR EGRESO MODAL */}
      <EditExpenseModal
        isOpen={!!editingEgreso}
        onClose={() => setEditingEgreso(null)}
        egreso={editingEgreso}
        onSuccess={loadData}
      />
    </div>
  );
}

export default function FinanzasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <FinanzasContent />
    </Suspense>
  );
}
