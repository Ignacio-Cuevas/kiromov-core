'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { getChileanDate, formatCLP, getWhatsAppUrl } from '@/lib/utils';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { InitialEvaluationModal } from '@/components/clinical/InitialEvaluationModal';
import { DischargeReportModal } from '@/components/clinical/DischargeReportModal';
import { ReimbursementCertificate } from '@/components/clinical/ReimbursementCertificate';
import { EditPatientDialog } from '@/components/patients/EditPatientDialog';
import { ManagePlanModal } from '@/components/patients/ManagePlanModal';
import { PayPlanModal } from '@/components/patients/PayPlanModal';
import { CancelPlanModal } from '@/components/sales/CancelPlanModal';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Phone,
  MessageCircle,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  ShieldAlert,
  Edit,
  Trash2,
  Plus,
  ArrowRight,
  ExternalLink,
  User,
  Stethoscope,
  Receipt,
  FileCheck2,
  UserCheck
} from 'lucide-react';

export interface ClinicalRecordViewProps {
  pacienteId: string;
  citaId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const calcularPronosticoAltaClinica = (historialSOAP: any[]) => {
  // CASO A: Menos de 2 sesiones (Modo Calibración)
  if (!historialSOAP || historialSOAP.length < 2) {
    const dolorInicial = historialSOAP?.[0]?.nivel_dolor_ena ?? 7;
    return {
      fase: 'calibracion',
      titulo: '⏳ Calibrando Respuesta Tisular',
      mensaje: `Línea de base fijada (ENA ${dolorInicial}/10). La proyección de sesiones se calculará a partir de la 2ª sesión tras evaluar la respuesta tisular.`,
      sesionesRealizadas: historialSOAP?.length || 1,
      faltanSesiones: null,
      porcentaje: 20,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      metaAlcanzada: false
    };
  }

  // CASO B: 2 o más sesiones (Cálculo Predictivo Real)
  const notas = [...historialSOAP].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const s1 = notas[0];
  const sn = notas[notas.length - 1];

  const dolorInicial = Number(s1.nivel_dolor_ena) || 7;
  const dolorActual = Number(sn.nivel_dolor_ena) || 0;
  const totalSesiones = notas.length;

  const deltaDolor = dolorInicial - dolorActual;
  const pctMejoria = dolorInicial > 0 ? Math.round((deltaDolor / dolorInicial) * 100) : 0;

  let faltanAprox = 3;
  let clasificacion = 'Favorable';
  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

  if (dolorActual <= 1) {
    faltanAprox = 0;
    clasificacion = 'Meta alcanzada';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (pctMejoria >= 50 || dolorActual <= 3) {
    faltanAprox = Math.max(1, 4 - totalSesiones);
    clasificacion = `Respuesta rápida (${pctMejoria}% de alivio)`;
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (pctMejoria >= 20) {
    faltanAprox = Math.max(2, 6 - totalSesiones);
    clasificacion = `Respuesta favorable (${pctMejoria}% de alivio)`;
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
  } else {
    faltanAprox = Math.max(3, 8 - totalSesiones);
    clasificacion = 'Respuesta lenta / Alta irritabilidad';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  const porcentajeEstimado = faltanAprox === 0 
    ? 100 
    : Math.min(95, Math.round((totalSesiones / (totalSesiones + faltanAprox)) * 100));

  return {
    fase: 'predictiva',
    titulo: faltanAprox === 0 ? '✅ Alta Funcional Alcanzada' : `Faltan ~${faltanAprox} sesión(es) para el alta`,
    clasificacion,
    mensaje: `Basado en ${totalSesiones} sesiones con dolor actual ENA ${dolorActual}/10 (Meta: ≤ 1/10).`,
    sesionesRealizadas: totalSesiones,
    faltanSesiones: faltanAprox,
    porcentaje: porcentajeEstimado,
    badgeColor,
    metaAlcanzada: faltanAprox === 0
  };
};

export function ClinicalRecordView({
  pacienteId,
  citaId,
  onClose,
  onSuccess
}: ClinicalRecordViewProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  // Asegurar montaje solo en cliente y bloquear scroll de fondo
  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Estados de datos
  const [paciente, setPaciente] = useState<any>(null);
  const [planActivo, setPlanActivo] = useState<any>(null);
  const [historialSOAP, setHistorialSOAP] = useState<any[]>([]);
  const [proximaCita, setProximaCita] = useState<any>(null);
  const [citasHistoricas, setCitasHistoricas] = useState<any[]>([]);
  const [evaluacionesTMO, setEvaluacionesTMO] = useState<any[]>([]);
  const [evaluacionActivaIndex, setEvaluacionActivaIndex] = useState<number>(0);
  const [evaluacionInicialTMO, setEvaluacionInicialTMO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navegación por pestañas Medilink: 'soap' | 'tmo' | 'plan' | 'documentos'
  const [tabActiva, setTabActiva] = useState<'soap' | 'tmo' | 'plan' | 'documentos'>('soap');

  // Modales
  const [abrirAgendarModal, setAbrirAgendarModal] = useState(false);
  const [abrirEvaluacionModal, setAbrirEvaluacionModal] = useState(false);
  const [modoEvaluacion, setModoEvaluacion] = useState<'nueva' | 'editar'>('editar');
  const [abrirEditarPaciente, setAbrirEditarPaciente] = useState(false);
  const [abrirDischargeModal, setAbrirDischargeModal] = useState(false);
  const [abrirCertificadoModal, setAbrirCertificadoModal] = useState(false);
  const [abrirManagePlanModal, setAbrirManagePlanModal] = useState(false);
  const [abrirPayPlanModal, setAbrirPayPlanModal] = useState(false);
  const [abrirCancelPlanModal, setAbrirCancelPlanModal] = useState(false);

  // Formulario SOAP
  const [fechaSesion, setFechaSesion] = useState<string>(getChileanDate());
  const [nivelDolor, setNivelDolor] = useState(5);
  const [segmentosSeleccionados, setSegmentosSeleccionados] = useState<string[]>([]);
  const [tecnicasSeleccionadas, setTecnicasSeleccionadas] = useState<string[]>([]);
  const [sSubjetivo, setSSubjetivo] = useState('');
  const [oObjetivo, setOObjetivo] = useState('');
  const [aAnalisis, setAAnalisis] = useState('');
  const [pPlan, setPPlan] = useState('');
  const [pronostico, setPronostico] = useState('4 a 6 sesiones');

  // Control de acordeón en timeline histórico
  const [notaExpandidaId, setNotaExpandidaId] = useState<string | null>(null);

  // Edición rápida de nota en timeline
  const [notaEditando, setNotaEditando] = useState<any | null>(null);
  const [editFecha, setEditFecha] = useState<string>('');
  const [editEna, setEditEna] = useState<number>(5);
  const [editS, setEditS] = useState<string>('');
  const [editO, setEditO] = useState<string>('');
  const [editA, setEditA] = useState<string>('');
  const [editP, setEditP] = useState<string>('');
  const [savingNotaEdit, setSavingNotaEdit] = useState<boolean>(false);

  // Carga de datos de Supabase
  const cargarDatos = async () => {
    if (!pacienteId || !supabase) return;
    setLoading(true);
    try {
      // Paciente
      const { data: p } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single();
      if (p) setPaciente(p);

      // Plan activo más reciente
      const { data: plan } = await supabase
        .from('compras_planes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (plan) setPlanActivo(plan);

      // Historial SOAP
      const { data: soaps } = await supabase
        .from('evoluciones_soap')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha', { ascending: false });
      if (soaps) setHistorialSOAP(soaps);

      // Próxima Cita
      const hoyStr = getChileanDate();
      const { data: proxima } = await supabase
        .from('citas_atenciones')
        .select('id, fecha, hora, motivo_consulta, estado')
        .eq('paciente_id', pacienteId)
        .in('estado', ['pendiente', 'confirmada'])
        .gte('fecha', hoyStr)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
        .limit(1)
        .maybeSingle();
      setProximaCita(proxima || null);

      // Todas las citas del paciente (para pestaña Plan)
      const { data: citas } = await supabase
        .from('citas_atenciones')
        .select('id, fecha, hora, motivo_consulta, estado, profesional')
        .eq('paciente_id', pacienteId)
        .order('fecha', { ascending: false })
        .limit(30);
      if (citas) setCitasHistoricas(citas);

      // Evaluaciones Iniciales TMO
      const { data: evals } = await supabase
        .from('evaluaciones_iniciales_tmo')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_evaluacion', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (evals && evals.length > 0) {
        setEvaluacionesTMO(evals);
        setEvaluacionActivaIndex(0);
        setEvaluacionInicialTMO(evals[0]);
      } else {
        setEvaluacionesTMO([]);
        setEvaluacionInicialTMO(null);
      }
    } catch (err) {
      console.error('Error cargando datos en expediente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [pacienteId]);

  useEffect(() => {
    if (evaluacionesTMO.length > 0 && evaluacionActivaIndex >= 0 && evaluacionActivaIndex < evaluacionesTMO.length) {
      setEvaluacionInicialTMO(evaluacionesTMO[evaluacionActivaIndex]);
    }
  }, [evaluacionActivaIndex, evaluacionesTMO]);

  // Orden cronológico estricto: S1 (antigua) -> Sn (reciente)
  const notasCronologicas = useMemo(() => {
    return [...historialSOAP].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [historialSOAP]);

  const dolorInicial = notasCronologicas[0]?.nivel_dolor_ena ?? 0;
  const dolorActual = notasCronologicas[notasCronologicas.length - 1]?.nivel_dolor_ena ?? 0;
  const pctMejoria = dolorInicial > 0 
    ? Math.round(((dolorInicial - dolorActual) / dolorInicial) * 100) 
    : 0;

  // Manejador de chips
  const toggleSegmento = (seg: string) => {
    setSegmentosSeleccionados(prev =>
      prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
    );
  };

  const toggleTecnica = (tec: string) => {
    setTecnicasSeleccionadas(prev =>
      prev.includes(tec) ? prev.filter(t => t !== tec) : [...prev, tec]
    );
  };

  // Guardar SOAP
  const handleGuardarSOAP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);

    try {
      const payload = {
        paciente_id: pacienteId,
        fecha: fechaSesion,
        nivel_dolor_ena: Number(nivelDolor),
        s_subjetivo: sSubjetivo.trim(),
        o_objetivo: `[Segmentos: ${segmentosSeleccionados.join(', ') || 'General'}] ${oObjetivo.trim()}`,
        a_analisis: aAnalisis.trim(),
        p_plan: `[TMO: ${tecnicasSeleccionadas.join(' + ') || 'Terapia Kinésica'}] ${pPlan.trim()}`,
        pronostico_sesiones: pronostico,
        profesional: 'Klgo. Ignacio Cuevas Silva'
      };

      const { error } = await supabase.from('evoluciones_soap').insert([payload]);
      if (error) throw error;

      toast.success('Evolución clínica guardada en la ficha');
      
      setSSubjetivo('');
      setOObjetivo('');
      setAAnalisis('');
      setPPlan('');
      setSegmentosSeleccionados([]);
      setTecnicasSeleccionadas([]);
      await cargarDatos();
      onSuccess?.();
    } catch (err: any) {
      console.error('Error guardando SOAP:', err);
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edición rápida de nota
  const handleIniciarEdicionNota = (nota: any) => {
    setNotaEditando(nota);
    setEditFecha(nota.fecha || getChileanDate());
    setEditEna(Number(nota.nivel_dolor_ena) ?? 0);
    setEditS(nota.s_subjetivo || '');
    setEditO(nota.o_objetivo || '');
    setEditA(nota.a_analisis || '');
    setEditP(nota.p_plan || '');
  };

  const handleGuardarEdicionNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaEditando?.id || !supabase) return;
    setSavingNotaEdit(true);
    try {
      const { error } = await supabase
        .from('evoluciones_soap')
        .update({
          fecha: editFecha,
          nivel_dolor_ena: Number(editEna),
          s_subjetivo: editS.trim(),
          o_objetivo: editO.trim(),
          a_analisis: editA.trim(),
          p_plan: editP.trim(),
        })
        .eq('id', notaEditando.id);

      if (error) throw error;

      toast.success('Nota clínica actualizada exitosamente');
      setNotaEditando(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error al actualizar nota:', err);
      toast.error('Error al actualizar nota: ' + (err.message || ''));
    } finally {
      setSavingNotaEdit(false);
    }
  };

  const handleEliminarNota = async (notaId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta evolución clínica del historial?')) {
      return;
    }
    if (!supabase) return;
    try {
      const { error } = await supabase.from('evoluciones_soap').delete().eq('id', notaId);
      if (error) throw error;
      toast.success('Evolución eliminada exitosamente');
      await cargarDatos();
    } catch (err: any) {
      console.error('Error al eliminar evolución:', err);
      toast.error('Error al eliminar evolución: ' + (err.message || ''));
    }
  };

  const segmentosList = ['Cervical', 'Dorsal', 'Lumbopélvica', 'Hombro', 'Codo', 'Muñeca/Mano', 'Cadera', 'Rodilla', 'Tobillo/Pie', 'ATM'];
  const tecnicasList = [
    '⚡ Manipulación Articular (HVLA)',
    'Movilización Gr. I-IV',
    'Terapia Miofascial',
    'Neurodinamia',
    'Ejercicio Terapéutico',
    'Punción Seca',
    'Educación en Dolor'
  ];

  // Métricas del plan e información financiera
  const nombrePlanCintillo = planActivo?.nombre_plan || 'Sin plan activo';
  const sesionesUsadas = Number(planActivo?.sesiones_usadas ?? planActivo?.sesiones_consumidas ?? 0);
  const sesionesTotales = Number(planActivo?.sesiones_totales ?? planActivo?.total_sesiones ?? 0);
  const sesionesRestantes = Math.max(0, sesionesTotales - sesionesUsadas);
  const pctSesiones = sesionesTotales > 0 ? Math.min(100, Math.round((sesionesUsadas / sesionesTotales) * 100)) : 0;

  const totalPlanMonto = Number(planActivo?.total_final_clp ?? planActivo?.valor_total ?? planActivo?.monto_clp ?? 0);
  const saldoPendienteMonto = Number(planActivo?.saldo_pendiente ?? (planActivo?.estado_pago?.toLowerCase() === 'pagado' ? 0 : totalPlanMonto));
  const abonosMonto = Math.max(0, totalPlanMonto - saldoPendienteMonto);
  const estaAlDia = (planActivo?.estado_pago || '').toLowerCase() === 'pagado' || saldoPendienteMonto <= 0;

  // Banderas rojas o precaución HVLA
  const tieneBanderasRojas = Boolean(
    paciente?.banderas_rojas || 
    paciente?.alertas_seguridad || 
    (evaluacionInicialTMO && evaluacionInicialTMO.apto_hvla === false)
  );

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] top-0 left-0 w-screen h-screen m-0 p-0 bg-white flex flex-col overflow-hidden">
      
      {/* CABECERA ÚNICA DEL PACIENTE (Cubre toda la parte superior) */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            title="Volver a la vista anterior"
          >
            ← Volver
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none truncate">
              {paciente?.nombre_completo || (loading ? 'Cargando expediente...' : 'Paciente')}
            </h2>
            <button
              type="button"
              onClick={() => setAbrirEditarPaciente(true)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs"
              title="Editar datos del paciente / RUT"
            >
              ✏️
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
            {paciente?.rut || 'Sin RUT'}
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            {paciente?.prevision_salud || paciente?.prevision || 'Particular'}
          </span>
          {paciente?.telefono ? (
            <a
              href={getWhatsAppUrl(paciente.telefono, paciente.nombre_completo)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 px-2 py-0.5 rounded-md shrink-0 transition-colors"
              title="Contactar por WhatsApp"
            >
              💬 {paciente.telefono}
            </a>
          ) : (
            <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
              Sin teléfono
            </span>
          )}
          <button
            type="button"
            onClick={() => setAbrirManagePlanModal(true)}
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            title="Ajustar sesiones del plan"
          >
            <span>Plan: {planActivo?.sesiones_usadas || 0}/{planActivo?.sesiones_totales || 0} ses.</span>
            <Settings className="w-3 h-3 text-blue-500" />
          </button>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
            estaAlDia ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {estaAlDia ? '✓ Al día' : `🔴 Cobro Pendiente`}
          </span>
          {tieneBanderasRojas && (
            <div className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-lg bg-rose-600 text-white animate-pulse shrink-0 shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Precaución HVLA / Banderas Rojas</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAbrirAgendarModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            📅 Agendar Siguiente Cita
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            ✕ Salir
          </button>
        </div>
      </header>

      {/* BARRA DE PESTAÑAS PEGADA A LA CABECERA */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setTabActiva('soap')}
          className={`h-11 px-3.5 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            tabActiva === 'soap'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Evoluciones SOAP</span>
          {historialSOAP.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              tabActiva === 'soap' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {historialSOAP.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('tmo')}
          className={`h-11 px-3.5 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            tabActiva === 'tmo'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-indigo-600" />
          <span>Evaluación Inicial TMO</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            evaluacionesTMO.length > 0 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-amber-100 text-amber-800'
          }`}>
            {evaluacionesTMO.length > 0 ? `${evaluacionesTMO.length}` : 'Pendiente'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('plan')}
          className={`h-11 px-3.5 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            tabActiva === 'plan'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Plan de Tratamiento y Pagos</span>
          {planActivo && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              estaAlDia ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {sesionesUsadas}/{sesionesTotales}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('documentos')}
          className={`h-11 px-3.5 flex items-center gap-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            tabActiva === 'documentos'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-purple-600" />
          <span>Documentos y Certificados</span>
        </button>
      </div>

      {/* CUERPO PRINCIPAL BORDE A BORDE */}
      <div className="flex-1 min-h-0 bg-slate-50 p-4 overflow-hidden">
        
        {/* ================================================================== */}
        {/* PESTAÑA 1: EVOLUCIONES SOAP (30% IZQUIERDA / 70% DERECHA)          */}
        {/* ================================================================== */}
        {tabActiva === 'soap' && (
          <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
            
            {/* PANEL IZQUIERDO (30% - col-span-12 lg:col-span-4): TIMELINE + CURVA ENA */}
            <aside className="col-span-12 lg:col-span-4 h-full flex flex-col space-y-3 overflow-hidden">
              
              {/* TARJETA SUPERIOR: CURVA DE DOLOR ENA AMPLIA Y CÓMODA */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Curva de Dolor ENA
                    </h3>
                  </div>
                  {notasCronologicas.length > 1 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      pctMejoria >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}>
                      {pctMejoria >= 0 ? `-${pctMejoria}% dolor` : `+${Math.abs(pctMejoria)}% dolor`}
                    </span>
                  )}
                </div>

                {/* Estimación de Alta Funcional Compacta */}
                {(() => {
                  const estimacion = calcularPronosticoAltaClinica(historialSOAP);
                  return (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          🎯 Alta Funcional:
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate">
                          {estimacion.titulo}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        estimacion.metaAlcanzada ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {estimacion.porcentaje}%
                      </span>
                    </div>
                  );
                })()}

                {/* GRÁFICO ENA CON EJE Y, LÍNEAS GUÍA Y BARRAS */}
                {notasCronologicas.length > 0 ? (
                  <div className="pt-2">
                    <div className="relative h-44 pl-7 pr-2">
                      {/* Eje Y con escala del 0 al 10 y líneas guía punteadas */}
                      {[
                        { val: 10, label: '10', top: '0%' },
                        { val: 7, label: '7', top: '30%' },
                        { val: 5, label: '5', top: '50%' },
                        { val: 3, label: '3', top: '70%' },
                        { val: 0, label: '0', top: '100%' },
                      ].map((item) => (
                        <div key={item.val} className="absolute left-0 right-0 flex items-center" style={{ top: item.top }}>
                          <span className="w-5 text-right font-mono text-[9px] font-bold text-slate-400 select-none pr-1.5">
                            {item.label}
                          </span>
                          <div className={`flex-1 ${item.val === 0 ? 'border-b border-slate-300' : 'border-b border-dashed border-slate-200'}`} />
                        </div>
                      ))}

                      {/* Barras de Dolor ENA */}
                      <div className="relative z-10 h-full flex items-end justify-around gap-1 pt-3 pb-0.5">
                        {notasCronologicas.slice(-10).map((nota, idx) => {
                          const ena = Number(nota.nivel_dolor_ena) || 0;
                          const alturaPct = Math.max(6, (ena / 10) * 100);
                          const colorBarra = ena <= 3 ? 'bg-emerald-500 hover:bg-emerald-600' : ena <= 6 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600';
                          return (
                            <div key={nota.id || idx} className="flex-1 max-w-[28px] flex flex-col items-center h-full justify-end group relative cursor-pointer">
                              {/* Número ENA sobre la barra */}
                              <span className="text-[10px] font-bold font-mono text-slate-700 leading-none mb-1">
                                {ena}
                              </span>
                              {/* Barra */}
                              <div className="w-full bg-slate-100 rounded-t-md overflow-hidden flex items-end h-full">
                                <div
                                  className={`w-full ${colorBarra} rounded-t-md transition-all duration-300 shadow-xs`}
                                  style={{ height: `${alturaPct}%` }}
                                />
                              </div>
                              {/* Tooltip Hover */}
                              <div className="absolute -top-9 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                                {nota.fecha} • ENA {ena}/10
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Etiquetas de Sesión (S1, S2, etc.) */}
                    <div className="flex justify-around pl-7 pr-2 pt-1.5 border-t border-slate-200">
                      {notasCronologicas.slice(-10).map((nota, idx) => (
                        <span key={nota.id || idx} className="flex-1 max-w-[28px] text-center text-[9px] font-bold text-slate-500 font-mono">
                          S{idx + 1}
                        </span>
                      ))}
                    </div>

                    {/* Leyenda al pie */}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Leve (0-3)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          Mod (4-6)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                          Sev (7-10)
                        </span>
                      </div>
                      {notasCronologicas.length > 1 && (
                        <span className="font-semibold text-slate-700">
                          {pctMejoria >= 0 ? `-${pctMejoria}% dolor` : `+${Math.abs(pctMejoria)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Sin registros de dolor aún en las evoluciones.
                  </p>
                )}
              </div>

              {/* TARJETA INFERIOR: HISTORIAL DE NOTAS CON SCROLL INDEPENDIENTE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-1 min-h-[160px] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Historial Cronológico
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    {historialSOAP.length} notas
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-2.5">
                  {historialSOAP.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      No hay notas clínicas previas.
                    </p>
                  ) : (
                    historialSOAP.map((nota) => {
                      const expandida = notaExpandidaId === nota.id;
                      const enaNum = nota.nivel_dolor_ena ?? 0;
                      return (
                        <div
                          key={nota.id}
                          className="border border-slate-200 rounded-xl p-3 text-xs space-y-2 hover:border-slate-300 transition-colors bg-slate-50/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 font-mono text-xs">{nota.fecha}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              enaNum <= 3 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : enaNum <= 6
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}>
                              ENA {enaNum}/10
                            </span>

                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleIniciarEdicionNota(nota)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer text-xs hover:bg-blue-50 transition-colors"
                                title="Editar fecha o nota SOAP"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarNota(nota.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer text-xs hover:bg-rose-50 transition-colors"
                                title="Eliminar evolución"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Resumen o Despliegue Completo */}
                          {expandida ? (
                            <div className="space-y-2 pt-2 border-t border-slate-200 text-slate-700 leading-relaxed">
                              {nota.s_subjetivo && <p><strong>S:</strong> {nota.s_subjetivo}</p>}
                              {nota.o_objetivo && <p><strong>O:</strong> {nota.o_objetivo}</p>}
                              {nota.a_analisis && <p><strong>A:</strong> {nota.a_analisis}</p>}
                              {nota.p_plan && <p><strong>P:</strong> {nota.p_plan}</p>}
                              <button
                                type="button"
                                onClick={() => setNotaExpandidaId(null)}
                                className="text-blue-600 hover:underline font-semibold text-[11px] block mt-1 cursor-pointer"
                              >
                                Contraer ▲
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-600 line-clamp-2">
                                {nota.s_subjetivo || nota.o_objetivo || 'Evolución registrada.'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setNotaExpandidaId(nota.id)}
                                className="text-blue-600 hover:underline font-semibold text-[11px] block mt-1 cursor-pointer"
                              >
                                Leer más ▼
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </aside>

            {/* PANEL DERECHO (70% - col-span-12 lg:col-span-8): REGISTRO ACTIVO SOAP */}
            <main className="col-span-12 lg:col-span-8 h-full overflow-y-auto bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col">
              <form onSubmit={handleGuardarSOAP} className="space-y-4 flex-1 flex flex-col">
                
                {/* Franja Superior Compacta: Fecha + Escala ENA */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nivel de Dolor Actual (ENA 0-10):
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        nivelDolor <= 3 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : nivelDolor <= 6 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {nivelDolor} / 10
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase">Fecha:</label>
                      <input
                        type="date"
                        value={fechaSesion}
                        onChange={(e) => setFechaSesion(e.target.value)}
                        className="text-xs py-1 px-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Escala Interactiva ENA 0 a 10 */}
                  <div className="grid grid-cols-11 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNivelDolor(num)}
                        className={`h-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                          nivelDolor === num
                            ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400 font-black scale-105'
                            : num <= 3 
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            : num <= 6 
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  {/* Chips Rápidos: Región Anatómica */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                      Región:
                    </span>
                    {segmentosList.map((seg) => {
                      const sel = segmentosSeleccionados.includes(seg);
                      return (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => toggleSegmento(seg)}
                          className={`h-6 px-2.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            sel 
                              ? 'bg-blue-600 text-white font-semibold shadow-2xs' 
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {seg}
                        </button>
                      );
                    })}
                  </div>

                  {/* Chips Rápidos: Técnicas TMO */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                      Técnicas:
                    </span>
                    {tecnicasList.map((tec) => {
                      const sel = tecnicasSeleccionadas.includes(tec);
                      return (
                        <button
                          key={tec}
                          type="button"
                          onClick={() => toggleTecnica(tec)}
                          className={`h-6 px-2.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            sel 
                              ? 'bg-blue-600 text-white font-semibold shadow-2xs' 
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {tec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textareas S, O, A, P con Espacio Amplio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>S — Subjetivo (Relato y Síntomas)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Anamnesis actual</span>
                    </label>
                    <textarea
                      rows={5}
                      value={sSubjetivo}
                      onChange={(e) => setSSubjetivo(e.target.value)}
                      placeholder="Relato del paciente, respuesta al tratamiento previo, actividades agravantes o atenuantes..."
                      className="w-full flex-1 min-h-[120px] text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y leading-relaxed font-sans"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>O — Objetivo (Examen Físico y Palpación)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Hallazgos y ROM</span>
                    </label>
                    <textarea
                      rows={5}
                      value={oObjetivo}
                      onChange={(e) => setOObjetivo(e.target.value)}
                      placeholder="Palpación, arcos de movimiento (ROM), pruebas ortopédicas y respuesta al joint play..."
                      className="w-full flex-1 min-h-[120px] text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y leading-relaxed font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>A — Análisis (Evolución y Juicio Clínico)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Interpretación biomecánica</span>
                    </label>
                    <textarea
                      rows={4}
                      value={aAnalisis}
                      onChange={(e) => setAAnalisis(e.target.value)}
                      placeholder="Juicio funcional, avance y respuesta mecánica tras la intervención de hoy..."
                      className="w-full flex-1 min-h-[100px] text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y leading-relaxed font-sans"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>P — Plan (Próxima Sesión y Tarea en Casa)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Dosificación y control</span>
                    </label>
                    <textarea
                      rows={4}
                      value={pPlan}
                      onChange={(e) => setPPlan(e.target.value)}
                      placeholder="Pauta de ejercicios activos para el hogar, dosificación y fecha de próxima sesión..."
                      className="w-full flex-1 min-h-[100px] text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y leading-relaxed font-sans"
                    />
                  </div>
                </div>

                {/* Botón Guardar Evolución Clínicamente Visible */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando Evolución Clínica...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✓ Guardar Evolución Clínica de Hoy</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </main>

          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA 2: EVALUACIÓN INICIAL TMO (ANCHO COMPLETO ESTILO MEDILINK) */}
        {/* ================================================================== */}
        {tabActiva === 'tmo' && (
          <div className="h-full overflow-y-auto space-y-4 w-full">
            
            {/* Toolbar Superior de TMO */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Ficha de Evaluación Inicial y Reingresos TMO</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {evaluacionInicialTMO 
                    ? `Evaluación del ${evaluacionInicialTMO.fecha_evaluacion || evaluacionInicialTMO.fecha} • Klgo. ${evaluacionInicialTMO.kinesiologo || 'Ignacio Cuevas'}`
                    : 'Sin evaluación inicial registrada'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {evaluacionesTMO.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Historial:</span>
                    <select
                      value={evaluacionActivaIndex}
                      onChange={(e) => setEvaluacionActivaIndex(Number(e.target.value))}
                      className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      {evaluacionesTMO.map((ev, idx) => (
                        <option key={ev.id || idx} value={idx}>
                          {ev.fecha_evaluacion || ev.fecha} ({idx === 0 ? 'Más reciente' : `Reingreso #${evaluacionesTMO.length - idx}`})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setModoEvaluacion('nueva');
                    setAbrirEvaluacionModal(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nueva Evaluación TMO (Reingreso)</span>
                </button>

                {evaluacionInicialTMO && (
                  <button
                    type="button"
                    onClick={() => {
                      setModoEvaluacion('editar');
                      setAbrirEvaluacionModal(true);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar Evaluación Actual</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contenido de la Evaluación TMO */}
            {evaluacionInicialTMO ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                
                {/* Tarjeta 1: Anamnesis y Perfil Laboral */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>1. Anamnesis & Perfil Laboral</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Ocupación / Trabajo</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.ocupacion_laboral || 'No registrada'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Actividad Física</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.actividad_fisica || 'Sedentario / No refiere'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Cirugías / Traumatismos</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.cirugias_traumatismos || 'Sin antecedentes quirúrgicos'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Fármacos Actuales</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.farmacos_actuales || 'No registra medicación'}</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 2: Seguridad Clínica & Banderas Rojas */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>2. Seguridad Clínica & Banderas Rojas</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Aptitud Manipulación HVLA:</span>
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        evaluacionInicialTMO.apto_hvla 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {evaluacionInicialTMO.apto_hvla ? '⚡ Apto para HVLA' : '⚠️ Precaución / No Apto HVLA'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Banderas Rojas Detectadas:</span>
                      {evaluacionInicialTMO.banderas_rojas && evaluacionInicialTMO.banderas_rojas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(evaluacionInicialTMO.banderas_rojas) ? evaluacionInicialTMO.banderas_rojas : [evaluacionInicialTMO.banderas_rojas]).map((b: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                              🚩 {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-medium">✓ Sin banderas rojas reportadas</span>
                      )}
                    </div>

                    {evaluacionInicialTMO.notas_contraindicaciones && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Observaciones de Seguridad</span>
                        <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                          {evaluacionInicialTMO.notas_contraindicaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarjeta 3: Comportamiento del Dolor */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span>3. Comportamiento del Síntoma</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Mecanismo de Inicio</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.mecanismo_inicio || 'Insidioso'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tiempo de Evolución</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.tiempo_evolucion || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Dolor Inicial (Línea Base)</span>
                      <p className="font-bold text-blue-700 font-mono text-sm mt-0.5">
                        ENA {evaluacionInicialTMO.dolor_inicial_ena ?? 5}/10
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Comportamiento 24h</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.comportamiento_24h || 'No registrado'}</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 4: Examen Físico Funcional TMO */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Stethoscope className="w-4 h-4 text-purple-600" />
                    <span>4. Examen Físico Funcional TMO</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Juego Articular (Joint Play)</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.juego_articular || 'Normal Gr. 3'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Movilidad Activa / ROM</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.movilidad_activa || 'Libre / Sin déficit'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pruebas Neurodinámicas</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{evaluacionInicialTMO.neurodinamia || 'Negativas'}</p>
                    </div>
                    {evaluacionInicialTMO.hallazgos_fisicos && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Hallazgos Físicos y Palpatorios</span>
                        <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {evaluacionInicialTMO.hallazgos_fisicos}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarjeta 5: Juicio Diagnóstico & Plan Terapéutico (Full Width) */}
                <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>5. Hipótesis Diagnóstica & Plan Terapéutico</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Hipótesis Diagnóstica Kinésica</span>
                      <p className="font-bold text-slate-900 mt-1 text-sm bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                        {evaluacionInicialTMO.hipotesis_diagnostica || evaluacionInicialTMO.hipotesis_diagnostica_tmo || 'En estudio'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Objetivos Terapéuticos</span>
                      <p className="text-slate-800 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {evaluacionInicialTMO.objetivos_terapeuticos || 'Control del dolor y recuperación de la movilidad funcional.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Estimación de Alta (Sesiones)</span>
                      <p className="font-bold text-slate-900 mt-1 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {evaluacionInicialTMO.estimacion_alta || '4 a 6 sesiones'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Sin Evaluación Inicial Registrada
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Registra la anamnesis completa, examen de joint play, movilidad, y banderas rojas para calibrar la pauta terapéutica de este paciente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModoEvaluacion('nueva');
                    setAbrirEvaluacionModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Registrar Primera Evaluación Inicial TMO</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA 3: PLAN DE TRATAMIENTO Y PAGOS (FINANZAS + ACCIONES)       */}
        {/* ================================================================== */}
        {tabActiva === 'plan' && (
          <div className="h-full overflow-y-auto space-y-5 w-full">
            
            {/* Header del Plan */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Plan de Tratamiento y Estado Financiero</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control de sesiones consumidas, abonos registrados y liquidación de tratamientos.
                </p>
              </div>

              {/* Botones de Acción Financiera */}
              <div className="flex items-center gap-2 flex-wrap">
                {planActivo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAbrirPayPlanModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Registrar Pago / Cobro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAbrirManagePlanModal(true)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Ajustar / Modificar Sesiones</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAbrirCancelPlanModal(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancelar Plan Anticipadamente</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAbrirManagePlanModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Asignar / Contratar Nuevo Plan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tarjetas de Resumen Financiero y Sesiones */}
            {planActivo ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tarjeta 1: Plan Contratado */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Plan Vigente
                    </span>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {planActivo.nombre_plan || 'Plan Kinésico'}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Fecha: {planActivo.fecha_compra ? planActivo.fecha_compra.split('-').reverse().join('/') : 'Reciente'}
                    </span>
                  </div>

                  {/* Tarjeta 2: Sesiones */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sesiones
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {sesionesUsadas} / {sesionesTotales} ({pctSesiones}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pctSesiones}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 block">
                      {sesionesRestantes} sesiones disponibles
                    </span>
                  </div>

                  {/* Tarjeta 3: Monto y Cobrado */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valor Contratado / Abonos
                    </span>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      {formatCLP(totalPlanMonto)}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-700">
                      Abonado: {formatCLP(abonosMonto)}
                    </span>
                  </div>

                  {/* Tarjeta 4: Saldo Pendiente */}
                  <div className={`p-4 rounded-xl border shadow-xs space-y-1 ${
                    estaAlDia ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Saldo Adeudado
                    </span>
                    <p className={`text-sm font-black font-mono ${estaAlDia ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {estaAlDia ? '✓ Totalmente Pagado' : formatCLP(saldoPendienteMonto)}
                    </p>
                    <span className="text-[11px] text-slate-600">
                      Medio: {planActivo.medio_pago || planActivo.metodo_pago || 'No especificado'}
                    </span>
                  </div>
                </div>

                {/* Tabla de Sesiones y Asistencias */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden pb-4">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Registro de Sesiones de la Ficha ({citasHistoricas.length} citas / {historialSOAP.length} evoluciones)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Fecha</th>
                          <th className="px-4 py-2.5">Hora</th>
                          <th className="px-4 py-2.5">Tipo / Motivo</th>
                          <th className="px-4 py-2.5">Estado</th>
                          <th className="px-4 py-2.5">Profesional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {citasHistoricas.length > 0 ? (
                          citasHistoricas.map((cita) => (
                            <tr key={cita.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-slate-800">
                                {cita.fecha ? cita.fecha.split('-').reverse().join('/') : '-'}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-600">
                                {cita.hora ? cita.hora.slice(0, 5) : '-'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-800">
                                {cita.motivo_consulta || 'Sesión Kinésica TMO'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ['asistio', 'asistió', 'atendido'].includes((cita.estado || '').toLowerCase())
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : cita.estado === 'confirmada'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {cita.estado || 'Pendiente'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {cita.profesional || 'Klgo. Ignacio Cuevas'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                              No hay citas asociadas registradas aún.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Sin Plan de Tratamiento Activo
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  El paciente no posee ningún plan activo o paquete de sesiones asignado en este momento.
                </p>
                <button
                  type="button"
                  onClick={() => setAbrirManagePlanModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Asignar / Contratar Plan Ahora</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA 4: DOCUMENTOS Y CERTIFICADOS (REEMBOLSO / ALTA KINÉSICA)   */}
        {/* ================================================================== */}
        {tabActiva === 'documentos' && (
          <div className="h-full overflow-y-auto space-y-6 w-full">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-purple-600" />
                <span>Emisión de Documentos Clínicos y Certificados Oficiales</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Genera certificados profesionales con membrete del Klgo. Ignacio Cuevas Silva para reembolso en aseguradoras o informes de cierre de tratamiento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Tarjeta 1: Certificado de Reembolso Isapre */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Certificado de Reembolso Isapre / Seguro Complementario
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Certificado oficial con desglose de sesiones atendidas, RUT del paciente, código de prestación kinésica, diagnóstico y referencia a boleta médica para solicitar reembolso directo en Isapres o seguros de salud.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAbrirCertificadoModal(true)}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>📄 Emitir Certificado de Reembolso Isapre</span>
                  </button>
                </div>
              </div>

              {/* Tarjeta 2: Informe de Alta Kinésica */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Informe de Alta Kinésica y Reintegro Funcional
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Informe clínico formal de finalización del tratamiento. Detalla el dolor ENA inicial vs final, mejoría biomecánica, arcos de movimiento recuperados y recomendaciones para la prevención de recidivas.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAbrirDischargeModal(true)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-100" />
                    <span>📄 Emitir Informe de Alta Kinésica</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ==================================================================== */}
      {/* 4. MODALES INTEGRADOS                                                */}
      {/* ==================================================================== */}

      {/* Agendar Próxima Cita */}
      {abrirAgendarModal && paciente && (
        <AppointmentModal
          isOpen={abrirAgendarModal}
          preselectedPatient={{
            id: paciente.id,
            nombre_completo: paciente.nombre_completo,
            rut: paciente.rut
          }}
          onClose={() => setAbrirAgendarModal(false)}
          onSuccess={async () => {
            setAbrirAgendarModal(false);
            await cargarDatos();
            toast.success('¡Próxima cita agendada exitosamente!');
          }}
        />
      )}

      {/* Evaluación Inicial TMO */}
      {abrirEvaluacionModal && paciente && (
        <InitialEvaluationModal
          isOpen={abrirEvaluacionModal}
          paciente={paciente}
          evaluacionExistente={evaluacionInicialTMO}
          modo={modoEvaluacion}
          onClose={() => setAbrirEvaluacionModal(false)}
          onSuccess={async () => {
            setAbrirEvaluacionModal(false);
            await cargarDatos();
          }}
        />
      )}

      {/* Informe de Alta Kinésica */}
      {abrirDischargeModal && paciente && (
        <DischargeReportModal
          isOpen={abrirDischargeModal}
          patient={paciente}
          soaps={historialSOAP}
          onClose={() => setAbrirDischargeModal(false)}
        />
      )}

      {/* Certificado de Reembolso Isapre */}
      {abrirCertificadoModal && paciente && (
        <ReimbursementCertificate
          isOpen={abrirCertificadoModal}
          patient={paciente}
          evoluciones={historialSOAP}
          numeroBoleta={planActivo?.numero_boleta || null}
          onClose={() => setAbrirCertificadoModal(false)}
        />
      )}

      {/* Editar Paciente */}
      {abrirEditarPaciente && paciente && (
        <EditPatientDialog
          isOpen={abrirEditarPaciente}
          onClose={() => setAbrirEditarPaciente(false)}
          patient={paciente}
          onPatientUpdated={() => {
            cargarDatos();
          }}
          onPatientDeleted={() => {
            setAbrirEditarPaciente(false);
            onClose();
            onSuccess?.();
          }}
        />
      )}

      {/* Gestionar / Modificar Plan */}
      {abrirManagePlanModal && paciente && (
        <ManagePlanModal
          isOpen={abrirManagePlanModal}
          onClose={() => setAbrirManagePlanModal(false)}
          paciente={paciente}
          planActual={planActivo}
          onSuccess={async () => {
            await cargarDatos();
            onSuccess?.();
          }}
        />
      )}

      {/* Registrar Pago / Cobro del Plan */}
      {abrirPayPlanModal && planActivo && (
        <PayPlanModal
          isOpen={abrirPayPlanModal}
          onClose={() => setAbrirPayPlanModal(false)}
          plan={planActivo}
          patientName={paciente?.nombre_completo}
          onSuccess={async () => {
            setAbrirPayPlanModal(false);
            await cargarDatos();
            onSuccess?.();
          }}
        />
      )}

      {/* Cancelar Plan Anticipadamente */}
      {abrirCancelPlanModal && planActivo && (
        <CancelPlanModal
          isOpen={abrirCancelPlanModal}
          plan={planActivo}
          patientName={paciente?.nombre_completo}
          onClose={() => setAbrirCancelPlanModal(false)}
          onSuccess={async () => {
            setAbrirCancelPlanModal(false);
            await cargarDatos();
            onSuccess?.();
          }}
        />
      )}

      {/* Diálogo de Edición Rápida de Nota SOAP */}
      {notaEditando && (
        <Dialog open={!!notaEditando} onOpenChange={(open) => !open && setNotaEditando(null)}>
          <DialogHeader>
            <DialogTitle>Editar Evolución Clínica & Fecha</DialogTitle>
            <DialogDescription>
              Modifica la fecha de atención, nivel de dolor ENA o las notas SOAP de esta sesión.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGuardarEdicionNota} className="space-y-4 pt-2">
            <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    📅 Fecha de la Sesión
                  </label>
                  <input
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    required
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Nivel de Dolor ENA (0 a 10): <span className="font-extrabold text-blue-600 font-mono text-sm">{editEna}/10</span>
                  </label>
                  <div className="flex items-center gap-1 pt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setEditEna(num)}
                        className={`flex-1 h-7 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          editEna === num 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">S — Subjetivo (Relato)</label>
                  <textarea
                    rows={2}
                    value={editS}
                    onChange={(e) => setEditS(e.target.value)}
                    placeholder="Relato del paciente..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">O — Objetivo (Examen Físico)</label>
                  <textarea
                    rows={2}
                    value={editO}
                    onChange={(e) => setEditO(e.target.value)}
                    placeholder="Examen físico, arcos, pruebas..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">A — Análisis (Evolución Kinésica)</label>
                  <textarea
                    rows={2}
                    value={editA}
                    onChange={(e) => setEditA(e.target.value)}
                    placeholder="Juicio funcional..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">P — Plan (Pauta y Próxima Sesión)</label>
                  <textarea
                    rows={2}
                    value={editP}
                    onChange={(e) => setEditP(e.target.value)}
                    placeholder="Pauta de ejercicios, dosificación..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNotaEditando(null)}
                disabled={savingNotaEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingNotaEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {savingNotaEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

    </div>,
    document.body
  );
}

export default ClinicalRecordView;
