import re

with open('src/app/agenda/page.tsx', 'r') as f:
    content = f.read()

# Replace the non-compact return block inside renderCardCita
# Starts with `    return (\n      <div key={cita.id} className="flex flex-col md:flex-row bg-white`
# Ends before the `  const renderVista = () => {` or similar end of function block.

old_block = r"    return \(\s*<div key=\{cita\.id\} className=\"flex flex-col md:flex-row bg-white border border-slate-200/80 rounded-2xl hover:shadow-md transition-shadow overflow-hidden group mb-3\">.*?<\/div>\s*\);\s*\}"

new_block = """    return (
      <div key={cita.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors mb-3">
        {/* Nivel 1: Datos del Paciente, Horario y Acciones de Ficha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            {/* Hora destacada */}
            <span className="font-bold text-slate-900 text-base bg-slate-100 px-2.5 py-1 rounded-lg">
              {cita.hora?.slice(0, 5)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">{cita.pacientes?.nombre_completo || p.nombre_completo}</h4>
                {/* Badge de Estado */}
                {s === 'confirmada' && <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">✓ Confirmada</span>}
                {s === 'pendiente' && <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">⏳ Pendiente</span>}
                {['asistio', 'asistió', 'atendido'].includes(s) && <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Asistió</span>}
                {s === 'no_asistio' && <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">⚠️ No Asistió</span>}
                {s === 'cancelada' && <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full line-through">Cancelada</span>}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {formatRut(p.rut) || 'Sin RUT'} • <span className="font-sans italic">{cita.motivo_consulta || 'Sesión Kinésica'}</span>
              </p>
            </div>
          </div>

          {/* Acciones de gestión a la derecha */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => { setSelectedPatientForDrawer(p); setIsDrawerOpen(true); }}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              Ficha & SOAP →
            </button>
            <button onClick={() => {
              setEditingCita(cita);
              setEditForm({ fecha: cita.fecha, hora: cita.hora, motivo: cita.motivo_consulta || '', profesional: cita.profesional || '' });
            }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg" title="Editar horario">✏️</button>
            <button onClick={() => { setDeletingCita(cita); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg" title="Cancelar cita">🗑️</button>
          </div>
        </div>

        {/* Nivel 2: Botonera Operativa de Box (Con flex-wrap sin desbordes) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón WhatsApp */}
            {cleanPhone && (
              <a
                href={generarMensajeConfirmacion(cita)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                💬 Solicitar Confirmación
              </a>
            )}

            {/* Si está pendiente, opción de confirmar */}
            {s === 'pendiente' && (
              <button
                onClick={() => handleMarcarConfirmada(cita.id)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                ✓ Confirmar Cita
              </button>
            )}
          </div>

          {/* Acciones de Atención en Box */}
          <div className="flex flex-wrap items-center gap-2">
            {!['asistio', 'asistió', 'atendido', 'no_asistio'].includes(s) && s !== 'cancelada' && (
              <>
                <button
                  onClick={() => handleRegistrarAsistencia(cita.id, p.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                >
                  ✓ Registrar Asistencia
                </button>
                <button
                  onClick={() => handleRegistrarInasistencia(cita.id, p.id)}
                  className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
                >
                  🚫 No Asistió
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }"""
content = re.sub(old_block, new_block, content, flags=re.DOTALL)

with open('src/app/agenda/page.tsx', 'w') as f:
    f.write(content)

print("Agenda card refactored.")
