import re

# 1. Update src/app/agenda/page.tsx
with open('src/app/agenda/page.tsx', 'r') as f:
    content = f.read()

# Add state color
if "'no_asistio'" not in content:
    old_state = r"else if \(s === 'cancelada'\) \{ stateColors = 'bg-red-50 text-red-700 border-red-200 line-through'; stateLabel = 'Cancelada'; \}"
    new_state = """else if (s === 'cancelada') { stateColors = 'bg-red-50 text-red-700 border-red-200 line-through'; stateLabel = 'Cancelada'; }
    else if (s === 'no_asistio') { stateColors = 'bg-orange-50 text-orange-700 border-orange-200 font-bold'; stateLabel = '⚠️ Inasistencia'; }"""
    content = content.replace(old_state, new_state)

# Add markAppointmentNoShow import
if "markAppointmentNoShow" not in content:
    content = content.replace("import { markAppointmentAttended } from '@/actions/appointments';", "import { markAppointmentAttended, markAppointmentNoShow } from '@/actions/appointments';")

# Add handleRegistrarInasistencia
if "handleRegistrarInasistencia" not in content:
    handler = """  const handleRegistrarInasistencia = async (citaId: string, pacienteId: string) => {
    if (!confirm('¿Marcar como No Asistió? Se descontará 1 sesión del plan del paciente si aplica.')) return;
    const toastId = toast.loading('Registrando inasistencia...');
    try {
      const res = await markAppointmentNoShow(citaId, pacienteId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        loadAgenda();
      } else toast.error(res.error || 'Error', { id: toastId });
    } catch (err) { toast.error('Ocurrió un error inesperado', { id: toastId }); }
  };\n"""
    content = content.replace("const handleRegistrarAsistencia =", handler + "\n  const handleRegistrarAsistencia =")

# Add button in week/day view (Line ~313)
# {!['asistio', 'asistió', 'atendido'].includes(s) && s !== 'cancelada' && <button onClick={() => handleRegistrarAsistencia(cita.id, p.id)} ...
# I'll just regex replace it
old_btn = r"\{\!\['asistio', 'asistió', 'atendido'\]\.includes\(s\) \&\& s \!\=\= 'cancelada' \&\& <button onClick=\{\(\) => handleRegistrarAsistencia\(cita\.id, p\.id\)\} className=\"flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-\[9px\] font-bold py-1 rounded\">Asistió</button>\}"
new_btn = """{!['asistio', 'asistió', 'atendido', 'no_asistio'].includes(s) && s !== 'cancelada' && (
                      <>
                        <button onClick={() => handleRegistrarAsistencia(cita.id, p.id)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold py-1 rounded">Asistió</button>
                        <button onClick={() => handleRegistrarInasistencia(cita.id, p.id)} className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[9px] font-bold py-1 rounded" title="Cobrar Sesión">No Asis.</button>
                      </>
                    )}"""
content = re.sub(old_btn, new_btn, content)

# Add button in modal view (Line ~342)
old_modal_btn = r"\{\!\['asistio', 'asistió', 'atendido'\]\.includes\(s\) \&\& s \!\=\= 'cancelada' \&\& \(\s*<Button onClick=\{\(\) => handleRegistrarAsistencia\(cita\.id, p\.id\)\} className=\"bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0\">\s*<CheckCircle2 className=\"w-4 h-4 mr-1\.5\" /> Registrar Asistencia\s*</Button>\s*\)\}"
new_modal_btn = """{!['asistio', 'asistió', 'atendido', 'no_asistio'].includes(s) && s !== 'cancelada' && (
            <div className="flex gap-2">
              <Button onClick={() => handleRegistrarAsistencia(cita.id, p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Registrar Asistencia
              </Button>
              <Button onClick={() => handleRegistrarInasistencia(cita.id, p.id)} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold rounded-xl text-xs h-9 shadow-sm flex-shrink-0">
                🚫 No Asistió
              </Button>
            </div>
          )}"""
content = re.sub(old_modal_btn, new_modal_btn, content)

with open('src/app/agenda/page.tsx', 'w') as f:
    f.write(content)

print("Agenda updated.")

