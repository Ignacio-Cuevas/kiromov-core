'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { getChileanDate } from '@/lib/utils';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { InitialEvaluationModal } from '@/components/clinical/InitialEvaluationModal';
import { DischargeReportModal } from '@/components/clinical/DischargeReportModal';
import { ReimbursementCertificate } from '@/components/clinical/ReimbursementCertificate';
import { FileText, Printer } from 'lucide-react';
import { EditPatientDialog } from '@/components/patients/EditPatientDialog';
import { ManagePlanModal } from '@/components/patients/ManagePlanModal';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClinicalBoxSuiteProps {
  pacienteId: string;
  citaId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const calcularPronosticoAltaClinica = (historialSOAP: any[]) => {
  // CASO A: Solo 1 sesión registrada (Modo Calibración)
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
  // Ordenar cronológicamente (S1 más antigua -> Sn más reciente)
  const notas = [...historialSOAP].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const s1 = notas[0];
  const sn = notas[notas.length - 1];

  const dolorInicial = Number(s1.nivel_dolor_ena) || 7;
  const dolorActual = Number(sn.nivel_dolor_ena) || 0;
  const totalSesiones = notas.length;

  // Gradiente de recuperación del dolor
  const deltaDolor = dolorInicial - dolorActual;
  const pctMejoria = dolorInicial > 0 ? Math.round((deltaDolor / dolorInicial) * 100) : 0;

  // Criterios predictivos según respuesta tisular y sesiones realizadas:
  let faltanAprox = 3;
  let clasificacion = 'Favorable';
  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

  if (dolorActual <= 1) {
    // Dolor en meta de alta
    faltanAprox = 0;
    clasificacion = 'Meta alcanzada';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (pctMejoria >= 50 || dolorActual <= 3) {
    // Buena respuesta analgésica y mecánica
    faltanAprox = Math.max(1, 4 - totalSesiones);
    clasificacion = `Respuesta rápida (${pctMejoria}% de alivio)`;
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (pctMejoria >= 20) {
    // Evolución estándar TMO
    faltanAprox = Math.max(2, 6 - totalSesiones);
    clasificacion = `Respuesta favorable (${pctMejoria}% de alivio)`;
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
  } else {
    // Respuesta lenta o dolor irritable persistente
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

export default function ClinicalBoxSuite({
  pacienteId,
  citaId,
  onClose,
  onSuccess
}: ClinicalBoxSuiteProps) {
  const supabase = createClient();

  // Estados de datos
  const [paciente, setPaciente] = useState<any>(null);
  const [planActivo, setPlanActivo] = useState<any>(null);
  const [historialSOAP, setHistorialSOAP] = useState<any[]>([]);
  const [proximaCita, setProximaCita] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abrirAgendarModal, setAbrirAgendarModal] = useState(false);
  const [abrirEvaluacionModal, setAbrirEvaluacionModal] = useState(false);
  const [abrirEditarPaciente, setAbrirEditarPaciente] = useState(false);
  const [abrirDischargeModal, setAbrirDischargeModal] = useState(false);
  const [abrirCertificadoModal, setAbrirCertificadoModal] = useState(false);
  const [abrirManagePlanModal, setAbrirManagePlanModal] = useState(false);
  const [tabActiva, setTabActiva] = useState<'contexto' | 'soap' | 'historial'>('soap');
  const [evaluacionesTMO, setEvaluacionesTMO] = useState<any[]>([]);
  const [evaluacionActivaIndex, setEvaluacionActivaIndex] = useState<number>(0);
  const [modoEvaluacion, setModoEvaluacion] = useState<'nueva' | 'editar'>('editar');
  const [evaluacionInicialTMO, setEvaluacionInicialTMO] = useState<any>(null);

  // Formulario SOAP
  const [fechaSesion, setFechaSesion] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
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

  // Orden cronológico estricto: S1 (antigua) -> Sn (reciente)
  const notasCronologicas = useMemo(() => {
    return [...historialSOAP].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [historialSOAP]);

  const dolorInicial = notasCronologicas[0]?.nivel_dolor_ena ?? 0;
  const dolorActual = notasCronologicas[notasCronologicas.length - 1]?.nivel_dolor_ena ?? 0;

  // Solo calcular porcentaje si el dolor inicial fue mayor a 0
  const pctMejoria = dolorInicial > 0 
    ? Math.round(((dolorInicial - dolorActual) / dolorInicial) * 100) 
    : 0;

  // 1. Carga de datos de Supabase
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
      console.error('Error cargando datos en suite:', err);
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

  // Manejador de toggles para chips
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

  // Guardar SOAP de hoy
  const handleGuardarSOAP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);

    try {
      const payload = {
        paciente_id: pacienteId,
        fecha: fechaSesion, // Utiliza la fecha elegida (sea de hoy o del pasado)
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

      toast.success('¡Evolución clínica guardada exitosamente!');
      
      // Limpiar formulario y recargar historial
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

      toast.success('Nota clínica y fecha actualizadas');
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta evolución clínica del historial? Esta acción no se puede deshacer.')) {
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="w-full max-w-[96vw] h-[94vh] bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
        
        {/* CABECERA SUPERIOR RESPONSIVA */}
        <header className="min-h-16 flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                {paciente?.nombre_completo || 'Cargando paciente...'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                RUT: {paciente?.rut || 'Sin RUT'}
              </p>
            </div>

            {/* Badges de Plan y Pago + Botón Ajustar Plan */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setAbrirManagePlanModal(true)}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                title="Hacer clic para editar plan del paciente"
              >
                <span>{planActivo?.nombre_plan ? `${planActivo.nombre_plan} • ${planActivo.sesiones_usadas}/${planActivo.sesiones_totales} ses.` : 'Sin plan activo'}</span>
              </button>
              <span className={`hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                planActivo?.estado_pago === 'pagado' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {planActivo?.estado_pago === 'pagado' ? '✓ Plan Pagado' : '🔴 Cobro Pendiente'}
              </span>
              <button
                type="button"
                onClick={() => setAbrirManagePlanModal(true)}
                className="min-h-[44px] sm:min-h-0 px-2.5 py-1.5 sm:py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                title="Ajustar sesiones o estado del plan"
              >
                <span>⚙️ Ajustar Plan</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAbrirCertificadoModal(true)}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Emitir certificado médico para reembolso"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Certificado Reembolso</span>
              <span className="sm:hidden">Certificado</span>
            </button>

            <button
              type="button"
              onClick={() => setAbrirDischargeModal(true)}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Generar informe oficial de alta médica y reintegro funcional"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">📄 Informe de Alta</span>
              <span className="sm:hidden">📄 Alta</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="hidden sm:inline">✕ Volver a la Agenda</span>
              <span className="sm:hidden">✕ Salir</span>
            </button>
          </div>
        </header>

        {/* SELECTOR DE PESTAÑAS MÓVIL Y TABLET (< 1024px) */}
        <div className="lg:hidden flex items-center bg-slate-200/80 border-b border-slate-200 p-1.5 gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTabActiva('contexto')}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tabActiva === 'contexto'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤 Contexto</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('soap')}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tabActiva === 'soap'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📝 Atención Hoy (SOAP)</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('historial')}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tabActiva === 'historial'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⏱️ Historial</span>
            {historialSOAP.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-bold ml-1">
                {historialSOAP.length}
              </span>
            )}
          </button>
        </div>

        {/* ==================================================================== */}
        {/* CUERPO: 3 COLUMNAS INDEPENDIENTES EN DESKTOP / PESTAÑAS EN MÓVIL    */}
        {/* ==================================================================== */}
        <div className="flex-1 min-h-0 lg:grid lg:grid-cols-12 gap-4 p-3 sm:p-4 overflow-hidden">
          
          {/* ------------------------------------------------------------------ */}
          {/* COLUMNA 1: CONTEXTO Y ANTECEDENTES                                 */}
          {/* ------------------------------------------------------------------ */}
          <aside className={`${tabActiva === 'contexto' ? 'flex' : 'hidden'} lg:flex lg:col-span-3 h-full overflow-y-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex-col space-y-5`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contexto del Paciente</h3>

            {/* Próxima Cita */}
            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                📅 Próxima Sesión Programada
              </span>
              {proximaCita ? (
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {proximaCita.fecha.split('-').reverse().join('/')} a las {proximaCita.hora?.slice(0, 5)} hrs
                  </p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                    proximaCita.estado === 'confirmada' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {proximaCita.estado === 'confirmada' ? '✓ Confirmada' : '⏳ Pendiente'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                  ⚠️ Sin próxima cita agendada
                </p>
              )}
              <button
                type="button"
                onClick={() => setAbrirAgendarModal(true)}
                className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                📅 Agendar Siguiente Cita
              </button>
            </div>

            {/* Teléfono y WhatsApp */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Teléfono / Contacto</span>
              {paciente?.telefono ? (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">{paciente.telefono}</span>
                  <a
                    href={`https://wa.me/56${paciente.telefono.replace(/\D/g, '').slice(-9)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-lg border border-emerald-200 transition-colors"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sin registro</p>
              )}
            </div>

            {/* Previsión */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Previsión de Salud</span>
              <p className="text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                {paciente?.prevision || 'Particular'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAbrirEditarPaciente(true)}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              ✏️ Editar Datos / RUT
            </button>

            {/* Evaluación Inicial TMO */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="space-y-2">
                {/* Botón para registrar un Reingreso con nuevo diagnóstico */}
                <button
                  type="button"
                  onClick={() => {
                    setModoEvaluacion('nueva');
                    setAbrirEvaluacionModal(true);
                  }}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  + Nueva Evaluación TMO (Reingreso)
                </button>

                {/* Si el paciente tiene más de 1 evaluación histórica, permitir alternar */}
                {evaluacionesTMO.length > 1 && (
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Historial de Evaluaciones ({evaluacionesTMO.length})
                    </label>
                    <select
                      value={evaluacionActivaIndex}
                      onChange={(e) => setEvaluacionActivaIndex(Number(e.target.value))}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800"
                    >
                      {evaluacionesTMO.map((ev, idx) => (
                        <option key={ev.id || idx} value={idx}>
                          {ev.fecha_evaluacion || ev.fecha} — {ev.hipotesis_diagnostica?.slice(0, 30) || ev.hipotesis_diagnostica_tmo?.slice(0, 30) || 'Evaluación'}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Botón para ver/editar la evaluación seleccionada */}
                {evaluacionesTMO.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setModoEvaluacion('editar');
                      setAbrirEvaluacionModal(true);
                    }}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  >
                    👁️ Ver / Editar Evaluación ({evaluacionesTMO[evaluacionActivaIndex]?.fecha_evaluacion || 'Activa'})
                  </button>
                )}
              </div>

              {evaluacionInicialTMO && (
                <div className="space-y-2 text-xs pt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">💼 Ocupación</span>
                    <span className="text-slate-800 font-medium">{evaluacionInicialTMO.ocupacion_laboral || 'No registrada'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">🏥 Cirugías / Antecedentes</span>
                    <span className="text-slate-800 font-medium">{evaluacionInicialTMO.cirugias_traumatismos || 'Sin cirugías'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">💊 Fármacos</span>
                    <span className="text-slate-800 font-medium">{evaluacionInicialTMO.farmacos_actuales || 'No registra'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">🚩 Seguridad TMO</span>
                    <span className={`inline-block w-max px-2 py-0.5 rounded font-bold text-[10px] ${evaluacionInicialTMO.apto_hvla ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {evaluacionInicialTMO.apto_hvla ? '⚡ Apto Manipulación HVLA' : '⚠️ Precaución HVLA'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">🎯 Diagnóstico Funcional</span>
                    <span className="text-slate-800 font-medium">{evaluacionInicialTMO.hipotesis_diagnostica || evaluacionInicialTMO.hipotesis_diagnostica_tmo || 'Pendiente'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Estimación de Alta Funcional (Algoritmo Predictivo Clínico) */}
            {(() => {
              const estimacion = calcularPronosticoAltaClinica(historialSOAP);

              return (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      🎯 Estimación de Alta Funcional
                    </span>
                    <span className="font-mono font-bold text-slate-700 text-[11px]">
                      {estimacion.porcentaje}%
                    </span>
                  </div>

                  {/* Barra de Progreso Visual */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        estimacion.metaAlcanzada ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${estimacion.porcentaje}%` }}
                    />
                  </div>

                  {/* Detalle Clínico Predictivo */}
                  <div className="pt-1 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">
                      {estimacion.titulo}
                    </p>

                    {estimacion.fase === 'calibracion' ? (
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        {estimacion.mensaje}
                      </p>
                    ) : (
                      <>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${estimacion.badgeColor}`}>
                          {estimacion.clasificacion}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {estimacion.mensaje}
                        </p>
                      </>
                    )}
                  </div>

                  {planActivo && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500 font-medium">
                      {Math.max(0, (planActivo.sesiones_totales || 0) - (planActivo.sesiones_usadas || 0))} sesiones disponibles en plan actual
                    </div>
                  )}
                </div>
              );
            })()}
          </aside>

          {/* ------------------------------------------------------------------ */}
          {/* COLUMNA 2 (CENTRO - 6 cols): ESPACIO DE ATENCIÓN ACTIVA SOAP       */}
          {/* ------------------------------------------------------------------ */}
          <main className={`${tabActiva === 'soap' ? 'block' : 'hidden'} lg:block lg:col-span-6 h-full overflow-y-auto bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm`}>
            <form onSubmit={handleGuardarSOAP} className="space-y-6 pb-6">
              
              {/* Encabezado del Formulario */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-lg">📝</span>
                  <h3 className="font-bold text-slate-900 text-sm">Registro de Evolución Clínica (SOAP)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Fecha Sesión:</label>
                  <input
                    type="date"
                    value={fechaSesion}
                    onChange={(e) => setFechaSesion(e.target.value)}
                    className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Componente Visual de Gráfica ENA */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Evolución del Dolor (Escala ENA 0 - 10)
                  </span>
                  {notasCronologicas.length > 1 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      pctMejoria >= 0 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}>
                      {pctMejoria >= 0 ? `${pctMejoria}% de mejoría` : `${Math.abs(pctMejoria)}% aumento de dolor`}
                    </span>
                  )}
                </div>

                {/* Gráfico de Barras y Puntos */}
                {notasCronologicas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    Primera sesión. El gráfico comenzará a trazarse al guardar la primera nota de hoy.
                  </p>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="h-28 flex items-end justify-between gap-2 px-2 border-b border-slate-200 pb-1">
                      {notasCronologicas.map((nota, idx) => {
                        const ena = Number(nota.nivel_dolor_ena) || 0;
                        const alturaPct = Math.max(10, (ena / 10) * 100);
                        const colorBarra = ena <= 3 ? 'bg-emerald-500' : ena <= 6 ? 'bg-amber-500' : 'bg-rose-500';

                        return (
                          <div key={nota.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                            {/* Valor ENA arriba del punto */}
                            <span className="text-[10px] font-bold text-slate-700 font-mono">
                              {ena}
                            </span>
                            {/* Barra visual con punto superior */}
                            <div className="w-full max-w-[28px] bg-slate-200 rounded-t-lg overflow-hidden flex items-end h-20">
                              <div 
                                className={`w-full ${colorBarra} rounded-t-lg transition-all duration-500`}
                                style={{ height: `${alturaPct}%` }}
                              />
                            </div>
                            {/* Etiqueta de la Sesión */}
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[40px]">
                              S{idx + 1}
                            </span>
                            {/* Tooltip con fecha al pasar el mouse */}
                            <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                              {nota.fecha} • ENA {ena}/10
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                      <span>0: Sin dolor</span>
                      <span>5: Dolor moderado</span>
                      <span>10: Máximo dolor</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Dolor ENA Hoy (0 al 10 - Táctil iOS 44px en móviles) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nivel de Dolor Hoy (Escala ENA 0 - 10)
                </label>
                <div className="grid grid-cols-11 gap-1">
                  {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNivelDolor(num)}
                      className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                        nivelDolor === num
                          ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-400 font-black'
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
              </div>

              {/* Chips de Segmentos Tratados */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Segmentos Anatómicos Abordados
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {segmentosList.map((seg) => {
                    const sel = segmentosSeleccionados.includes(seg);
                    return (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => toggleSegmento(seg)}
                        className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                          sel 
                            ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {seg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chips de Técnicas TMO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Técnicas e Intervenciones Aplicadas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tecnicasList.map((tec) => {
                    const sel = tecnicasSeleccionadas.includes(tec);
                    return (
                      <button
                        key={tec}
                        type="button"
                        onClick={() => toggleTecnica(tec)}
                        className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                          sel 
                            ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {tec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textareas S y O */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">S — Subjetivo (Relato)</label>
                  <textarea
                    rows={3}
                    value={sSubjetivo}
                    onChange={(e) => setSSubjetivo(e.target.value)}
                    placeholder="¿Cómo se siente hoy el paciente? Respuesta al tratamiento previo..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">O — Objetivo (Examen Físico)</label>
                  <textarea
                    rows={3}
                    value={oObjetivo}
                    onChange={(e) => setOObjetivo(e.target.value)}
                    placeholder="Hallazgos palpatorios, arcos de movimiento (ROM), pruebas ortopédicas..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Textareas A y P */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">A — Análisis (Evolución Kinésica)</label>
                  <textarea
                    rows={3}
                    value={aAnalisis}
                    onChange={(e) => setAAnalisis(e.target.value)}
                    placeholder="Juicio funcional, avance respecto a objetivos biomecánicos..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">P — Plan (Próxima Sesión y Tarea)</label>
                  <textarea
                    rows={3}
                    value={pPlan}
                    onChange={(e) => setPPlan(e.target.value)}
                    placeholder="Pauta de ejercicios para casa, dosificación y fecha de próximo control..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando Evolución en Ficha...
                    </>
                  ) : (
                    '✓ Guardar Evolución Clínica de Hoy'
                  )}
                </button>
              </div>

            </form>
          </main>

          {/* ------------------------------------------------------------------ */}
          {/* COLUMNA 3 (DERECHA - 3 cols): HISTORIAL INTERACTIVO CON DESPLIEGUE */}
          {/* ------------------------------------------------------------------ */}
          <aside className={`${tabActiva === 'historial' ? 'block' : 'hidden'} lg:block lg:col-span-3 h-full overflow-y-auto bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Timeline Histórico</h3>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                {historialSOAP.length} reg.
              </span>
            </div>

            {historialSOAP.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Sin notas clínicas previas.</p>
            ) : (
              <div className="space-y-3">
                {historialSOAP.map((nota) => {
                  const expandida = notaExpandidaId === nota.id;
                  return (
                    <div
                      key={nota.id}
                      className="border border-slate-200 rounded-xl p-3 text-xs space-y-2 hover:border-slate-300 transition-colors bg-slate-50/40"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 font-mono text-xs">{nota.fecha}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          (nota.nivel_dolor_ena || 0) <= 3 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : (nota.nivel_dolor_ena || 0) <= 6
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          ENA {nota.nivel_dolor_ena ?? 0}/10
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIniciarEdicionNota(nota)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded ml-auto cursor-pointer text-xs hover:bg-blue-50 transition-colors"
                          title="Editar fecha o nota"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarNota(nota.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer text-xs hover:bg-rose-50 transition-colors"
                          title="Eliminar nota duplicada"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Resumen o Despliegue Completo */}
                      {expandida ? (
                        <div className="space-y-2 pt-2 border-t border-slate-200 text-slate-700">
                          {nota.s_subjetivo && <p><strong>S:</strong> {nota.s_subjetivo}</p>}
                          {nota.o_objetivo && <p><strong>O:</strong> {nota.o_objetivo}</p>}
                          {nota.a_analisis && <p><strong>A:</strong> {nota.a_analisis}</p>}
                          {nota.p_plan && <p><strong>P:</strong> {nota.p_plan}</p>}
                          <button
                            type="button"
                            onClick={() => setNotaExpandidaId(null)}
                            className="text-blue-600 hover:underline font-semibold text-[11px] block mt-1"
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
                })}
              </div>
            )}
          </aside>

        </div>

      </div>

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
            toast.success('¡Próxima cita agendada y actualizada en la ficha!');
          }}
        />
      )}

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

      {abrirDischargeModal && paciente && (
        <DischargeReportModal
          isOpen={abrirDischargeModal}
          patient={paciente}
          soaps={historialSOAP}
          onClose={() => setAbrirDischargeModal(false)}
        />
      )}

      {abrirCertificadoModal && paciente && (
        <ReimbursementCertificate
          isOpen={abrirCertificadoModal}
          patient={paciente}
          evoluciones={historialSOAP}
          numeroBoleta={planActivo?.numero_boleta || null}
          onClose={() => setAbrirCertificadoModal(false)}
        />
      )}

      {abrirEditarPaciente && paciente && (
        <EditPatientDialog
          isOpen={abrirEditarPaciente}
          onClose={() => setAbrirEditarPaciente(false)}
          patient={paciente}
          onPatientUpdated={(updated) => {
            cargarDatos();
          }}
        />
      )}

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

      {/* Modal Ligero de Edición de Nota Clínica SOAP */}
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
                    {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
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
    </div>
  );
}
