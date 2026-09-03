import re

file_path = 'src/components/patients/PatientDrawer.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add to the end before </>
injection = """
      {isPassportOpen && (
        <PassportModal 
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          paciente={currentPatient}
          evoluciones={evoluciones}
          citasAsistidas={citas.filter(c => ['asistio', 'atendido'].includes(c.estado?.toLowerCase() || '')).length}
        />
      )}
    </>
"""
content = content.replace("    </>\n  );\n}", injection + "  );\n}")

# Update button with console.log
old_btn = """                <button
                  type="button"
                  onClick={() => setIsPassportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200 shadow-2xs"
                  title="Pasaporte de Salud Articular (Alta)"
                >
                  <span>🏅 Pasaporte Salud</span>
                </button>"""
new_btn = """                <button
                  type="button"
                  onClick={() => {
                    console.log('Abriendo Pasaporte de Salud para:', currentPatient?.nombre_completo);
                    setIsPassportOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200 shadow-2xs"
                  title="Pasaporte de Salud Articular (Alta)"
                >
                  <span>🏅 Pasaporte Salud</span>
                </button>"""
content = content.replace(old_btn, new_btn)

with open('src/components/patients/PatientDrawer.tsx', 'w') as f:
    f.write(content)

print("PatientDrawer mount injected.")
