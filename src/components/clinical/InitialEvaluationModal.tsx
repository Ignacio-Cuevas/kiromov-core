'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  X,
  ShieldAlert,
  Stethoscope,
  Info,
  ChevronRight,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TMO_SEGMENTS,
  TMOTestResult,
  evaluarReglasInferencia,
  getSeverityBadgeStyle,
  ActiveInferenceRule
} from '@/lib/clinical-tmo';

interface InitialEvaluationModalProps {
  isOpen: boolean;
  paciente: any;
  evaluacionExistente?: any | null;
  modo?: 'nueva' | 'editar';
  onClose: () => void;
  onSuccess: (form: any) => void;
}

export function InitialEvaluationModal({
  isOpen,
  paciente,
  evaluacionExistente,
  modo = 'nueva',
  onClose,
  onSuccess
}: InitialEvaluationModalProps) {
  const [tab, setTab] = useState<'anamnesis' | 'sintoma' | 'examen' | 'diagnostico'>('anamnesis');
  const [loadingAI, setLoadingAI] = useState(false);
  const [segmentoActivo, setSegmentoActivo] = useState<string>('cervical_dorsal');

  // Inicializar pruebas estructuradas desde evaluacionExistente (JSONB o memoria)
  const [pruebasEstructuradas, setPruebasEstructuradas] = useState<
    Record<string, { result: TMOTestResult; note: string }>
  >(() => {
    return evaluacionExistente?.datos_segmento?.pruebas_estructuradas || {};
  });

  const [form, setForm] = useState({
    // Anamnesis remota y laboral
    ocupacion_laboral: evaluacionExistente?.ocupacion_laboral ?? paciente?.ocupacion ?? '',
    puesto_trabajo_ergonomia: evaluacionExistente?.puesto_trabajo_ergonomia ?? '',
    habitos_actividad_fisica: evaluacionExistente?.habitos_actividad_fisica ?? '',
    cirugias_traumatismos: evaluacionExistente?.cirugias_traumatismos ?? '',
    farmacos_actuales: evaluacionExistente?.farmacos_actuales ?? '',
    banderas_rojas_alerta: evaluacionExistente?.banderas_rojas_alerta ?? '',
    apto_hvla: evaluacionExistente?.apto_hvla ?? true,

    // Síntoma
    motivo_consulta: evaluacionExistente?.motivo_consulta ?? paciente?.motivo_consulta ?? '',
    inicio_sintoma_cronologia: evaluacionExistente?.inicio_sintoma_cronologia ?? '',
    tiempo_evolucion: evaluacionExistente?.tiempo_evolucion ?? 'Subagudo 6-12 sem',
    comportamiento_24h: evaluacionExistente?.comportamiento_24h ?? '',
    factores_agravantes_aliviantes: evaluacionExistente?.factores_agravantes_aliviantes ?? '',
    irritabilidad_tisular: evaluacionExistente?.irritabilidad_tisular ?? 'Moderada',
    dolor_inicial_ena: evaluacionExistente?.dolor_inicial_ena ?? 5,

    // Examen Físico
    inspeccion_postura: evaluacionExistente?.inspeccion_postura ?? '',
    movilidad_activa_rom: evaluacionExistente?.movilidad_activa_rom ?? '',
    juego_articular_joint_play: evaluacionExistente?.juego_articular_joint_play ?? 'Normal',
    neurodinamia_basal: evaluacionExistente?.neurodinamia_basal ?? '',
    pruebas_especiales_ortopedicas: evaluacionExistente?.pruebas_especiales_ortopedicas ?? '',
    pruebas_funcionales_control_motor: evaluacionExistente?.pruebas_funcionales_control_motor ?? '',
    hallazgos_relevantes: evaluacionExistente?.hallazgos_relevantes ?? '',

    // Razonamiento Clínico Biomecánico y Diagnósticos Internacionales
    razonamiento_clinico:
      evaluacionExistente?.razonamiento_clinico ??
      evaluacionExistente?.datos_segmento?.razonamiento_clinico ??
      '',
    cie10_codigo: evaluacionExistente?.cie10_codigo ?? '',
    cie10_glosa: evaluacionExistente?.cie10_glosa ?? '',
    cie11_codigo: evaluacionExistente?.cie11_codigo ?? '',
    cie11_glosa: evaluacionExistente?.cie11_glosa ?? '',
    diagnostico_cif: evaluacionExistente?.diagnostico_cif ?? '',
    diagnostico_apta: evaluacionExistente?.diagnostico_apta ?? '',
    diagnostico_tmo_biomecanico:
      evaluacionExistente?.diagnostico_tmo_biomecanico ??
      (typeof evaluacionExistente?.diagnostico_tmo === 'string' ? evaluacionExistente?.diagnostico_tmo : ''),
    objetivos_terapeuticos: evaluacionExistente?.objetivos_terapeuticos ?? '',
    pronostico_sesiones: evaluacionExistente?.pronostico_sesiones ?? 'Plan Pro Care (6 sesiones)',
  });

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestChange = (testId: string, result: TMOTestResult, note: string = '') => {
    setPruebasEstructuradas((prev) => {
      const existingNote = note !== undefined ? note : prev[testId]?.note || '';
      const updated = {
        ...prev,
        [testId]: { result, note: existingNote }
      };
      return updated;
    });
  };

  // Reglas activas para el segmento actualmente seleccionado
  const reglasActivasSegmento = useMemo(() => {
    return evaluarReglasInferencia(pruebasEstructuradas, segmentoActivo);
  }, [pruebasEstructuradas, segmentoActivo]);

  // Reglas activas globales en toda la evaluación
  const reglasActivasGlobales = useMemo(() => {
    return evaluarReglasInferencia(pruebasEstructuradas);
  }, [pruebasEstructuradas]);

  // Texto legible concatenado de las pruebas realizadas
  const getPruebasConcatenadas = () => {
    const lines: string[] = [];
    for (const [segKey, segDef] of Object.entries(TMO_SEGMENTS)) {
      const segTests = segDef.tests
        .map((t) => {
          const res = pruebasEstructuradas[t.id];
          if (res && res.result !== 'NE') {
            return `${t.name}: [${res.result}]${res.note ? ` (${res.note})` : ''}`;
          }
          return null;
        })
        .filter(Boolean);

      if (segTests.length > 0) {
        lines.push(`${segDef.label}: ${segTests.join(', ')}`);
      }
    }

    let combined = form.pruebas_especiales_ortopedicas;
    if (lines.length > 0) {
      combined = lines.join('\n') + (combined ? '\nOtras pruebas libres: ' + combined : '');
    }
    return combined;
  };

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const clustersDetectadosTexto = reglasActivasGlobales
        .map((r) => `${r.badge} [${r.evidence}]`)
        .join('; ');

      const payload = {
        ...form,
        pruebas_especiales_ortopedicas: getPruebasConcatenadas(),
        clusters_detectados: clustersDetectadosTexto || undefined,
        edad: paciente?.edad || (paciente?.fecha_nacimiento ? calcularEdad(paciente?.fecha_nacimiento) : undefined),
        sexo: paciente?.sexo,
        nombre_completo: paciente?.nombre_completo,
      };

      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || 'Error al generar razonamiento y diagnóstico');
        return;
      }

      setForm((prev) => ({
        ...prev,
        razonamiento_clinico: data.razonamiento_clinico || prev.razonamiento_clinico,
        cie10_codigo: data.cie10_codigo || prev.cie10_codigo,
        cie10_glosa: data.cie10_glosa || prev.cie10_glosa,
        cie11_codigo: data.cie11_codigo || prev.cie11_codigo,
        cie11_glosa: data.cie11_glosa || prev.cie11_glosa,
        diagnostico_cif: data.diagnostico_cif || prev.diagnostico_cif,
        diagnostico_apta: data.diagnostico_apta || prev.diagnostico_apta,
        diagnostico_tmo_biomecanico: data.diagnostico_tmo_biomecanico || prev.diagnostico_tmo_biomecanico,
        objetivos_terapeuticos: data.objetivos_terapeuticos || prev.objetivos_terapeuticos,
        pronostico_sesiones: data.pronostico_sesiones || prev.pronostico_sesiones,
      }));

      setTab('diagnostico');
      toast.success('Razonamiento biomecánico y codificación completados con éxito.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error de red al consultar el asistente IA.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSave = () => {
    const clustersDetectadosTexto = reglasActivasGlobales
      .map((r) => `${r.badge} (${r.evidence})`)
      .join('; ');

    const finalForm = {
      ...form,
      pruebas_especiales_ortopedicas: getPruebasConcatenadas(),
      pruebas_estructuradas: pruebasEstructuradas,
      segmentoActivo,
      clusters_detectados: clustersDetectadosTexto,
    };

    onSuccess(finalForm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* 1. Sticky Header Clínico */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Evaluación Inicial TMO & Diagnóstico Biomecánico</h2>
              <p className="text-xs text-slate-300">
                Paciente: <span className="font-semibold text-emerald-400">{paciente?.nombre_completo}</span> • RUT: {paciente?.rut || 'Sin RUT'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Barra de Pestañas con Indicador de Estado */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 shrink-0">
          {[
            { id: 'anamnesis', label: '1. Antecedentes & Trabajo', icon: '📋' },
            { id: 'sintoma', label: '2. Síntoma & Cronología', icon: '⏱️' },
            {
              id: 'examen',
              label: '3. Examen Físico (Orto & TMO)',
              icon: '🦴',
              badge: reglasActivasGlobales.length > 0 ? `${reglasActivasGlobales.length} clusters` : null
            },
            { id: 'diagnostico', label: '4. Diagnóstico & Razonamiento', icon: '🧠' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 3. Contenedor Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: ANTECEDENTES Y TRABAJO */}
          {tab === 'anamnesis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Puesto de Trabajo y Ergonomía</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    rows={3}
                    placeholder="Ej. Administrativo, sedente 8 hrs continuas, pantalla sin elevador..."
                    value={form.puesto_trabajo_ergonomia}
                    onChange={(e) => handleChange('puesto_trabajo_ergonomia', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cirugías, Fracturas y Traumatismos</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    rows={3}
                    placeholder="Ej. Esguince de tobillo grado 2 hace 5 años, sin cirugías..."
                    value={form.cirugias_traumatismos}
                    onChange={(e) => handleChange('cirugias_traumatismos', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Farmacoterapia Actual</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    placeholder="Ej. Paracetamol 1g c/8h SOS, AINEs..."
                    value={form.farmacos_actuales}
                    onChange={(e) => handleChange('farmacos_actuales', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Actividad Física y Deporte</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    placeholder="Ej. Sedentario habitual / Pádel 1 vez por semana..."
                    value={form.habitos_actividad_fisica}
                    onChange={(e) => handleChange('habitos_actividad_fisica', e.target.value)}
                  />
                </div>
              </div>

              {/* Banderas Rojas y Seguridad HVLA */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                      Banderas Rojas y Precauciones de Seguridad TMO
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Apto HVLA (Alta Velocidad):</span>
                    <button
                      type="button"
                      onClick={() => handleChange('apto_hvla', !form.apto_hvla)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        form.apto_hvla
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                      }`}
                    >
                      {form.apto_hvla ? '✓ Apto HVLA' : '⚠ NO Apto (Restricción)'}
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  className="w-full p-2.5 border border-rose-300 rounded-xl text-sm bg-white text-rose-950 placeholder-rose-300 focus:ring-2 focus:ring-rose-500"
                  placeholder="Detalla banderas rojas: pérdida de peso inexplicable, fiebre, déficit neurológico progresivo, incontinencia..."
                  value={form.banderas_rojas_alerta}
                  onChange={(e) => handleChange('banderas_rojas_alerta', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: SÍNTOMA Y CRONOLOGÍA */}
          {tab === 'sintoma' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Motivo de Consulta Principal</label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50"
                  placeholder="Ej. Dolor cervical con irradiación a brazo derecho al estar en computador..."
                  value={form.motivo_consulta}
                  onChange={(e) => handleChange('motivo_consulta', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tiempo de Evolución Clínico</label>
                <select
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-800"
                  value={form.tiempo_evolucion}
                  onChange={(e) => handleChange('tiempo_evolucion', e.target.value)}
                >
                  <option value="Agudo < 6 sem">Agudo (&lt; 6 semanas) - Predominio inflamatorio/compresivo</option>
                  <option value="Subagudo 6-12 sem">Subagudo (6 - 12 semanas) - Transición y adaptaciones</option>
                  <option value="Crónico > 12 sem">Crónico (&gt; 12 semanas) - Rigidez tisular / Sensibilización</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nivel de Irritabilidad Tisular</label>
                <select
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-800"
                  value={form.irritabilidad_tisular}
                  onChange={(e) => handleChange('irritabilidad_tisular', e.target.value)}
                >
                  <option value="Baja">Baja (Dolor al final de rango, cede inmediatamente al reposo)</option>
                  <option value="Moderada">Moderada (Dolor en rango medio, latencia corta tras movimiento)</option>
                  <option value="Alta">Alta (Dolor antes del límite de rango, latencia prolongada y dolor nocturno)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mecanismo Lesional e Inicio</label>
                <textarea
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  rows={2}
                  placeholder="Ej. Inicio insidioso progresivo / Traumático tras carga brusca..."
                  value={form.inicio_sintoma_cronologia}
                  onChange={(e) => handleChange('inicio_sintoma_cronologia', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Factores Agravantes y Aliviantes</label>
                <textarea
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  rows={2}
                  placeholder="Agrava: flexión o carga axial. Alivia: decúbito supino..."
                  value={form.factores_agravantes_aliviantes}
                  onChange={(e) => handleChange('factores_agravantes_aliviantes', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Comportamiento en 24 Horas</label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  placeholder="Rigidez matinal &lt; 15 min, empeora con fatiga vespertina..."
                  value={form.comportamiento_24h}
                  onChange={(e) => handleChange('comportamiento_24h', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Dolor Inicial (Escala ENA 0 a 10): <span className="font-bold text-blue-600">{form.dolor_inicial_ena}/10</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    className="flex-1 accent-blue-600 cursor-pointer"
                    value={form.dolor_inicial_ena}
                    onChange={(e) => handleChange('dolor_inicial_ena', parseInt(e.target.value) || 0)}
                  />
                  <span className="w-10 text-center font-bold text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">
                    {form.dolor_inicial_ena}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXAMEN FÍSICO Y CLUSTERS ORTOPÉDICOS */}
          {tab === 'examen' && (
            <div className="space-y-5">
              {/* Selector de Segmento TMO */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Clusters de Tests Ortopédicos por Segmento
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Selecciona un segmento y evalúa con tri-estado (+, -, NE)
                  </span>
                </div>

                {/* Botones de Segmentos */}
                <div className="flex flex-wrap gap-2">
                  {Object.values(TMO_SEGMENTS).map((seg) => {
                    const esActivo = segmentoActivo === seg.key;
                    // Contar cuántos tests de este segmento están respondidos
                    const respondidos = seg.tests.filter(
                      (t) => pruebasEstructuradas[t.id] && pruebasEstructuradas[t.id].result !== 'NE'
                    ).length;

                    return (
                      <button
                        key={seg.key}
                        type="button"
                        onClick={() => setSegmentoActivo(seg.key)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          esActivo
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{seg.icon}</span>
                        <span>{seg.label}</span>
                        {respondidos > 0 && (
                          <span
                            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              esActivo ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {respondidos}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Grilla de Tests del Segmento Activo */}
                {segmentoActivo && TMO_SEGMENTS[segmentoActivo] && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TMO_SEGMENTS[segmentoActivo].tests.map((test) => {
                        const testData = pruebasEstructuradas[test.id] || { result: 'NE', note: '' };

                        return (
                          <div
                            key={test.id}
                            className={`p-3 rounded-xl border transition-all ${
                              testData.result === '+'
                                ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                                : testData.result === '-'
                                ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate">
                                <span className="text-xs font-bold text-slate-800 block truncate">
                                  {test.name}
                                </span>
                                {test.typeLabel && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {test.typeLabel}
                                  </span>
                                )}
                              </div>

                              {/* Selector Tri-estado: NE / + / - */}
                              <div className="flex rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleTestChange(test.id, 'NE', testData.note)}
                                  className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                    testData.result === 'NE'
                                      ? 'bg-slate-200 text-slate-700'
                                      : 'text-slate-400 hover:bg-slate-100'
                                  }`}
                                  title="No evaluado"
                                >
                                  NE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTestChange(test.id, '+', testData.note)}
                                  className={`px-2.5 py-1 text-xs font-bold border-l border-slate-300 transition-colors cursor-pointer ${
                                    testData.result === '+'
                                      ? 'bg-rose-600 text-white'
                                      : 'text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title="Positivo"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTestChange(test.id, '-', testData.note)}
                                  className={`px-2.5 py-1 text-xs font-bold border-l border-slate-300 transition-colors cursor-pointer ${
                                    testData.result === '-'
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title="Negativo"
                                >
                                  -
                                </button>
                              </div>
                            </div>

                            {/* Campo de Nota Contextual si es Positivo */}
                            {testData.result === '+' && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="Detalle clínico (ej. reproduce dolor familiar a 35°)..."
                                  className="w-full text-xs p-1.5 border border-rose-300 rounded-lg bg-white text-rose-950 focus:ring-1 focus:ring-rose-500"
                                  value={testData.note}
                                  onChange={(e) => handleTestChange(test.id, '+', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Contenedor de Badges Reactivos de Inferencia Clínica */}
                    <div className="inference-badges-container pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Inferencia Clínica y Clusters Validados en Tiempo Real:
                        </span>
                      </div>

                      {reglasActivasSegmento.length === 0 ? (
                        <div className="p-3 bg-slate-100/70 border border-dashed border-slate-300 rounded-xl text-center">
                          <p className="text-xs text-slate-500">
                            No se han activado clusters para este segmento aún. Marca los tests correspondientes en{' '}
                            <span className="font-semibold text-rose-600">+</span> o{' '}
                            <span className="font-semibold text-emerald-600">-</span> para ver las inferencias diagnósticas.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reglasActivasSegmento.map((r) => {
                            const style = getSeverityBadgeStyle(r.severity);
                            return (
                              <div
                                key={r.rule_id}
                                className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${style.badgeClass} ${style.borderClass}`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{style.icon}</span>
                                    <span className="text-xs font-bold leading-tight">{r.badge}</span>
                                  </div>
                                  <p className="text-[11px] opacity-90 pl-5">
                                    <span className="font-semibold">Evidencia / Criterio:</span> {r.evidence}
                                  </p>
                                </div>
                                <span
                                  className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full shrink-0 ${style.chipClass}`}
                                >
                                  {r.severity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Otros Hallazgos Físicos Complementarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Inspección Postural</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    rows={2}
                    placeholder="Ej. Shift lateral lumbar a la derecha, pérdida de lordosis cervical..."
                    value={form.inspeccion_postura}
                    onChange={(e) => handleChange('inspeccion_postura', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Movilidad Activa (ROM) y End-Feel</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    rows={2}
                    placeholder="Ej. Flexión limitada con tope firme doloroso, rotación con restricción articular..."
                    value={form.movilidad_activa_rom}
                    onChange={(e) => handleChange('movilidad_activa_rom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Neurodinamia Basal</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    rows={2}
                    placeholder="Ej. Slump test negativo bilateral, sin mecano-sensibilidad dural..."
                    value={form.neurodinamia_basal}
                    onChange={(e) => handleChange('neurodinamia_basal', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Control Motor y Pruebas Funcionales</label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    rows={2}
                    placeholder="Ej. Déficit de reclutamiento de glúteo medio, colapso medial dinámico..."
                    value={form.pruebas_funcionales_control_motor}
                    onChange={(e) => handleChange('pruebas_funcionales_control_motor', e.target.value)}
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Juego Articular (Joint Play) y Palpación Miofascial
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                    rows={2}
                    placeholder="Ej. Hipomovilidad C5-C6 en deslizamiento posterior, puntos gatillo activos en trapecio superior..."
                    value={form.hallazgos_relevantes}
                    onChange={(e) => handleChange('hallazgos_relevantes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICO & RAZONAMIENTO BIOMECÁNICO */}
          {tab === 'diagnostico' && (
            <div className="space-y-5">
              {/* Banner Asistente IA de Razonamiento Clínico */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Asistente Clínico IA: Razonamiento Biomecánico & Codificación
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    Aplica la matriz de exclusión jerárquica (Axial vs Periférico, Interfaz tisular y Fenómeno de carga)
                    analizando toda la anamnesis, flags y clusters evaluados para razonar el caso y generar la codificación CIE/CIF/APTA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={loadingAI}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {loadingAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Razonando Caso Clínico...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>✨ Razonar y Generar Diagnóstico IA</span>
                    </>
                  )}
                </button>
              </div>

              {/* SECCIÓN 1: RAZONAMIENTO BIOMECÁNICO Y TRIAJE CLÍNICO (5 PUNTOS TMO) */}
              <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      1. Razonamiento Clínico Biomecánico y Triaje TMO (Motor KIROMOV Core)
                    </h3>
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Estándares APTA / IFOMPT
                  </span>
                </div>

                {/* Mostrar badges de clusters validados si los hay */}
                {reglasActivasGlobales.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {reglasActivasGlobales.map((r) => {
                      const style = getSeverityBadgeStyle(r.severity);
                      return (
                        <div
                          key={r.rule_id}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${style.badgeClass}`}
                        >
                          <span>{style.icon}</span>
                          <span className="font-bold">{r.badge}</span>
                          <span className="text-[10px] opacity-75">({r.evidence})</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <textarea
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                    rows={11}
                    placeholder="El razonamiento biomecánico estructurado generado por la IA aparecerá aquí (Diagnóstico Funcional, Triaje Axial vs Periférico, Clusters Validados, Banderas Rojas y Objetivos Inmediatos en TMO). También puedes escribirlo o editarlo directamente..."
                    value={form.razonamiento_clinico}
                    onChange={(e) => handleChange('razonamiento_clinico', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    * Puedes editar libremente el análisis antes de guardar la ficha médica.
                  </p>
                </div>
              </div>

              {/* SECCIÓN 2: CODIFICACIÓN INTERNACIONAL OFICIAL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Codificación Diagnóstica Oficial (CIE-10, CIE-11, CIF, APTA)
                  </h3>
                </div>

                {/* CIE-10 y CIE-11 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                      CIE-10 (Fonasa / Isapres)
                    </span>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        className="w-28 font-mono font-bold text-emerald-800 p-2 bg-emerald-50/40 border border-emerald-200 rounded-lg text-sm"
                        placeholder="M54.5"
                        value={form.cie10_codigo}
                        onChange={(e) => handleChange('cie10_codigo', e.target.value)}
                      />
                      <input
                        type="text"
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        placeholder="Lumbago no especificado..."
                        value={form.cie10_glosa}
                        onChange={(e) => handleChange('cie10_glosa', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider">
                      CIE-11 (Estándar OMS)
                    </span>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        className="w-28 font-mono font-bold text-blue-800 p-2 bg-blue-50/40 border border-blue-200 rounded-lg text-sm"
                        placeholder="ME84.2"
                        value={form.cie11_codigo}
                        onChange={(e) => handleChange('cie11_codigo', e.target.value)}
                      />
                      <input
                        type="text"
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        placeholder="Dolor lumbar crónico primario..."
                        value={form.cie11_glosa}
                        onChange={(e) => handleChange('cie11_glosa', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* CIF */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Diagnóstico Kinésico Funcional (CIF - OMS)
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                    rows={2}
                    placeholder="b7100.2 Deficiencia moderada de la movilidad articular, d4500 Dificultad para caminar distancias medias..."
                    value={form.diagnostico_cif}
                    onChange={(e) => handleChange('diagnostico_cif', e.target.value)}
                  />
                </div>

                {/* APTA */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Diagnóstico del Sistema del Movimiento (APTA)
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                    rows={2}
                    placeholder="Patrón 4E: Deficiencia de la movilidad articular, función motora, y rango de movimiento con disfunción de columna..."
                    value={form.diagnostico_apta}
                    onChange={(e) => handleChange('diagnostico_apta', e.target.value)}
                  />
                </div>

                {/* Diagnóstico TMO Biomecánico */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Diagnóstico Patomecánico TMO
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                    rows={2}
                    placeholder="Hipomovilidad artrocinemática segmentaria L4-L5 acoplada a sobrecarga facetaria..."
                    value={form.diagnostico_tmo_biomecanico}
                    onChange={(e) => handleChange('diagnostico_tmo_biomecanico', e.target.value)}
                  />
                </div>

                {/* Objetivos y Pronóstico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Objetivos Terapéuticos (SMART)
                    </label>
                    <textarea
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                      rows={3}
                      placeholder="Modular dolor EVA a &lt; 3 en 2 semanas, restaurar movilidad fisiológica..."
                      value={form.objetivos_terapeuticos}
                      onChange={(e) => handleChange('objetivos_terapeuticos', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pronóstico y Plan Sugerido
                    </label>
                    <textarea
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                      rows={3}
                      placeholder="Plan Pro Care (6 sesiones) - 2 sesiones semanales primeras 2 semanas..."
                      value={form.pronostico_sesiones}
                      onChange={(e) => handleChange('pronostico_sesiones', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Sticky Footer con Acciones */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {tab !== 'diagnostico' && (
              <button
                type="button"
                onClick={() => {
                  if (tab === 'anamnesis') setTab('sintoma');
                  else if (tab === 'sintoma') setTab('examen');
                  else if (tab === 'examen') setTab('diagnostico');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Siguiente Pestaña</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Guardar Evaluación Completa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function calcularEdad(fechaNacimiento?: string): number | undefined {
  if (!fechaNacimiento) return undefined;
  const hoy = new Date();
  const cumple = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--;
  }
  return edad > 0 && edad < 120 ? edad : undefined;
}
