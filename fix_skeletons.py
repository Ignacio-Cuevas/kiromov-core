import re

# PACIENTES
with open('src/app/pacientes/page.tsx', 'r') as f:
    content = f.read()

pacientes_loading = """<div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Cargando directorio clínico...</p>"""
pacientes_skeleton = """<div className="space-y-3 px-2">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                        ))}
                      </div>"""
content = content.replace(pacientes_loading, pacientes_skeleton)

with open('src/app/pacientes/page.tsx', 'w') as f:
    f.write(content)


# AGENDA
with open('src/app/agenda/page.tsx', 'r') as f:
    content = f.read()

agenda_loading = """<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-medium">Cargando agenda clínica...</p>"""
agenda_skeleton = """<div className="space-y-4 max-w-2xl mx-auto w-full">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse w-full"></div>
                  ))}
                </div>"""
content = content.replace(agenda_loading, agenda_skeleton)

with open('src/app/agenda/page.tsx', 'w') as f:
    f.write(content)


# FINANZAS
with open('src/app/finanzas/page.tsx', 'r') as f:
    content = f.read()

finanzas_loading = """<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-medium">Cargando registros...</p>"""
finanzas_skeleton = """<div className="space-y-3 w-full">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                  ))}
                </div>"""
content = content.replace(finanzas_loading, finanzas_skeleton)

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)


# PLANES
with open('src/app/planes/page.tsx', 'r') as f:
    content = f.read()

planes_loading = """<div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">
                Cargando catálogo de tarifas desde Supabase...
              </p>"""
planes_skeleton = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse w-full"></div>
                ))}
              </div>"""
content = content.replace(planes_loading, planes_skeleton)

with open('src/app/planes/page.tsx', 'w') as f:
    f.write(content)
