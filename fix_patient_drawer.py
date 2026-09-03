import re

file_path = 'src/components/patients/PatientDrawer.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { ReimbursementCertificate } from \"@/components/clinical/ReimbursementCertificate\";",
    "import { ReimbursementCertificate } from \"@/components/clinical/ReimbursementCertificate\";\nimport { PassportModal } from \"@/components/clinical/PassportModal\";"
)

# 2. State
content = content.replace(
    "const [isCertificateOpen, setIsCertificateOpen] = useState(false);",
    "const [isCertificateOpen, setIsCertificateOpen] = useState(false);\n  const [isPassportOpen, setIsPassportOpen] = useState(false);"
)

# 3. Button
old_buttons = """                <button
                  type="button"
                  onClick={() => {
                    setSelectedBoletaForCert(activePlan?.numero_boleta || null);
                    setIsCertificateOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200 shadow-2xs"
                  title="Generar certificado médico para reembolso"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>📄 Certificado Reembolso</span>
                </button>"""
new_buttons = """                <button
                  type="button"
                  onClick={() => setIsPassportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200 shadow-2xs"
                  title="Pasaporte de Salud Articular (Alta)"
                >
                  <span>🏅 Pasaporte Salud</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBoletaForCert(activePlan?.numero_boleta || null);
                    setIsCertificateOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200 shadow-2xs"
                  title="Generar certificado médico para reembolso"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">📄 Certificado</span>
                </button>"""
content = content.replace(old_buttons, new_buttons)

# 4. Modal Render
old_render = """      <ReimbursementCertificate
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        paciente={currentPatient}
        plan={activePlan}
        boletaAbono={selectedBoletaForCert || ''}
        boletaLiquidacion={""}
        asistencias={citas.filter(c => ['asistio', 'atendido'].includes(c.estado?.toLowerCase() || ''))}
      />"""
new_render = """      <ReimbursementCertificate
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        paciente={currentPatient}
        plan={activePlan}
        boletaAbono={selectedBoletaForCert || ''}
        boletaLiquidacion={""}
        asistencias={citas.filter(c => ['asistio', 'atendido'].includes(c.estado?.toLowerCase() || ''))}
      />

      <PassportModal 
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        paciente={currentPatient}
        evoluciones={evoluciones}
        citasAsistidas={citas.filter(c => ['asistio', 'atendido'].includes(c.estado?.toLowerCase() || '')).length}
      />"""
content = content.replace(old_render, new_render)

with open('src/components/patients/PatientDrawer.tsx', 'w') as f:
    f.write(content)

print("PatientDrawer updated with PassportModal.")
