import re

with open('src/components/patients/SoapEvolutionForm.tsx', 'r') as f:
    content = f.read()

# Remove PainMapCanvas import
content = re.sub(r'import { PainMapCanvas } from "./PainMapCanvas";\n', '', content)

# Remove mapaDolor state
content = re.sub(r'const \[mapaDolor, setMapaDolor\] = React.useState<string \| null>\(null\);\n', '', content)

# Define the new constants
new_constants = """const SEGMENTOS_ANATOMICOS = [
  "Cervical", "Dorsal", "Lumbopélvica", "Hombro", "Codo/Muñeca", "Cadera", "Rodilla", "Tobillo/Pie"
];

const MECANISMOS_DOLOR = [
  "Mecánico Articular", "Miofascial / Muscular", "Neuropático / Irradiado", "Post-quirúrgico"
];

const TECNICAS_TMO = [
  "Movilización Articular (Gr. I-IV)", "Terapia Miofascial", "Neurodinamia", "Ejercicio Terapéutico / Control Motor"
];
"""
content = re.sub(r'(const HALLAZGOS_DISPONIBLES)', new_constants + r'\n\1', content)

# Add new states
new_states = """  const [segmentosSeleccionados, setSegmentosSeleccionados] = React.useState<string[]>([]);
  const [mecanismoDolor, setMecanismoDolor] = React.useState<string>("");
  const [tecnicasAplicadas, setTecnicasAplicadas] = React.useState<string[]>([]);
"""
content = re.sub(r'(  const \[cuestionario, setCuestionario\])', new_states + r'\1', content)

# Toggle functions
toggle_funcs = """
  const toggleSegmento = (seg: string) => {
    setSegmentosSeleccionados(prev => prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]);
  };
  const toggleTecnica = (tec: string) => {
    setTecnicasAplicadas(prev => prev.includes(tec) ? prev.filter(t => t !== tec) : [...prev, tec]);
  };
"""
content = re.sub(r'(  // Alternar hallazgos rápidos \(Chips\))', toggle_funcs + r'\1', content)

# Update the condition in handleSubmit
content = content.replace('!mapaDolor', 'segmentosSeleccionados.length === 0')

# Rewrite the payload part
start_payload = content.find('    try {\n      const payload: any = {')
end_payload = content.find('      };\n\n      const { data, error }', start_payload)

new_payload_str = """    try {
      let composedObjetivo = objetivo.trim();
      let parts = [];
      if (segmentosSeleccionados.length > 0) parts.push(`[Segmento: ${segmentosSeleccionados.join(', ')}]`);
      if (mecanismoDolor) parts.push(`[Mecanismo: ${mecanismoDolor}]`);
      if (parts.length > 0) {
        composedObjetivo = `${parts.join(' ')} ${composedObjetivo}`.trim();
      }

      let composedPlan = plan.trim();
      if (tecnicasAplicadas.length > 0) {
        composedPlan = `[Técnicas: ${tecnicasAplicadas.join(', ')}] ${composedPlan}`.trim();
      }

      const payload: any = {
        paciente_id: pacienteId,
        fecha: today,
        nivel_dolor_ena: parseInt(String(enaDolor), 10) || 0,
        s_subjetivo: subjetivo.trim() || "Sin observaciones subjetivas reportadas.",
        o_objetivo: composedObjetivo || (selectedFindings.length > 0 ? selectedFindings.join(", ") : "Evaluación física sin hallazgos agudos."),
        a_analisis: analisis.trim() || `Evolución clínica favorable. Pronóstico estimado: ${pronosticoCalculado.sesiones}.`,
        p_plan: composedPlan || "Continuar con plan terapéutico establecido.",
        pronostico_sesiones: String(pronosticoCalculado.sesiones || '').trim(),
        cuestionario_usado: cuestionario || null,
        discapacidad_funcional: String(discapacidadPct || '') || null,
        mapa_dolor: null,
        profesional: "Klgo. Ignacio Cuevas Silva",
        hallazgos_frecuentes: selectedFindings
"""
content = content[:start_payload] + new_payload_str + content[end_payload:]

# Replace the Map section in UI
ui_start = content.find('{/* ========================================================= */}\n          {/* SECCIÓN B: MAPA DE DOLOR INTERACTIVO Y ENA */}')
ui_end = content.find('          {/* ========================================================= */}\n          {/* O - OBJETIVO + SECCIÓN A: HALLAZGOS CLÍNICOS RÁPIDOS */}')

new_ui = """{/* ========================================================= */}
          {/* SECCIÓN B: CLASIFICADOR CLÍNICO RÁPIDO & ENA */}
          {/* ========================================================= */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-600" />
                Clasificador Clínico Rápido y Escala ENA
              </label>
            </div>

            <div className="space-y-4">
              {/* Segmentos */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  1. Segmento Anatómico (Múltiple)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENTOS_ANATOMICOS.map((seg) => {
                    const isSelected = segmentosSeleccionados.includes(seg);
                    return (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => toggleSegmento(seg)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {seg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mecanismo */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  2. Mecanismo del Dolor (Único)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MECANISMOS_DOLOR.map((mec) => {
                    const isSelected = mecanismoDolor === mec;
                    return (
                      <button
                        key={mec}
                        type="button"
                        onClick={() => setMecanismoDolor(isSelected ? "" : mec)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          isSelected
                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                        }`}
                      >
                        {mec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Técnicas */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  3. Técnicas TMO Aplicadas Hoy (Múltiple)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TECNICAS_TMO.map((tec) => {
                    const isSelected = tecnicasAplicadas.includes(tec);
                    return (
                      <button
                        key={tec}
                        type="button"
                        onClick={() => toggleTecnica(tec)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        {tec}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pain Scale Selector (ENA 0-10) */}
            <div className="pt-2 border-t border-slate-200 mt-4">
              <PainScaleSelector
                value={enaDolor}
                onChange={setEnaDolor}
                disabled={isSaving}
              />
            </div>
          </div>

          """

content = content[:ui_start] + new_ui + content[ui_end:]

with open('src/components/patients/SoapEvolutionForm.tsx', 'w') as f:
    f.write(content)
