import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace the tabs
old_tabs = r'<div className="border-b border-slate-200/80 flex overflow-x-auto">.*?</div>'
new_tabs = """<div className="border-b border-slate-200/80 flex overflow-x-auto">
            <button onClick={() => setActiveTab('asistio')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'asistio' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>🗓️ Quién Asistió</button>
            <button onClick={() => setActiveTab('ingresos')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'ingresos' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>💰 Quién Pagó</button>
            <button onClick={() => setActiveTab('pendientes')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pendientes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>⚠️ Quién Debe {cuentasPendientes.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">{cuentasPendientes.length}</span>}</button>
            <button onClick={() => setActiveTab('egresos')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'egresos' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'}`}>📉 Egresos</button>
          </div>"""
content = re.sub(old_tabs, new_tabs, content, flags=re.DOTALL)

# Replace activeTab conditions
content = content.replace("activeTab === 'transacciones'", "activeTab === 'ingresos'")
content = content.replace("activeTab === 'por_cobrar'", "activeTab === 'pendientes'")


with open(file_path, 'w') as f:
    f.write(content)

print("Tabs fixed.")
