"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PainScaleSelector } from "./PainScaleSelector";
import { SoapTimelineAccordion } from "./SoapTimelineAccordion";
import { EvolucionSOAP } from "@/types/database";
import { guardarEvolucionSOAP } from "@/lib/supabase";
import { toast } from "sonner";
import { Stethoscope, Save } from "lucide-react";

interface SoapEvolutionFormProps {
  pacienteId: string;
  pacienteNombre: string;
  onEvolutionSaved?: (newEvolution: EvolucionSOAP) => void;
  previousEvolutions?: EvolucionSOAP[];
  isLoadingEvolutions?: boolean;
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjetivo.trim() && !objetivo.trim() && !analisis.trim() && !plan.trim()) {
      toast.error("Por favor completa al menos un campo clínico para guardar la nota.");
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      const result = await guardarEvolucionSOAP({
        paciente_id: pacienteId,
        fecha: today,
        profesional: "Klgo. Ignacio Cuevas Silva",
        subjetivo: subjetivo.trim() || "Sin observaciones subjetivas reportadas.",
        objetivo: objetivo.trim() || "Evaluación física sin hallazgos agudos.",
        ena_dolor: enaDolor,
        analisis: analisis.trim() || "Evolución clínica favorable según objetivos.",
        plan: plan.trim() || "Continuar con plan terapéutico establecido.",
      });

      if (result.success && result.data) {
        toast.success("Evolución SOAP guardada con éxito", {
          description: `Registrada para ${pacienteNombre} por Klgo. Ignacio Cuevas Silva`,
        });

        // Reset form
        setSubjetivo("");
        setObjetivo("");
        setEnaDolor(3);
        setAnalisis("");
        setPlan("");

        onEvolutionSaved?.(result.data);
      } else {
        toast.error("Error al guardar la nota SOAP: " + (result.error || "Intente nuevamente"));
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado al guardar la nota clínica.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SOAP Form Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="rounded-lg bg-clinic-50 p-2 text-clinic-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Nueva Nota Clínica SOAP</h3>
              <p className="text-xs text-slate-500">
                Profesional a cargo: <strong>Klgo. Ignacio Cuevas Silva</strong>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* S - Subjetivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                S
              </span>
              Subjetivo (Relato del Paciente, Síntomas, Molestias)
            </label>
            <Textarea
              placeholder="Ej: Paciente refiere disminución del dolor lumbar matutino. Refiere ligera fatiga muscular tras caminata..."
              value={subjetivo}
              onChange={(e) => setSubjetivo(e.target.value)}
              rows={3}
              className="resize-none focus:border-clinic-500 focus:ring-clinic-500 text-sm"
            />
          </div>

          {/* O - Objetivo */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                  O
                </span>
                Objetivo (Examen Físico, ROM, Fuerza, Palpación)
              </label>
              <Textarea
                placeholder="Ej: ROM flexión de tronco 80°, Lasègue (-), palpación paravertebral L4-L5 sin contractura severa..."
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                rows={3}
                className="resize-none focus:border-clinic-500 focus:ring-clinic-500 text-sm"
              />
            </div>

            {/* Pain Scale Selector (ENA 0-10) */}
            <PainScaleSelector
              value={enaDolor}
              onChange={setEnaDolor}
              disabled={isSaving}
            />
          </div>

          {/* A - Análisis */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold">
                A
              </span>
              Análisis / Evaluación (Diagnóstico Funcional, Progreso)
            </label>
            <Textarea
              placeholder="Ej: Buena tolerancia a la carga progresiva. Desensibilización neural adecuada. Cumple objetivos de fase 2..."
              value={analisis}
              onChange={(e) => setAnalisis(e.target.value)}
              rows={2}
              className="resize-none focus:border-clinic-500 focus:ring-clinic-500 text-sm"
            />
          </div>

          {/* P - Plan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold">
                P
              </span>
              Plan de Tratamiento (Técnicas, Ejercicios en Casa, Próxima Cita)
            </label>
            <Textarea
              placeholder="Ej: Aumentar peso en ejercicio de peso muerto (12kg). Enviar video de pauta domiciliaria. Cita en 3 días..."
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={2}
              className="resize-none focus:border-clinic-500 focus:ring-clinic-500 text-sm"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-clinic-600 hover:bg-clinic-700 text-white font-semibold flex items-center gap-2 h-11 px-6 shadow-md shadow-clinic-600/20"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando Nota..." : "Guardar Nota Clínica"}
            </Button>
          </div>
        </form>
      </div>

      {/* Interactive Timeline Accordion of Previous Evolutions */}
      <SoapTimelineAccordion
        evoluciones={previousEvolutions}
        isLoading={isLoadingEvolutions}
      />
    </div>
  );
}
