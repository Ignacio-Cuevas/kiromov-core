'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Phone, ShieldAlert, Activity, FileText, CheckCircle2, FileSignature, Save, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicalBoxSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  citaId: string;
  onSaved: () => void;
}

export function ClinicalBoxSuite({ isOpen, onClose, pacienteId, citaId, onSaved }: ClinicalBoxSuiteProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [paciente, setPaciente] = useState<any>(null);
  const [planActivo, setPlanActivo] = useState<any>(null);
  const [historialSOAP, setHistorialSOAP] = useState<any[]>([]);
  const [citaActual, setCitaActual] = useState<any>(null);

  // Formularios SOAP
  const [ena, setEna] = useState<number | null>(null);
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [tecnicas, setTecnicas] = useState<string[]>([]);
  const [s, setS] = useState('');
  const [o, setO] = useState('');
  const [a, setA] = useState('');
  const [p, setP] = useState('');

  const segmentosOptions = ['Cervical', 'Dorsal', 'Lumbopélvica', 'Hombro', 'Codo', 'Muñeca/Mano', 'Cadera', 'Rodilla', 'Tobillo/Pie', 'ATM'];
  const tecnicasOptions = ['⚡ Manipulación Articular (HVLA)', 'Movilización Gr. I-IV', 'Terapia Miofascial', 'Neurodinamia', 'Ejercicio Terapéutico', 'Punción Seca', 'Educación en Dolor'];

  useEffect(() => {
    if (!pacienteId) return;

    const cargarDatosCompletos = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        if (citaId) {
          const { data: c } = await supabase.from('citas_atenciones').select('*').eq('id', citaId).single();
          if (c) setCitaActual(c);
        }

        // 1. Datos personales del paciente
        const { data: p } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', pacienteId)
          .single();
        if (p) setPaciente(p);

        // 2. Plan activo real desde compras_planes
        const { data: plan } = await supabase
          .from('compras_planes')
          .select('*')
          .eq('paciente_id', pacienteId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (plan) setPlanActivo(plan);

        // 3. Historial de notas SOAP reales
        const { data: soaps, error: errorSoaps } = await supabase
          .from('evoluciones_soap')
          .select('*')
          .eq('paciente_id', pacienteId)
          .order('fecha', { ascending: false });

        if (errorSoaps) {
          console.error('Error al cargar evoluciones SOAP:', errorSoaps);
        } else if (soaps) {
          console.log('Notas SOAP cargadas:', soaps.length);
          setHistorialSOAP(soaps);
        }

      } catch (err) {
        console.error('Error cargando suite clínica:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      cargarDatosCompletos();
      // Limpiar formulario
      setEna(null);
      setSegmentos([]);
      setTecnicas([]);
      setS(''); setO(''); setA(''); setP('');
    }
  }, [isOpen, pacienteId, citaId]);

  const toggleArrayItem = (arr: string[], setArr: any, item: string) => {
    if (arr.includes(item)) setArr(arr.filter(i => i !== item));
    else setArr([...arr, item]);
  };

  const handleSaveSOAP = async () => {
    if (!supabase) return;
    if (!citaActual?.id) {
      toast.error('No hay una cita asociada para guardar el SOAP de hoy.');
      return;
    }
    
    setSaving(true);
    try {
      const notaFinal = `
**DOLOR (ENA):** ${ena !== null ? ena + '/10' : 'No registrado'}
**SEGMENTOS:** ${segmentos.length > 0 ? segmentos.join(', ') : 'No registrados'}
**TÉCNICAS TMO:** ${tecnicas.length > 0 ? tecnicas.join(', ') : 'No registradas'}

**S (Subjetivo):**
${s}

**O (Objetivo):**
${o}

**A (Análisis/Apreciación):**
${a}

**P (Plan):**
${p}
      `.trim();

      const { error } = await supabase
        .from('citas_atenciones')
        .update({
          nota_clinica: notaFinal,
          dolor_ena: ena
        })
        .eq('id', citaActual.id);

      if (error) throw error;
      
      // Update ultimo_dolor_ena in paciente
      if (ena !== null && paciente?.id) {
        await supabase.from('pacientes').update({ ultimo_dolor_ena: ena }).eq('id', paciente.id);
      }

      toast.success('Evolución clínica guardada exitosamente');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Error al guardar SOAP: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const curvaDolor = useMemo(() => {
    const records = [...historialSOAP].reverse().filter(h => h.dolor_ena !== null && h.dolor_ena !== undefined);
    if (records.length === 0) return { puntos: [], reduccion: 0 };
    
    const primerDolor = records[0].dolor_ena;
    const ultimoDolor = records[records.length - 1].dolor_ena;
    
    let reduccion = 0;
    if (primerDolor > 0) {
      reduccion = Math.round(((primerDolor - ultimoDolor) / primerDolor) * 100);
    }

    return {
      puntos: records.map((r, i) => ({ sesion: i + 1, dolor: r.dolor_ena, fecha: r.fecha })),
      reduccion
    };
  }, [historialSOAP]);

  if (!isOpen || !paciente) return null;

  const tienePlan = planActivo && planActivo.sesiones_totales > 0;
  const pct = tienePlan ? Math.min(100, Math.round(((planActivo.sesiones_usadas || 0) / (planActivo.sesiones_totales || 1)) * 100)) : 0;
  const debePago = planActivo?.estado_pago === 'pendiente';
  const cleanPhone = paciente.telefono ? paciente.telefono.replace(/\D/g, '').slice(-9) : '';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* BARRA SUPERIOR */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">{paciente.nombre_completo}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{paciente.rut || 'Sin RUT'}</p>
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <div className="flex flex-col">
            {tienePlan ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">{planActivo.nombre_plan || 'Plan Kinésico'}</span>
                  <span className="text-xs font-semibold text-slate-500">• {planActivo.sesiones_usadas}/{planActivo.sesiones_totales} ses. ({Math.max(0, planActivo.sesiones_totales - planActivo.sesiones_usadas)} restantes)</span>
                </div>
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-500 italic">Sin plan activo</span>
            )}
          </div>
          
          <div className="flex items-center ml-4">
            {debePago ? (
              <span className="bg-rose-50 border border-rose-200 text-rose-700 font-bold px-3 py-1 rounded-lg text-xs">
                🔴 Debe (${planActivo.monto_clp?.toLocaleString('es-CL')})
              </span>
            ) : (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-3 py-1 rounded-lg text-xs">
                ✓ Plan Pagado
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">
            <FileSignature className="w-4 h-4" /> Certificado Reembolso
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
            <X className="w-4 h-4" /> Volver a la Agenda
          </button>
        </div>
      </header>

      {/* CUERPO 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA IZQUIERDA (25%) */}
        <aside className="w-1/4 min-w-[280px] bg-white border-r border-slate-200 p-5 overflow-y-auto flex flex-col gap-6">
          
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Contexto del Paciente</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Teléfono / Contacto</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{paciente.telefono || 'Sin registro'}</p>
                </div>
                {cleanPhone && (
                  <a href={`https://wa.me/56${cleanPhone}`} target="_blank" rel="noreferrer" className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors">
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Previsión</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{paciente.prevision || 'Particular'}</p>
                </div>
              </div>
            </div>
          </div>

          {(paciente.alertas_seguridad || paciente.antecedentes_morbidos) && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 animate-in slide-in-from-left-4">
              <div className="flex items-center gap-2 mb-2 text-rose-700">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-bold text-sm">Alertas de Seguridad TMO</h4>
              </div>
              <p className="text-xs text-rose-800 font-medium">
                {paciente.alertas_seguridad || paciente.antecedentes_morbidos}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Motivo Inicial</h3>
            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-xs text-slate-700 italic">
              "{paciente.motivo_consulta || 'Dolor o disfunción a evaluar en la primera sesión.'}"
            </div>
          </div>
          
        </aside>

        {/* COLUMNA CENTRAL (50%) */}
        <main className="w-2/4 min-w-[500px] bg-slate-50/50 p-6 overflow-y-auto flex flex-col gap-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Evolución Clínica (SOAP)
            </h2>
            <span className="bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500">
              {citaActual?.fecha ? new Date(citaActual.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Hoy'}
            </span>
          </div>

          {/* Gráfica de Dolor Simulada */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curva ENA de Dolor (Histórica)</h3>
              {curvaDolor.puntos.length > 1 && curvaDolor.reduccion > 0 && (
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1">
                  📉 {curvaDolor.reduccion}% de reducción
                </span>
              )}
            </div>
            
            {curvaDolor.puntos.length === 0 ? (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs italic">
                Primera sesión (Aún sin datos históricos de dolor)
              </div>
            ) : (
              <div className="relative h-24 flex items-end gap-2 px-4 pb-6 pt-4 border-b border-l border-slate-200">
                {curvaDolor.puntos.map((p, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end relative group">
                    <span className="absolute -top-6 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">S{p.sesion}</span>
                    <div 
                      className={`w-full max-w-[24px] rounded-t-md transition-all duration-500 relative cursor-pointer ${
                        p.dolor > 7 ? 'bg-rose-400' : p.dolor > 4 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ height: `${(p.dolor / 10) * 100}%`, minHeight: '10%' }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-700 bg-white/80 px-1 rounded shadow-xs">{p.dolor}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario SOAP */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            
            <div className="p-5 border-b border-slate-100 space-y-5 bg-slate-50/30">
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Nivel de Dolor Hoy (ENA 0-10)</label>
                <div className="flex items-center gap-1">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => setEna(n)}
                      className={`flex-1 h-10 rounded-lg text-sm font-black transition-all border ${
                        ena === n 
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105 z-10' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Segmentos Tratados</label>
                <div className="flex flex-wrap gap-2">
                  {segmentosOptions.map(seg => (
                    <button
                      key={seg}
                      onClick={() => toggleArrayItem(segmentos, setSegmentos, seg)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        segmentos.includes(seg)
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Técnicas TMO Aplicadas</label>
                <div className="flex flex-wrap gap-2">
                  {tecnicasOptions.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleArrayItem(tecnicas, setTecnicas, t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        tecnicas.includes(t)
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center font-black">S</span>
                  Subjetivo (Relato)
                </label>
                <textarea 
                  value={s} onChange={e => setS(e.target.value)} 
                  className="w-full flex-1 min-h-[80px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="¿Cómo se siente hoy el paciente?"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">O</span>
                  Objetivo (Examen)
                </label>
                <textarea 
                  value={o} onChange={e => setO(e.target.value)} 
                  className="w-full flex-1 min-h-[80px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Hallazgos palpatorios, ROM, test especiales..."
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center font-black">A</span>
                  Análisis
                </label>
                <textarea 
                  value={a} onChange={e => setA(e.target.value)} 
                  className="w-full flex-1 min-h-[80px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  placeholder="Impresión clínica, cambios post-intervención..."
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center font-black">P</span>
                  Plan
                </label>
                <textarea 
                  value={p} onChange={e => setP(e.target.value)} 
                  className="w-full flex-1 min-h-[80px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Indicaciones para el hogar, próxima sesión..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={handleSaveSOAP}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all active:scale-[0.98]"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Evolución Clínica
              </button>
            </div>

          </div>

        </main>

        {/* COLUMNA DERECHA (25%) */}
        <aside className="w-1/4 min-w-[280px] bg-white border-l border-slate-200 p-5 overflow-y-auto">
          
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white py-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Timeline Histórico</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{historialSOAP.length} reg.</span>
          </div>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : historialSOAP.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400">Sin historial clínico previo</p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100">
              {historialSOAP.map((reg, idx) => (
                <div key={reg.id} className="relative pl-7">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-default group">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-500">
                        {new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {reg.dolor_ena !== null && (
                        <span className="bg-white border border-slate-200 text-[10px] font-black text-slate-700 px-1.5 py-0.5 rounded">
                          ENA {reg.dolor_ena}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-700 leading-relaxed max-h-24 overflow-hidden relative group-hover:max-h-[500px] transition-all duration-300 whitespace-pre-wrap">
                      {reg.nota_clinica}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent group-hover:opacity-0 transition-opacity"></div>
                    </div>
                    
                    <button className="text-[10px] font-bold text-blue-600 mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Leer más <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </aside>

      </div>
    </div>
  );
}
