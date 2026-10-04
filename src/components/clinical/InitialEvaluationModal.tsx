'use client';

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';

interface InitialEvaluationModalProps {
  isOpen: boolean;
  paciente: any;
  evaluacionExistente?: any | null;
  modo?: 'nueva' | 'editar';
  onClose: () => void;
  onSuccess: (form: any) => void;
}

const ORTHOPEDIC_TESTS = {
  'Cervical/Dorsal': ['Spurling', 'Distracción Cervical', 'ULNT1', 'Sharp-Purser', 'Test de Flexión-Rotación'],
  'Lumbar/Pelvis': ['Slump Test', 'Lasègue (SLR)', 'Thigh Thrust', 'Distracción SI', 'Compresión SI', 'Gaenslen', 'FABER', 'Prone Instability Test'],
  'Hombro': ['Hawkins-Kennedy', 'Neer', 'Jobe (Empty Can)', 'Speed', 'Yergason', 'Apprehension', 'Relocation', 'O\'Brien'],
  'Rodilla/Cadera': ['Lachman', 'Cajón Anterior', 'Cajón Posterior', 'McMurray', 'Apley', 'Thessaly', 'FADIR', 'Thomas'],
  'Tobillo/Pie': ['Cajón Anterior (Tobillo)', 'Talar Tilt', 'Thompson', 'Navicular Drop'],
  'Codo/Muñeca': ['Cozen', 'Mill', 'Finkelstein', 'Phalen', 'Tinel'],
  'ATM': ['Apertura Asimétrica', 'Clic Articular', 'Test de Carga']
};

export function InitialEvaluationModal({ isOpen, paciente, evaluacionExistente, modo = 'nueva', onClose, onSuccess }: InitialEvaluationModalProps) {
  const [tab, setTab] = useState<'anamnesis' | 'sintoma' | 'examen' | 'diagnostico'>('anamnesis');
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [segmentoActivo, setSegmentoActivo] = useState<string | null>(null);
  const [pruebasEstructuradas, setPruebasEstructuradas] = useState<Record<string, { result: 'NE' | '+' | '-', note: string }>>({});

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

    // Diagnósticos Internacionales
    cie10_codigo: evaluacionExistente?.cie10_codigo ?? '',
    cie10_glosa: evaluacionExistente?.cie10_glosa ?? '',
    cie11_codigo: evaluacionExistente?.cie11_codigo ?? '',
    cie11_glosa: evaluacionExistente?.cie11_glosa ?? '',
    diagnostico_cif: evaluacionExistente?.diagnostico_cif ?? '',
    diagnostico_apta: evaluacionExistente?.diagnostico_apta ?? '',
    diagnostico_tmo_biomecanico: evaluacionExistente?.diagnostico_tmo_biomecanico ?? (typeof evaluacionExistente?.diagnostico_tmo === 'string' ? evaluacionExistente?.diagnostico_tmo : ''),
    objetivos_terapeuticos: evaluacionExistente?.objetivos_terapeuticos ?? '',
    pronostico_sesiones: evaluacionExistente?.pronostico_sesiones ?? 'Plan Pro Care (6 sesiones)',
  });

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestChange = (testName: string, result: 'NE' | '+' | '-', note: string = '') => {
    setPruebasEstructuradas(prev => {
      const updated = { ...prev, [testName]: { result, note } };
      updatePruebasText(updated);
      return updated;
    });
  };

  const updatePruebasText = (pruebas: Record<string, { result: string, note: string }>) => {
    const lines = Object.entries(pruebas)
      .filter(([_, data]) => data.result !== 'NE')
      .map(([name, data]) => `${name} (${data.result})${data.note ? ` - ${data.note}` : ''}`);
    
    // Solo actualizar el textarea con los hallazgos estructurados para que el terapeuta los vea
    // o mantener la concatenación en un string limpio. Para evitar sobreescribir el texto libre:
    // Mantenemos texto libre y agregamos los estructurados al enviar, O reemplazamos.
    // Vamos a auto-generar la primera línea con los seleccionados.
  };
  
  const getPruebasConcatenadas = () => {
    const lines = Object.entries(pruebasEstructuradas)
      .filter(([_, data]) => data.result !== 'NE')
      .map(([name, data]) => `${name} (${data.result})${data.note ? ` - ${data.note}` : ''}`);
    
    let combined = form.pruebas_especiales_ortopedicas;
    if (lines.length > 0) {
       combined = lines.join(', ') + (combined ? '\nOtras: ' + combined : '');
    }
    return combined;
  };

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const payload = {
        ...form,
        pruebas_especiales_ortopedicas: getPruebasConcatenadas(),
        edad: paciente?.edad,
        sexo: paciente?.sexo,
      };
      
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        toast.error(data.error || 'Error al generar diagnóstico');
        return;
      }
      
      setForm((prev) => ({
        ...prev,
        cie10_codigo: data.cie10_codigo,
        cie10_glosa: data.cie10_glosa,
        cie11_codigo: data.cie11_codigo,
        cie11_glosa: data.cie11_glosa,
        diagnostico_cif: data.diagnostico_cif,
        diagnostico_apta: data.diagnostico_apta,
        diagnostico_tmo_biomecanico: data.diagnostico_tmo_biomecanico,
        objetivos_terapeuticos: data.objetivos_terapeuticos,
        pronostico_sesiones: data.pronostico_sesiones,
      }));
      setTab('diagnostico');
      toast.success('Análisis IA completado.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error de red al generar diagnóstico IA.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSave = () => {
    const finalForm = {
       ...form,
       pruebas_especiales_ortopedicas: getPruebasConcatenadas()
    };
    onSuccess(finalForm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Encabezado Clínico */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-900 text-white">
          <div>
            <h2 className="text-xl font-bold">Evaluación Inicial TMO & Diagnóstico Funcional</h2>
            <p className="text-xs text-slate-400">
              Paciente: <span className="font-semibold text-emerald-400">{paciente?.nombre_completo}</span> • RUT: {paciente?.rut}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* Barra de Pestañas Rápidas */}
        <div className="flex border-b bg-slate-50 px-6 gap-2">
          {[
            { id: 'anamnesis', label: '1. Antecedentes & Trabajo' },
            { id: 'sintoma', label: '2. Síntoma & Cronología' },
            { id: 'examen', label: '3. Examen Físico (Orto & TMO)' },
            { id: 'diagnostico', label: '4. Diagnóstico (CIE/CIF/TMO)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenedor con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'anamnesis' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Puesto de Trabajo y Ergonomía</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ej. Administrativo, sedente 8 hrs frente a pantalla..."
                  value={form.puesto_trabajo_ergonomia}
                  onChange={(e) => handleChange('puesto_trabajo_ergonomia', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Cirugías, Fracturas y Traumatismos</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ej. Apendicectomía 2018..."
                  value={form.cirugias_traumatismos}
                  onChange={(e) => handleChange('cirugias_traumatismos', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Farmacoterapia Actual</label>
                <input
                  type="text"
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  placeholder="Ej. Paracetamol 1g c/8h..."
                  value={form.farmacos_actuales}
                  onChange={(e) => handleChange('farmacos_actuales', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Actividad Física y Deporte</label>
                <input
                  type="text"
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  placeholder="Ej. Sedentario / Pádel 2 veces..."
                  value={form.habitos_actividad_fisica}
                  onChange={(e) => handleChange('habitos_actividad_fisica', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-rose-700">Banderas Rojas / Alertas de Seguridad</label>
                <input
                  type="text"
                  className="w-full mt-1 p-2.5 border border-rose-200 bg-rose-50 rounded-lg text-sm"
                  placeholder="Banderas rojas del dolor raquídeo, fiebre..."
                  value={form.banderas_rojas_alerta}
                  onChange={(e) => handleChange('banderas_rojas_alerta', e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 'sintoma' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Mecanismo y Cronología de Inicio</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Ej. Inicio insidioso hace 2 meses..."
                  value={form.inicio_sintoma_cronologia}
                  onChange={(e) => handleChange('inicio_sintoma_cronologia', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Factores Agravantes y Aliviantes</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Agrava: flexión lumbar..."
                  value={form.factores_agravantes_aliviantes}
                  onChange={(e) => handleChange('factores_agravantes_aliviantes', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Comportamiento en 24 Horas</label>
                <input
                  type="text"
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  placeholder="Rigidez matinal de 10 min..."
                  value={form.comportamiento_24h}
                  onChange={(e) => handleChange('comportamiento_24h', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Nivel de Irritabilidad Tisular</label>
                <select
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white font-semibold"
                  value={form.irritabilidad_tisular}
                  onChange={(e) => handleChange('irritabilidad_tisular', e.target.value)}
                >
                  <option value="Baja">Baja (Dolor al final de rango, cede inmediatamente)</option>
                  <option value="Moderada">Moderada (Dolor en rango medio, latencia corta)</option>
                  <option value="Alta">Alta (Dolor antes de rango, latencia prolongada)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Dolor Inicial (ENA 0-10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white font-semibold"
                  value={form.dolor_inicial_ena}
                  onChange={(e) => handleChange('dolor_inicial_ena', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {tab === 'examen' && (
            <div className="space-y-6">
              {/* Recomendador Clínico Interactivo */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Clusters de Pruebas Especiales Ortopédicas (Gold Standard)
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(ORTHOPEDIC_TESTS).map(seg => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setSegmentoActivo(segmentoActivo === seg ? null : seg)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${segmentoActivo === seg ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {seg.includes('Cervical') ? '💆 ' : seg.includes('Lumbar') ? '🦴 ' : seg.includes('Hombro') ? '💪 ' : seg.includes('Rodilla') ? '🦵 ' : seg.includes('Tobillo') ? '🦶 ' : seg.includes('Codo') ? '🖐️ ' : '🦷 '}{seg}
                    </button>
                  ))}
                </div>
                
                {segmentoActivo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 border border-blue-100 rounded-xl shadow-inner">
                    {(ORTHOPEDIC_TESTS as any)[segmentoActivo].map((testName: string) => {
                      const data = pruebasEstructuradas[testName] || { result: 'NE', note: '' };
                      return (
                        <div key={testName} className="p-3 border rounded-lg bg-slate-50 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{testName}</span>
                            <div className="flex rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
                              <button onClick={() => handleTestChange(testName, 'NE', data.note)} className={`px-2 py-1 text-[10px] font-bold ${data.result === 'NE' ? 'bg-slate-200 text-slate-600' : 'text-slate-400 hover:bg-slate-100'}`}>NE</button>
                              <button onClick={() => handleTestChange(testName, '+', data.note)} className={`px-2 py-1 text-[10px] font-bold border-l border-slate-300 ${data.result === '+' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-100'}`}>+</button>
                              <button onClick={() => handleTestChange(testName, '-', data.note)} className={`px-2 py-1 text-[10px] font-bold border-l border-slate-300 ${data.result === '-' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}>-</button>
                            </div>
                          </div>
                          {data.result === '+' && (
                            <input 
                              type="text" 
                              placeholder="Nota (ej. reproduce dolor familiar a 40°)..." 
                              className="text-xs p-1.5 border rounded bg-white text-rose-900 border-rose-200 focus:ring-rose-500"
                              value={data.note}
                              onChange={(e) => handleTestChange(testName, '+', e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Otros Hallazgos y Físico General */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">Inspección Postural</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    rows={2}
                    placeholder="Ej. Desplazamiento lateral..."
                    value={form.inspeccion_postura}
                    onChange={(e) => handleChange('inspeccion_postura', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">Movilidad Activa (ROM)</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    rows={2}
                    placeholder="Ej. Flexión completa con dolor al final de rango..."
                    value={form.movilidad_activa_rom}
                    onChange={(e) => handleChange('movilidad_activa_rom', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">Otras Pruebas Especiales (Texto Libre)</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    rows={3}
                    placeholder="Añade otras pruebas no listadas en el recomendador..."
                    value={form.pruebas_especiales_ortopedicas}
                    onChange={(e) => handleChange('pruebas_especiales_ortopedicas', e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">Control Motor y Pruebas Funcionales</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    rows={3}
                    placeholder="Ej. Trendelenburg dinámico leve..."
                    value={form.pruebas_funcionales_control_motor}
                    onChange={(e) => handleChange('pruebas_funcionales_control_motor', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700">Otros Hallazgos Relevantes (Juego Articular, Palpación)</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    rows={2}
                    placeholder="Palpación miofascial dolorosa en cuadrado lumbar..."
                    value={form.hallazgos_relevantes}
                    onChange={(e) => handleChange('hallazgos_relevantes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'diagnostico' && (
            <div className="space-y-4">
              {/* Botón Asistente IA */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">✨ Asistente Diagnóstico IA (CIE / CIF / TMO)</h4>
                  <p className="text-xs text-emerald-700">Analiza todos los antecedentes y pruebas clínicas ingresadas para sugerir la codificación internacional.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={loadingAI}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  {loadingAI ? 'Analizando...' : 'Generar Codificación'}
                </button>
              </div>

              {/* Cuadrícula de Códigos Oficiales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-xl bg-slate-50">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">CIE-10 (Estándar Fonasa / Isapres)</span>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      className="w-28 font-mono font-bold text-emerald-800 p-2 bg-white border rounded text-sm"
                      placeholder="M54.5"
                      value={form.cie10_codigo}
                      onChange={(e) => handleChange('cie10_codigo', e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 bg-white border rounded text-sm"
                      placeholder="Lumbago no especificado..."
                      value={form.cie10_glosa}
                      onChange={(e) => handleChange('cie10_glosa', e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-3 border rounded-xl bg-slate-50">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">CIE-11 (Estándar OMS)</span>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      className="w-28 font-mono font-bold text-blue-800 p-2 bg-white border rounded text-sm"
                      placeholder="ME84.2"
                      value={form.cie11_codigo}
                      onChange={(e) => handleChange('cie11_codigo', e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 bg-white border rounded text-sm"
                      placeholder="Dolor lumbar crónico primario..."
                      value={form.cie11_glosa}
                      onChange={(e) => handleChange('cie11_glosa', e.target.value)}
                    />
                  </div>
                </div>
              </div>

                            {/* Diagnóstico Funcional CIF */}
              <div>
                <label className="text-xs font-bold text-slate-700">Diagnóstico Kinésico Funcional (CIF)</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                  rows={3}
                  value={form.diagnostico_cif}
                  onChange={(e) => handleChange('diagnostico_cif', e.target.value)}
                />
              </div>

              {/* Diagnóstico APTA */}
              <div>
                <label className="text-xs font-bold text-slate-700">Diagnóstico del Sistema del Movimiento (APTA)</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                  rows={2}
                  value={form.diagnostico_apta}
                  onChange={(e) => handleChange('diagnostico_apta', e.target.value)}
                />
              </div>

              {/* Diagnóstico Biomecánico TMO */}
              <div>
                <label className="text-xs font-bold text-slate-700">Diagnóstico Patomecánico & TMO</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                  rows={3}
                  value={form.diagnostico_tmo_biomecanico}
                  onChange={(e) => handleChange('diagnostico_tmo_biomecanico', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Objetivos Terapéuticos (SMART)</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                    rows={3}
                    value={form.objetivos_terapeuticos}
                    onChange={(e) => handleChange('objetivos_terapeuticos', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Pronóstico y Plan Sugerido</label>
                  <textarea
                    className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                    rows={3}
                    value={form.pronostico_sesiones}
                    onChange={(e) => handleChange('pronostico_sesiones', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Guardado */}
        <div className="border-t bg-slate-50 px-6 py-4 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            📋 Guardar Evaluación Completa
          </button>
        </div>
      </div>
    </div>
  );
}
