"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PainScaleSelector } from "./PainScaleSelector";
import { PainMapCanvas } from "./PainMapCanvas";
import { EvolucionSOAP } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Stethoscope,
  Save,
  Activity,
  CheckCircle2,
  Sparkles,
  Layers,
  FileCheck2,
  HelpCircle,
} from "lucide-react";

interface SoapEvolutionFormProps {
  pacienteId: string;
  pacienteNombre: string;
  onEvolutionSaved?: (newEvolution: EvolucionSOAP) => void;
  previousEvolutions?: EvolucionSOAP[];
  isLoadingEvolutions?: boolean;
}

const HALLAZGOS_DISPONIBLES = [
  "Hipomovilidad cervical",
  "Hipomovilidad dorsal",
  "Hipomovilidad lumbar",
  "Inestabilidad cervical",
  "Inestabilidad lumbar",
  "Conflicto de espacio articular",
  "Hiperactividad muscular",
  "Puntos gatillo activos",
  "Neurodinamia positiva",
];

const CUESTIONARIOS_DISPONIBLES = [
  { id: "NDI", label: "NDI (Neck Disability Index - Columna Cervical)" },
  { id: "ODI", label: "ODI (Oswestry Disability Index - Columna Lumbar)" },
  { id: "QuickDASH", label: "QuickDASH (Extremidad Superior / Hombro)" },
  { id: "LEFS", label: "LEFS (Lower Extremity Functional Scale - Rodilla/Tobillo)" },
  { id: "Roland-Morris", label: "Roland-Morris (Incapacidad Lumbar)" },
];

export function SoapEvolutionForm({
  pacienteId,
  pacienteNombre,
  onEvolutionSaved,
  previousEvolutions = [],
  isLoadingEvolutions = false,
}: SoapEvolutionFormProps) {
  const [subjetivo, setSubjetivo] = React.useState("");
  const [objetivo, setObjetivo] = React.useState("");
  const [enaDolor, setEnaDolor] = React.useState<number>(3);
  const [analisis, setAnalisis] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Nuevos estados clínicos avanzados
  const [selectedFindings, setSelectedFindings] = React.useState<string[]>([]);
  const [mapaDolor, setMapaDolor] = React.useState<string | null>(null);
  const [cuestionario, setCuestionario] = React.useState<string>("");
  const [discapacidadPct, setDiscapacidadPct] = React.useState<string>("");

  // Alternar hallazgos rápidos (Chips)
  const toggleFinding = (finding: string) => {
    setSelectedFindings((prev) => {
      const exists = prev.includes(finding);
      let nextFindings: string[];
      if (exists) {
        nextFindings = prev.filter((f) => f !== finding);
      } else {
        nextFindings = [...prev, finding];
      }

      // Si se agrega el hallazgo y no está en objetivo, sugerirlo en el texto
      if (!exists) {
        setObjetivo((prevObj) => {
          const prefix = prevObj.trim() ? prevObj.trim() + "\n" : "";
          if (!prevObj.includes(finding)) {
            return `${prefix}• ${finding}`;
          }
          return prevObj;
        });
      }

      return nextFindings;
    });
  };

  // Motor de cálculo de Pronóstico de Alta Funcional
  const pronosticoCalculado = React.useMemo(() => {
    const numPct = parseFloat(discapacidadPct);
    const hasScore = !isNaN(numPct) && discapacidadPct.trim() !== "";
    const pct = hasScore ? numPct : 25; // Default razonable si no ingresa porcentaje

    if (pct < 20 && enaDolor <= 4) {
      return {
        sesiones: "2 a 4 sesiones",
        plan: "Plan Promo 2x / Mantenimiento Funcional",
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: "🟢",
        justificacion: "Baja incapacidad funcional y dolor leve-moderado con rápida respuesta esperada a terapia manual y ejercicio.",
      };
    } else if (pct <= 40 && enaDolor <= 7) {
      return {
        sesiones: "4 a 6 sesiones",
        plan: "Plan Activa Care / Pro Care",
        badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
        icon: "🔵",
        justificacion: "Incapacidad moderada y compromiso mecánico activo; requiere reacondicionamiento motor y terapia ortopédica.",
      };
    } else {
      return {
        sesiones: "8 a 10 sesiones",
        plan: "Plan Rehabilitación Integral",
        badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
        icon: "🟣",
        justificacion: "Alta discapacidad funcional o dolor severo; requiere abordaje multimodal por fases progresivas de carga.",
      };
    }
  }, [discapacidadPct, enaDolor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      toast.error("Error de conexión con la base de datos.");
      return;
    }

    if (
      !subjetivo.trim() &&
      !objetivo.trim() &&
      !analisis.trim() &&
      !plan.trim() &&
      selectedFindings.length === 0 &&
      !mapaDolor
    ) {
      toast.error("Por favor completa al menos un campo clínico para guardar la nota.");
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const numDiscapacidad = parseFloat(discapacidadPct);

    try {
      const payload = {
        paciente_id: pacienteId,
        fecha: today,
        nivel_dolor_ena: Number(enaDolor) || 0,
        s_subjetivo: subjetivo.trim() || "Sin observaciones subjetivas reportadas.",
        o_objetivo: objetivo.trim() || (selectedFindings.length > 0 ? selectedFindings.join(", ") : "Evaluación física sin hallazgos agudos."),
        a_analisis: analisis.trim() || `Evolución clínica favorable. Pronóstico estimado: ${pronosticoCalculado.sesiones}.`,
        p_plan: plan.trim() || "Continuar con plan terapéutico establecido.",
        mapa_dolor: mapaDolor || null,
        profesional: "Klgo. Ignacio Cuevas Silva",
        hallazgos_frecuentes: selectedFindings,
        cuestionario_funcional: cuestionario || null,
        discapacidad_funcional_pct: !isNaN(numDiscapacidad) ? numDiscapacidad : null,
        pronostico_sesiones_estimadas: pronosticoCalculado.sesiones,
      };

      const { data, error } = await supabase
        .from('evoluciones_soap')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.message.includes('mapa_dolor')) {
          console.warn('Fallback a schema legacy (mapa_dolor_svg / subjetivo)');
          const legacyPayload = {
            paciente_id: pacienteId,
            fecha: today,
            ena_dolor: Number(enaDolor) || 0,
            subjetivo: payload.s_subjetivo,
            objetivo: payload.o_objetivo,
            analisis: payload.a_analisis,
            plan: payload.p_plan,
            mapa_dolor_svg: payload.mapa_dolor,
            profesional: "Klgo. Ignacio Cuevas Silva",
            hallazgos_frecuentes: selectedFindings,
            cuestionario_funcional: cuestionario || null,
            discapacidad_funcional_pct: !isNaN(numDiscapacidad) ? numDiscapacidad : null,
            pronostico_sesiones_estimadas: pronosticoCalculado.sesiones,
          };
          const res = await supabase.from('evoluciones_soap').insert([legacyPayload]).select().single();
          if (res.error) throw res.error;
          
          toast.success("Evolución clínica guardada exitosamente");
          if (onEvolutionSaved && res.data) onEvolutionSaved(res.data as any);
        } else {
          throw error;
        }
      } else {
        toast.success("Evolución clínica guardada exitosamente");
        if (onEvolutionSaved && data) onEvolutionSaved(data as any);
      }
    } catch (err: any) {
      console.error('Excepción al guardar SOAP:', err);
      toast.error(err.message || "Error al guardar la nota clínica");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SOAP Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-slate-800">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Nueva Nota Clínica SOAP</h3>
              <p className="text-xs text-slate-500">
                Profesional a cargo: <strong>Klgo. Ignacio Cuevas Silva</strong> (TMO)
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ========================================================= */}
          {/* S - SUBJETIVO */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                S
              </span>
              Subjetivo (Relato del Paciente, Síntomas, Mecanismo)
            </label>
            <Textarea
              placeholder="Ej: Paciente refiere alivio tras última sesión. Dolor matutino disminuye a EVA 2. Refiere molestia al final del rango de flexión..."
              value={subjetivo}
              onChange={(e) => setSubjetivo(e.target.value)}
              rows={2}
              className="resize-none focus:border-blue-500 focus:ring-blue-500 text-sm rounded-xl"
            />
          </div>

          {/* ========================================================= */}
          {/* SECCIÓN B: MAPA DE DOLOR INTERACTIVO Y ENA */}
          {/* ========================================================= */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-600" />
                Mapa de Dolor Anatómico (Anterior / Posterior) & Escala ENA
              </label>
              <span className="text-[11px] text-slate-400">Puntos gatillo / Zonas irradiadas</span>
            </div>

            <PainMapCanvas
              value={mapaDolor}
              onChange={setMapaDolor}
            />

            {/* Pain Scale Selector (ENA 0-10) */}
            <PainScaleSelector
              value={enaDolor}
              onChange={setEnaDolor}
              disabled={isSaving}
            />
          </div>

          {/* ========================================================= */}
          {/* O - OBJETIVO + SECCIÓN A: HALLAZGOS CLÍNICOS RÁPIDOS */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                  O
                </span>
                Objetivo (Examen Físico, ROM, Tests Ortopédicos, Palpación)
              </label>

              {/* Botones de Selección Rápida de Hallazgos */}
              <div className="space-y-1.5 pt-1 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  ⚡ Hallazgos Frecuentes TMO (Selección Rápida):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {HALLAZGOS_DISPONIBLES.map((finding) => {
                    const isSelected = selectedFindings.includes(finding);
                    return (
                      <button
                        key={finding}
                        type="button"
                        onClick={() => toggleFinding(finding)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all flex items-center gap-1 shadow-2xs ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-slate-400">+</span>}
                        <span>{finding}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Textarea
                placeholder="Ej: ROM flexión de tronco 85°, test de Lasègue bilateral (-), palpación paravertebral L4-L5 con hiperactividad moderada..."
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                rows={3}
                className="resize-none focus:border-emerald-500 focus:ring-emerald-500 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECCIÓN C: CUESTIONARIO Y PRONÓSTICO DE ALTA */}
          {/* ========================================================= */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-blue-600" />
                Cuestionario Funcional & Calculadora de Pronóstico
              </label>
              <span className="text-[11px] font-semibold text-blue-600">Estimación de Alta</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Selector de Cuestionario */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  Escala / Cuestionario
                </label>
                <select
                  value={cuestionario}
                  onChange={(e) => setCuestionario(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-medium bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="">-- Seleccionar Cuestionario (Opcional) --</option>
                  {CUESTIONARIOS_DISPONIBLES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Porcentaje de Discapacidad */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  Discapacidad (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={discapacidadPct}
                    onChange={(e) => setDiscapacidadPct(e.target.value)}
                    className="w-full h-9 pl-3 pr-7 text-xs font-bold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Dinámica de Pronóstico */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${pronosticoCalculado.badgeColor}`}>
              <span className="text-base leading-none">{pronosticoCalculado.icon}</span>
              <div className="space-y-0.5 flex-1">
                <div className="font-extrabold flex flex-wrap items-center gap-1.5">
                  <span>Pronóstico Clínico Estimado:</span>
                  <span className="underline decoration-2">{pronosticoCalculado.sesiones} para el alta funcional</span>
                  <span className="font-semibold opacity-80">({pronosticoCalculado.plan})</span>
                </div>
                <p className="text-[11px] opacity-90 leading-tight">
                  {pronosticoCalculado.justificacion}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* A - ANÁLISIS */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold">
                A
              </span>
              Análisis / Evaluación (Razonamiento Clínico, Tolerancia a Carga)
            </label>
            <Textarea
              placeholder="Ej: Adecuada respuesta analgésica a técnicas de movilización articular grado III. Progresión favorable en tolerancia a la carga axial..."
              value={analisis}
              onChange={(e) => setAnalisis(e.target.value)}
              rows={2}
              className="resize-none focus:border-amber-500 focus:ring-amber-500 text-sm rounded-xl"
            />
          </div>

          {/* ========================================================= */}
          {/* P - PLAN */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold">
                P
              </span>
              Plan de Tratamiento (Técnicas, Ejercicios en Casa, Siguiente Cita)
            </label>
            <Textarea
              placeholder="Ej: Terapia manual ortopédica + neurodinamia de extremidad superior. Pauta domiciliaria de control motor. Próxima sesión en 48 hrs..."
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={2}
              className="resize-none focus:border-purple-500 focus:ring-purple-500 text-sm rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 h-11 px-7 rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01]"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando Nota..." : "Guardar Nota Clínica"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SoapEvolutionForm;
