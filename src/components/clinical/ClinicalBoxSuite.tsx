'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface ClinicalBoxSuiteProps {
  pacienteId: string;
  citaId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Formulario SOAP de hoy
  const [nivelDolor, setNivelDolor] = useState<number>(0);
  const [segmentosSeleccionados, setSegmentosSeleccionados] = useState<string[]>([]);
  const [tecnicasSeleccionadas, setTecnicasSeleccionadas] = useState<string[]>([]);
  const [sSubjetivo, setSSubjetivo] = useState('');
  const [oObjetivo, setOObjetivo] = useState('');
  const [aAnalisis, setAAnalisis] = useState('');
  const [pPlan, setPPlan] = useState('');
  const [pronostico, setPronostico] = useState('4 a 6 sesiones');

  // Control de acordeón en timeline histórico
  const [notaExpandidaId, setNotaExpandidaId] = useState<string | null>(null);

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

    } catch (err) {
      console.error('Error cargando datos en suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [pacienteId]);

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
        fecha: new Date().toISOString().split('T')[0],
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
        
        {/* ==================================================================== */}
        {/* CABECERA SUPERIOR FIJA */}
        {/* ==================================================================== */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                {paciente?.nombre_completo || 'Cargando paciente...'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                RUT: {paciente?.rut || 'Sin RUT'}
              </p>
            </div>

            {/* Badges de Plan y Pago */}
            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {planActivo?.nombre_plan ? `${planActivo.nombre_plan} • ${planActivo.sesiones_usadas}/${planActivo.sesiones_totales} ses.` : 'Sin plan activo'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                planActivo?.estado_pago === 'pagado' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {planActivo?.estado_pago === 'pagado' ? '✓ Plan Pagado' : '🔴 Cobro Pendiente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ✕ Volver a la Agenda
            </button>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* CUERPO DE 3 COLUMNAS CON SCROLL INDEPENDIENTE */}
        {/* ==================================================================== */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
          
          {/* ------------------------------------------------------------------ */}
          {/* COLUMNA 1 (IZQUIERDA - 3 cols): CONTEXTO Y ANTECEDENTES */}
          {/* ------------------------------------------------------------------ */}
          <aside className="md:col-span-3 h-full overflow-y-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contexto del Paciente</h3>

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

            {/* Banderas Rojas / Alertas TMO */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-rose-600 uppercase flex items-center gap-1">
                <span>🚩</span> Banderas Rojas & Seguridad TMO
              </span>
              <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-xl text-xs text-rose-900 leading-relaxed">
                {paciente?.alertas_seguridad || paciente?.antecedentes_morbidos || 'Sin contraindicaciones médicas registradas para manipulación o carga.'}
              </div>
            </div>

            {/* Motivo de Consulta Inicial */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Motivo Inicial</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                "{paciente?.motivo_consulta || 'Evaluación Kinésica Inicial'}"
              </p>
            </div>
          </aside>

          {/* ------------------------------------------------------------------ */}
          {/* COLUMNA 2 (CENTRO - 6 cols): ESPACIO DE ATENCIÓN ACTIVA SOAP */}
          {/* ------------------------------------------------------------------ */}
          <main className="md:col-span-6 h-full overflow-y-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={handleGuardarSOAP} className="space-y-6 pb-6">
              
              {/* Encabezado del Formulario */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-lg">📝</span>
                  <h3 className="font-bold text-slate-900 text-sm">Registro de Evolución Clínica (SOAP)</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Sesión de Hoy
                </span>
              </div>

              {/* Curva / Estado de Dolor ENA */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Curva de Dolor ENA (Histórica)
                </span>
                {historialSOAP.length > 1 ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <span>S1: {historialSOAP[historialSOAP.length - 1].nivel_dolor_ena}/10</span>
                    <span className="text-slate-400">➔</span>
                    <span>S{historialSOAP.length}: {historialSOAP[0].nivel_dolor_ena}/10</span>
                    <span className="ml-auto text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      📉 Progreso en evolución
                    </span>
                  </div>
                ) : historialSOAP.length === 1 ? (
                  <p className="text-xs text-slate-600">
                    Línea de base inicial: <span className="font-bold text-slate-900">ENA {historialSOAP[0].nivel_dolor_ena}/10</span> (Registrada el {historialSOAP[0].fecha}).
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Primera sesión (Se fijará la línea de base hoy).</p>
                )}
              </div>

              {/* Selector de Dolor ENA Hoy (0 al 10) */}
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
                      className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        nivelDolor === num
                          ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-400'
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
          <aside className="md:col-span-3 h-full overflow-y-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
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
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{nota.fecha}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          (nota.nivel_dolor_ena || 0) <= 3 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          ENA {nota.nivel_dolor_ena ?? 0}/10
                        </span>
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
    </div>
  );
}
