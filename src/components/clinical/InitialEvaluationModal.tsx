'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getChileanDate } from '@/lib/utils';
import { ShieldAlert, Activity, UserCog, Stethoscope, AlertTriangle } from 'lucide-react';

interface InitialEvaluationModalProps {
  isOpen: boolean;
  paciente: any;
  evaluacionExistente?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InitialEvaluationModal({ isOpen, paciente, evaluacionExistente, onClose, onSuccess }: InitialEvaluationModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Blq 1: Perfil Laboral
  const [ocupacion, setOcupacion] = useState('');
  const [actividadFisica, setActividadFisica] = useState('');
  const [cirugias, setCirugias] = useState('');
  const [farmacos, setFarmacos] = useState('');

  // Blq 2: Seguridad / Banderas Rojas
  const [banderasRojas, setBanderasRojas] = useState<string[]>([]);
  const [aptoHvla, setAptoHvla] = useState(true);
  const [notasContraindicaciones, setNotasContraindicaciones] = useState('');

  // Blq 3: Comportamiento Síntoma
  const [mecanismo, setMecanismo] = useState('Insidioso');
  const [evolucion, setEvolucion] = useState('Agudo <6 sem');
  const [comportamiento24h, setComportamiento24h] = useState('');
  const [dolorInicial, setDolorInicial] = useState(5);

  // Blq 4: Examen Físico
  const [juegoArticular, setJuegoArticular] = useState('Normal Gr. 3');
  const [movilidad, setMovilidad] = useState('');
  const [neurodinamia, setNeurodinamia] = useState('');
  const [hallazgos, setHallazgos] = useState('');

  // Blq 5: Diagnóstico
  const [diagnostico, setDiagnostico] = useState('');
  const [objetivos, setObjetivos] = useState('');
  const [altaEstimada, setAltaEstimada] = useState('4 a 6 sesiones');

  useEffect(() => {
    if (evaluacionExistente) {
      setOcupacion(evaluacionExistente.ocupacion_laboral || '');
      setActividadFisica(evaluacionExistente.actividad_fisica || '');
      setCirugias(evaluacionExistente.cirugias_traumatismos || '');
      setFarmacos(evaluacionExistente.farmacos_actuales || '');
      setBanderasRojas(evaluacionExistente.banderas_rojas || []);
      setAptoHvla(evaluacionExistente.apto_hvla ?? true);
      setNotasContraindicaciones(evaluacionExistente.notas_contraindicaciones || '');
      setMecanismo(evaluacionExistente.mecanismo_inicio || 'Insidioso');
      setEvolucion(evaluacionExistente.tiempo_evolucion || 'Agudo <6 sem');
      setComportamiento24h(evaluacionExistente.comportamiento_24h || '');
      setDolorInicial(evaluacionExistente.dolor_inicial_ena ?? 5);
      setJuegoArticular(evaluacionExistente.juego_articular || 'Normal Gr. 3');
      setMovilidad(evaluacionExistente.movilidad_activa || '');
      setNeurodinamia(evaluacionExistente.neurodinamia || '');
      setHallazgos(evaluacionExistente.hallazgos_fisicos || '');
      setDiagnostico(evaluacionExistente.hipotesis_diagnostica_tmo || '');
      setObjetivos(evaluacionExistente.objetivos_terapeuticos || '');
      setAltaEstimada(evaluacionExistente.estimacion_alta || '4 a 6 sesiones');
    }
  }, [evaluacionExistente]);

  const toggleBandera = (bandera: string) => {
    setBanderasRojas(prev => prev.includes(bandera) ? prev.filter(b => b !== bandera) : [...prev, bandera]);
  };

  const addChip = (setter: React.Dispatch<React.SetStateAction<string>>, val: string, text: string) => {
    if (!val.includes(text)) {
      setter(prev => prev ? `${prev}, ${text}` : text);
    }
  };

  const handleGuardar = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const payload = {
        paciente_id: paciente.id,
        ocupacion_laboral: ocupacion,
        actividad_fisica: actividadFisica,
        cirugias_traumatismos: cirugias,
        farmacos_actuales: farmacos,
        banderas_rojas: banderasRojas,
        apto_hvla: aptoHvla,
        notas_contraindicaciones: notasContraindicaciones,
        mecanismo_inicio: mecanismo,
        tiempo_evolucion: evolucion,
        comportamiento_24h: comportamiento24h,
        dolor_inicial_ena: dolorInicial,
        juego_articular: juegoArticular,
        movilidad_activa: movilidad,
        neurodinamia: neurodinamia,
        hallazgos_fisicos: hallazgos,
        hipotesis_diagnostica_tmo: diagnostico,
        objetivos_terapeuticos: objetivos,
        estimacion_alta: altaEstimada,
        fecha_evaluacion: getChileanDate(),
      };

      if (evaluacionExistente?.id) {
        const { error } = await supabase.from('evaluaciones_iniciales_tmo').update(payload).eq('id', evaluacionExistente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('evaluaciones_iniciales_tmo').insert([payload]);
        if (error) throw error;
        
        // Crear el primer SOAP
        const { data: soaps } = await supabase.from('evoluciones_soap').select('id').eq('paciente_id', paciente.id).limit(1);
        if (!soaps || soaps.length === 0) {
          await supabase.from('evoluciones_soap').insert([{
            paciente_id: paciente.id,
            fecha: getChileanDate(),
            nivel_dolor_ena: dolorInicial,
            s_subjetivo: 'Evaluación Inicial TMO',
            o_objetivo: 'Ver Ficha de Evaluación TMO para detalles de examen físico.',
            a_analisis: diagnostico,
            p_plan: objetivos,
            pronostico_sesiones: altaEstimada,
            profesional: 'Kinesiólogo(a)'
          }]);
        }
      }

      // Actualizar paciente
      await supabase.from('pacientes').update({
        diagnostico_principal: diagnostico,
        alertas_seguridad: notasContraindicaciones + (aptoHvla ? '' : ' [No Apto HVLA]'),
        antecedentes_morbidos: `Cirugías: ${cirugias} | Fármacos: ${farmacos}`
      }).eq('id', paciente.id);

      toast.success('Evaluación TMO guardada exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Evaluación Kinésica Inicial & Examen Basal TMO</DialogTitle>
        <DialogDescription>
          Historia clínica de ingreso, banderas rojas y biomecánica articular — {paciente?.nombre_completo}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="max-h-[70vh] overflow-y-auto space-y-6 p-1">
        {/* Bloque 1 */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-blue-600" />
            1. Perfil Laboral y Carga Biomecánica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ocupación / Tipo de Trabajo</label>
              <Input value={ocupacion} onChange={e => setOcupacion(e.target.value)} placeholder="Ej: Oficinista" />
              <div className="flex flex-wrap gap-1 mt-1">
                {['Sedente prolongado', 'Manejo manual de cargas', 'Bipedestación continua', 'Vibración / Conducción'].map(chip => (
                  <span key={chip} onClick={() => addChip(setOcupacion, ocupacion, chip)} className="text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-slate-100">{chip}</span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Actividad Física / Deporte</label>
              <Input value={actividadFisica} onChange={e => setActividadFisica(e.target.value)} placeholder="Ej: Running 3v/sem" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Cirugías y Fracturas Previas</label>
              <Input value={cirugias} onChange={e => setCirugias(e.target.value)} placeholder="Ej: Apendicectomía 2015, sin fracturas" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Fármacos de Uso Habitual</label>
              <Input value={farmacos} onChange={e => setFarmacos(e.target.value)} placeholder="Ej: Paracetamol en caso de dolor" />
              <div className="flex flex-wrap gap-1 mt-1">
                {['Uso de AINEs', 'Anticoagulantes', 'Corticoides prolongados'].map(chip => (
                  <span key={chip} onClick={() => addChip(setFarmacos, farmacos, chip)} className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-rose-100">{chip}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2 */}
        <div className="space-y-4 bg-rose-50/50 p-4 rounded-xl border border-rose-200">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            2. Tamizaje de Seguridad y Banderas Rojas TMO
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Dolor nocturno constante', 'Pérdida de peso', 'Compromiso neurológico severo', 'Síntomas de arteria vertebral'].map(bandera => (
              <label key={bandera} className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={banderasRojas.includes(bandera)} onChange={() => toggleBandera(bandera)} className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                <span className="leading-tight">{bandera}</span>
              </label>
            ))}
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 mt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={aptoHvla} onChange={e => setAptoHvla(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <span className={`font-bold text-sm ${aptoHvla ? 'text-emerald-700' : 'text-amber-600'}`}>
              {aptoHvla ? '⚡ Paciente Apto para Manipulación Articular HVLA' : '⚠️ Precaución / Contraindicación para HVLA'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Notas Adicionales de Seguridad</label>
            <Input value={notasContraindicaciones} onChange={e => setNotasContraindicaciones(e.target.value)} placeholder="Ej: Osteopenia leve, preferir movilizaciones grado I-II" />
          </div>
        </div>

        {/* Bloque 3 */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" />
            3. Comportamiento del Síntoma
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Mecanismo de Inicio</label>
              <select value={mecanismo} onChange={e => setMecanismo(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg">
                <option value="Traumático">Traumático</option>
                <option value="Sobrecarga repetitiva">Sobrecarga repetitiva</option>
                <option value="Insidioso">Insidioso</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Tiempo de Evolución</label>
              <select value={evolucion} onChange={e => setEvolucion(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg">
                <option value="Agudo <6 sem">Agudo &lt;6 sem</option>
                <option value="Subagudo 6-12 sem">Subagudo 6-12 sem</option>
                <option value="Crónico >12 sem">Crónico &gt;12 sem</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Comportamiento 24h</label>
              <select value={comportamiento24h} onChange={e => setComportamiento24h(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg">
                <option value="">Seleccionar...</option>
                <option value="Rigidez matutina">Rigidez matutina</option>
                <option value="Dolor vespertino por fatiga">Dolor vespertino por fatiga</option>
                <option value="Dolor nocturno">Dolor nocturno</option>
                <option value="Variable">Variable</option>
              </select>
            </div>
          </div>
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Dolor Inicial (Escala Numérica 0-10)</label>
              <span className={`text-lg font-black ${dolorInicial >= 7 ? 'text-rose-600' : dolorInicial >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {dolorInicial}/10
              </span>
            </div>
            <input 
              type="range" min="0" max="10" step="1" 
              value={dolorInicial} 
              onChange={(e) => setDolorInicial(Number(e.target.value))} 
              className="w-full accent-blue-600 cursor-pointer" 
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
              <span>0 (Sin dolor)</span>
              <span>5 (Moderado)</span>
              <span>10 (Máximo)</span>
            </div>
          </div>
        </div>

        {/* Bloque 4 */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            4. Examen Físico Basal TMO (Hallazgos Articulares)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Juego Articular Accesorio (Joint Play)</label>
              <select value={juegoArticular} onChange={e => setJuegoArticular(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg">
                <option value="Hipomóvil Gr. 0-2">Hipomóvil Gr. 0-2</option>
                <option value="Normal Gr. 3">Normal Gr. 3</option>
                <option value="Hipermóvil Gr. 4-6">Hipermóvil Gr. 4-6</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Movilidad Activa (ROM)</label>
              <Input value={movilidad} onChange={e => setMovilidad(e.target.value)} placeholder="Ej: Limitación flexión lumbar a 50%" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Neurodinamia</label>
              <Input value={neurodinamia} onChange={e => setNeurodinamia(e.target.value)} placeholder="Ej: Slump (+) der, Lasègue (-)" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Otros Hallazgos (PGs, control motor)</label>
              <Input value={hallazgos} onChange={e => setHallazgos(e.target.value)} placeholder="Ej: PG activo en trapecio superior" />
            </div>
          </div>
        </div>

        {/* Bloque 5 */}
        <div className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            5. Diagnóstico Funcional TMO
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Hipótesis Diagnóstica Kinésica Integral</label>
              <Textarea value={diagnostico} onChange={e => setDiagnostico(e.target.value)} placeholder="Ej: Síndrome facetario lumbar L4-L5 derecho hipomóvil secundario a sedestación prolongada" className="min-h-[80px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Objetivos Terapéuticos</label>
              <Textarea value={objetivos} onChange={e => setObjetivos(e.target.value)} placeholder="Ej: Disminuir dolor, recuperar ROM lumbar, mejorar control motor core" className="min-h-[60px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Estimación de Alta Funcional</label>
              <select value={altaEstimada} onChange={e => setAltaEstimada(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white">
                <option value="1 a 3 sesiones">1 a 3 sesiones</option>
                <option value="4 a 6 sesiones">4 a 6 sesiones</option>
                <option value="6 a 10 sesiones">6 a 10 sesiones</option>
                <option value="Más de 10 sesiones">Más de 10 sesiones</option>
                <option value="Manejo crónico">Manejo crónico</option>
              </select>
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="bg-slate-50 border-t border-slate-200 mt-0">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
          {loading ? 'Guardando...' : '✓ Guardar Evaluación Inicial TMO'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
