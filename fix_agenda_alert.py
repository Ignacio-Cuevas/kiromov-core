import re

file_path = 'src/app/agenda/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Import
content = content.replace(
    "import { markAppointmentAttended, markAppointmentNoShow } from '@/actions/appointments';", 
    "import { markAppointmentAttended, markAppointmentNoShow } from '@/actions/appointments';\nimport { requiereReevaluacion } from '@/lib/clinical';"
)

# 2. Add alert inside the Card Nivel 1
old_nivel1 = """          {/* Acciones de gestión a la derecha */}"""
new_nivel1 = """          {/* Alerta Clínica de Reevaluación */}
          {requiereReevaluacion(p) && (
            <div className="w-full mt-2 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <span className="text-amber-600 text-lg leading-none">⚠️</span>
              <p className="text-[11px] text-amber-800 font-medium">
                <strong className="font-bold">Alerta Clínica:</strong> Paciente en sesión {p.sesiones_usadas} con dolor persistente (ENA {p.ultimo_dolor_ena}/10). Considerar reevaluación biomecánica o cambio de técnica TMO.
              </p>
            </div>
          )}

          {/* Acciones de gestión a la derecha */}"""
content = content.replace(old_nivel1, new_nivel1)

with open('src/app/agenda/page.tsx', 'w') as f:
    f.write(content)

print("Agenda card alert added.")
