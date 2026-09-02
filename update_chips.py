import re

with open('src/components/patients/SoapEvolutionForm.tsx', 'r') as f:
    content = f.read()

# 1. Update TECNICAS_TMO array
new_tecnicas = """const TECNICAS_TMO = [
  "⚡ Manipulación Articular (HVLA / Thrust)",
  "Movilización Articular (Grados I - IV)",
  "Terapia Miofascial y Puntos Gatillo",
  "Neurodinamia Clínica",
  "Ejercicio Terapéutico y Control Motor",
  "Reeducación Biomecánica y Estabilización"
];"""
content = re.sub(r'const TECNICAS_TMO = \[.*?\];', new_tecnicas, content, flags=re.DOTALL)

# 2. Update the payload concatenation
content = content.replace("composedPlan = `[Técnicas: ${tecnicasAplicadas.join(', ')}] ${composedPlan}`.trim();", "composedPlan = `[Intervención TMO: ${tecnicasAplicadas.join(' + ')}] ${composedPlan}`.trim();")

# 3. Update the button classes to what the user requested.
# I'll replace the className of the buttons in the mappings.
# Wait, let's just make the replacement for the three map functions.

# Button for Segmento
segmento_btn = r'className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all \$\{\n                          isSelected\n                            \? "bg-blue-600 text-white border-blue-600 shadow-sm"\n                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"\n                        \}`}'
new_btn = r'className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-blue-600 text-white font-semibold shadow-sm border-blue-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"}`}'

content = re.sub(segmento_btn, new_btn, content)

# Button for Mecanismo
mecanismo_btn = r'className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all \$\{\n                          isSelected\n                            \? "bg-rose-500 text-white border-rose-500 shadow-sm"\n                            : "bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50"\n                        \}`}'
content = re.sub(mecanismo_btn, new_btn, content)

# Button for Técnicas
tecnicas_btn = r'className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all \$\{\n                          isSelected\n                            \? "bg-emerald-600 text-white border-emerald-600 shadow-sm"\n                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"\n                        \}`}'
content = re.sub(tecnicas_btn, new_btn, content)


with open('src/components/patients/SoapEvolutionForm.tsx', 'w') as f:
    f.write(content)
