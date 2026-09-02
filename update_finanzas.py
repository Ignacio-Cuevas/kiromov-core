import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add citas state
if 'const [citas, setCitas] = useState<any[]>([]);' not in content:
    content = re.sub(r'const \[planes, setPlanes\] = useState<any\[\]>\(\[\]\);',
                     r'const [planes, setPlanes] = useState<any[]>([]);\n  const [citas, setCitas] = useState<any[]>([]);',
                     content)

# Add fetch for citas
old_fetch = r"const \{ data: eData \} = await supabase\.from\('egresos_caja'\)\.select\('\*'\)\.order\('fecha', \{ ascending: false \}\);"
new_fetch = """const { data: eData } = await supabase.from('egresos_caja').select('*').order('fecha', { ascending: false });
      const { data: citasData } = await supabase.from('citas_atenciones').select('*, pacientes(nombre_completo, rut)').in('estado', ['asistio', 'atendido']).order('fecha', { ascending: false }).limit(100);
      if (citasData) setCitas(citasData);"""
if 'citasData' not in content:
    content = re.sub(old_fetch, new_fetch, content)

# Change tabs names
# <button ... onClick={() => setActiveTab('ingresos')} ...>Ingresos ...
# Let's completely replace the tabs container
old_tabs = r'<div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">.*?</div>'
new_tabs = """<div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('asistio')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === 'asistio'
                  ? 'bg-blue-600 text-white shadow-blue-600/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              🗓️ Quién Asistió
            </button>
            <button
              onClick={() => setActiveTab('ingresos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === 'ingresos'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              💰 Quién Pagó
            </button>
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === 'pendientes'
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              ⚠️ Quién Debe
            </button>
            <button
              onClick={() => setActiveTab('egresos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === 'egresos'
                  ? 'bg-rose-500 text-white shadow-rose-500/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              📉 Egresos
            </button>
          </div>"""
content = re.sub(old_tabs, new_tabs, content, flags=re.DOTALL)

# Add Asistió table rendering
asistio_table = """
            {/* PESTAÑA: QUIÉN ASISTIÓ */}
            {activeTab === 'asistio' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Control de Asistencia
                  </h3>
                </div>
                {citas.length === 0 ? (
                  <p className="text-sm text-slate-400 py-12 text-center">No hay asistencias registradas recientes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/80 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Fecha / Hora</th>
                          <th className="py-3 px-4">Paciente</th>
                          <th className="py-3 px-4">RUT</th>
                          <th className="py-3 px-4">Tratamiento / Motivo</th>
                          <th className="py-3 px-4">Profesional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {citas.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-700 text-xs">{c.fecha} {c.hora?.slice(0,5)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{c.pacientes?.nombre_completo}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{c.pacientes?.rut || 'Sin RUT'}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">{c.motivo_consulta}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{c.profesional}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
"""

content = re.sub(r'(\{/\* PESTAÑA: INGRESOS \*/\})', asistio_table + r'\n            \1', content)

# Change settling modal state to use SettlePaymentModal instead of the inline Dialog
# Wait, let's keep the inline Dialog but fix its structure, or use SettlePaymentModal.
# Since I just created SettlePaymentModal, I should import and use it.
if 'SettlePaymentModal' not in content:
    content = re.sub(r'import \{ Suspense, useEffect, useState \} from "react";',
                     r'import { Suspense, useEffect, useState } from "react";\nimport { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";',
                     content)

    inline_modal_regex = r'<Dialog open=\{\!\!settlingPlan\}.*?</Dialog>'
    new_settle_modal = """<SettlePaymentModal 
        isOpen={!!settlingPlan} 
        onClose={() => setSettlingPlan(null)} 
        planEnUso={settlingPlan}
        onSuccess={() => { setSettlingPlan(null); loadData(); }}
      />"""
    content = re.sub(inline_modal_regex, new_settle_modal, content, flags=re.DOTALL)


with open(file_path, 'w') as f:
    f.write(content)

print("Finanzas page tabs fixed.")
