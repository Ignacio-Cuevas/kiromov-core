'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getChileanDate } from '@/lib/utils';
import { ShieldAlert, Activity, UserCog, Stethoscope, AlertTriangle, User, ChevronRight, ChevronLeft } from 'lucide-react';
import { FormularioLumbar } from './evaluacion/FormularioLumbar';
import { FormularioCervical } from './evaluacion/FormularioCervical';
import { FormularioHombro } from './evaluacion/FormularioHombro';
import { FormularioCadera } from './evaluacion/FormularioCadera';
import { FormularioRodilla } from './evaluacion/FormularioRodilla';
import { FormularioTobillo } from './evaluacion/FormularioTobillo';

interface InitialEvaluationModalProps {
  isOpen: boolean;
  paciente: any;
  evaluacionExistente?: any | null;
  modo?: 'nueva' | 'editar';
  onClose: () => void;
  onSuccess: () => void;
}

export function InitialEvaluationModal({ isOpen, paciente, evaluacionExistente, modo = 'nueva', onClose, onSuccess }: InitialEvaluationModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState(1);

  const [fechaEvaluacion, setFechaEvaluacion] = useState<string>(
    evaluacionExistente?.fecha_evaluacion || getChileanDate()
  );

  // Paso 1: Anamnesis y Dolor
  const [anamnesis, setAnamnesis] = useState({
    motivo_consulta: '',
    tiempo_evolucion: 'agudo',
    eva: 5,
    dolor_nocturno: false,
    aumenta_con: '',
    disminuye_con: '',
    banderas_rojas: [] as string[]
  });

  // Paso 2: Segmento
  const [segmento, setSegmento] = useState<string>('lumbar'); // lumbar, cervical, hombro, otro

  // Paso 3: Datos de segmento dinámico
  const [datosSegmento, setDatosSegmento] = useState<any>({});

  // Paso 4: Conclusión y Plan
  const [diagnostico, setDiagnostico] = useState('');
  const [planTratamiento, setPlanTratamiento] = useState('Plan Integral - 10 ses');
  const [frecuencia, setFrecuencia] = useState('');
  const [objetivosCortoPlazo, setObjetivosCortoPlazo] = useState('');
  
  const [cargandoIADiagnostico, setCargandoIADiagnostico] = useState(false);

  const handleGenerarDiagnosticoConIA = async () => {
    setCargandoIADiagnostico(true);
    try {
      const res = await fetch('/api/ai/evaluacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anamnesis,
          segmento_evaluado: segmento,
          datos_segmento: datosSegmento
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : (data.error?.message || "Error al analizar evaluación"));
        return;
      }

      if (data.diagnostico_tmo) {
        setDiagnostico(typeof data.diagnostico_tmo === 'string' ? data.diagnostico_tmo : (data.diagnostico_tmo.diagnostico || JSON.stringify(data.diagnostico_tmo)));
      }
      if (data.objetivos_corto_plazo) {
        setObjetivosCortoPlazo(
          Array.isArray(data.objetivos_corto_plazo) 
            ? data.objetivos_corto_plazo.join(', ') 
            : (typeof data.objetivos_corto_plazo === 'string' ? data.objetivos_corto_plazo : JSON.stringify(data.objetivos_corto_plazo))
        );
      }
      if (data.plan_recomendado) {
        setPlanTratamiento(typeof data.plan_recomendado === 'string' ? data.plan_recomendado : (data.plan_recomendado.plan_recomendado || data.plan_recomendado.nombre || JSON.stringify(data.plan_recomendado)));
      }
      if (data.frecuencia_semanal) {
        setFrecuencia(typeof data.frecuencia_semanal === 'string' ? data.frecuencia_semanal : (data.frecuencia_semanal.frecuencia || JSON.stringify(data.frecuencia_semanal)));
      }
      
      toast.success("Razonamiento clínico generado exitosamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Hubo un error con el Copiloto IA");
    } finally {
      setCargandoIADiagnostico(false);
    }
  };

  useEffect(() => {
    if (modo === 'editar' && evaluacionExistente) {
      setFechaEvaluacion(evaluacionExistente.fecha_evaluacion || getChileanDate());
      setSegmento(evaluacionExistente.segmento_evaluado || 'lumbar');
      setAnamnesis(evaluacionExistente.anamnesis || anamnesis);
      setDatosSegmento(evaluacionExistente.datos_segmento || {});
      setDiagnostico(evaluacionExistente.diagnostico_tmo || '');
      setPlanTratamiento(evaluacionExistente.plan_tratamiento || '');
    }
  }, [evaluacionExistente, modo]);

  const handleGuardar = async () => {
    if (!supabase) return;
    try {
      setLoading(true);

      const payload = {
        paciente_id: paciente.id,
        fecha_evaluacion: fechaEvaluacion 
          ? new Date(fechaEvaluacion + 'T12:00:00Z').toISOString() 
          : new Date().toISOString(),
        segmento_evaluado: segmento,
        anamnesis,
        datos_segmento: datosSegmento,
        diagnostico_tmo: diagnostico,
        plan_tratamiento: planTratamiento,
      };

      if (modo === 'nueva' || !evaluacionExistente?.id) {
        const { error } = await supabase.from('evaluaciones_iniciales_tmo').insert([payload]);
        if (error) throw error;
        toast.success('Evaluación Inicial guardada correctamente');
      } else {
        const { error } = await supabase
          .from('evaluaciones_iniciales_tmo')
          .update(payload)
          .eq('id', evaluacionExistente.id);
        if (error) throw error;
        toast.success('Evaluación Inicial actualizada correctamente');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error guardando evaluación:', err);
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPaso1 = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 w-full md:w-1/2 mb-4">
        <label className="text-sm font-semibold text-slate-700">Fecha de Evaluación <span className="text-rose-500">*</span></label>
        <Input 
          type="date"
          value={fechaEvaluacion}
          onChange={(e) => setFechaEvaluacion(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Motivo de consulta</label>
          <Textarea 
            placeholder="Ej: Dolor en zona baja de la espalda..."
            value={anamnesis.motivo_consulta}
            onChange={(e) => setAnamnesis({ ...anamnesis, motivo_consulta: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Tiempo de evolución</label>
          <select 
            className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            value={anamnesis.tiempo_evolucion}
            onChange={(e) => setAnamnesis({ ...anamnesis, tiempo_evolucion: e.target.value })}
          >
            <option value="agudo">Agudo (&lt; 4 semanas)</option>
            <option value="subagudo">Subagudo (4 - 12 semanas)</option>
            <option value="cronico">Crónico (&gt; 12 semanas)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Escala EVA del Dolor ({anamnesis.eva}/10)</label>
        <input 
          type="range" min="0" max="10" 
          value={anamnesis.eva} 
          onChange={(e) => setAnamnesis({ ...anamnesis, eva: parseInt(e.target.value) })}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>0 (Sin dolor)</span>
          <span>5 (Moderado)</span>
          <span>10 (Máximo)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">El dolor aumenta con:</label>
          <Input 
            placeholder="Ej: Estar sentado, agacharse..."
            value={anamnesis.aumenta_con}
            onChange={(e) => setAnamnesis({ ...anamnesis, aumenta_con: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">El dolor disminuye con:</label>
          <Input 
            placeholder="Ej: Calor, reposo, analgésicos..."
            value={anamnesis.disminuye_con}
            onChange={(e) => setAnamnesis({ ...anamnesis, disminuye_con: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="dolor_nocturno"
          checked={anamnesis.dolor_nocturno}
          onChange={(e) => setAnamnesis({ ...anamnesis, dolor_nocturno: e.target.checked })}
        />
        <label htmlFor="dolor_nocturno" className="text-sm text-slate-700">Presenta dolor nocturno (despierta por la noche)</label>
      </div>

      <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex flex-col gap-2">
        <label className="text-sm font-bold text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Descarte de Banderas Rojas
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-red-700">
          {['Pérdida de fuerza súbita', 'Compromiso esfinteriano', 'Fiebre/baja peso inexplicable'].map((bandera) => (
            <div key={bandera} className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={anamnesis.banderas_rojas.includes(bandera)}
                onChange={(e) => {
                  if (e.target.checked) setAnamnesis({ ...anamnesis, banderas_rojas: [...anamnesis.banderas_rojas, bandera] });
                  else setAnamnesis({ ...anamnesis, banderas_rojas: anamnesis.banderas_rojas.filter(b => b !== bandera) });
                }}
              />
              <span>{bandera}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPaso2 = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
      {[
        { id: 'lumbar', icon: '🦴', label: 'Columna Lumbar' },
        { id: 'cervical', icon: '🧠', label: 'Columna Cervical' },
        { id: 'hombro', icon: '💪', label: 'Hombro y Escápula' },
        { id: 'cadera', icon: '🦵', label: 'Cadera y Pelvis' },
        { id: 'rodilla', icon: '🦵', label: 'Rodilla' },
        { id: 'tobillo_pie', icon: '🦶', label: 'Tobillo y Pie' },
        { id: 'otro', icon: '➕', label: 'Otro' },
      ].map((seg) => (
        <button
          key={seg.id}
          type="button"
          onClick={() => setSegmento(seg.id)}
          className={`p-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${
            segmento === seg.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <span className="text-3xl">{seg.icon}</span>
          <span className="font-semibold">{seg.label}</span>
        </button>
      ))}
    </div>
  );

  const renderPaso3 = () => {
    if (segmento === 'lumbar') return <FormularioLumbar datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'cervical') return <FormularioCervical datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'hombro') return <FormularioHombro datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'cadera') return <FormularioCadera datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'rodilla') return <FormularioRodilla datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'tobillo_pie') return <FormularioTobillo datos={datosSegmento} setDatos={setDatosSegmento} />;
    
    return (
      <div className="p-8 text-center text-slate-500">
        Sección genérica. (Formulario en desarrollo).
      </div>
    );
  };

  const renderPaso4 = () => (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
        <div>
          <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
            ✨ Copiloto TMO: Razonamiento Diagnóstico
          </p>
          <p className="text-[11px] text-indigo-600">
            Sintetiza los test ortopédicos, ROM y síntomas registrados en los pasos anteriores.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerarDiagnosticoConIA}
          disabled={cargandoIADiagnostico}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors shadow-sm"
        >
          {cargandoIADiagnostico ? "✨ Analizando hallazgos..." : "✨ Generar Diagnóstico y Objetivos"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Diagnóstico Kinésico Funcional</label>
        <Textarea 
          placeholder='Ej: "Síndrome de dolor subacromial derecho asociado a discinesia escapular..."'
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          className="h-24"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Plan Recomendado</label>
          <select 
            className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
            value={planTratamiento}
            onChange={(e) => setPlanTratamiento(e.target.value)}
          >
            <option value="Plan Activa Care - 4 ses">Plan Activa Care - 4 ses</option>
            <option value="Plan Pro Care - 6 ses">Plan Pro Care - 6 ses</option>
            <option value="Plan Integral - 10 ses">Plan Integral - 10 ses</option>
            <option value="Sesión Individual">Sesión Individual</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Frecuencia Semanal</label>
          <Input 
            placeholder="Ej: 2 veces por semana"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Objetivos a Corto Plazo</label>
        <Textarea 
          placeholder="Ej: Disminuir EVA a 3/10, mejorar ROM..."
          value={objetivosCortoPlazo}
          onChange={(e) => setObjetivosCortoPlazo(e.target.value)}
        />
      </div>
    </div>
  );

  if (!paciente) return <Dialog open={isOpen} onOpenChange={onClose}><div className="flex h-64 items-center justify-center"><p className="text-slate-500">Cargando...</p></div></Dialog>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="max-w-4xl min-h-[500px]">
          <DialogHeader className="p-6 border-b border-slate-100 flex-shrink-0 flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                Nueva Evaluación Inicial TMO
              </DialogTitle>
              <DialogDescription>
                Paciente: {paciente?.nombre_completo || paciente?.full_name}
              </DialogDescription>
            </div>
            
            {/* Stepper Header */}
            <div className="flex gap-2 text-xs font-semibold">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    paso === step ? 'bg-blue-600 text-white' : paso > step ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </DialogHeader>

          <DialogBody className="p-6 overflow-y-auto bg-slate-50 flex-1">
            {paso === 1 && renderPaso1()}
            {paso === 2 && renderPaso2()}
            {paso === 3 && renderPaso3()}
            {paso === 4 && renderPaso4()}
          </DialogBody>

          <DialogFooter className="p-6 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
            {paso > 1 ? (
              <Button variant="outline" onClick={() => setPaso(paso - 1)} type="button">
                <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
              </Button>
            ) : (
              <div /> // Spacer
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} type="button">
                Cancelar
              </Button>
              {paso < 4 ? (
                <Button onClick={() => setPaso(paso + 1)} type="button" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleGuardar} disabled={loading} type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {loading ? 'Guardando...' : 'Guardar Evaluación Inicial TMO'}
                </Button>
              )}
            </div>
          </DialogFooter>
    </Dialog>
  );
}
