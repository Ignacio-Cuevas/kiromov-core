import re

with open('src/components/patients/AttendanceHistoryTab.tsx', 'r') as f:
    content = f.read()
content = content.replace("""<div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3" />
        <p className="text-sm">Cargando historial de atenciones...</p>
      </div>""", """<div className="space-y-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100/50 rounded-xl animate-pulse w-full"></div>)}
      </div>""")
with open('src/components/patients/AttendanceHistoryTab.tsx', 'w') as f:
    f.write(content)


with open('src/components/patients/PlansHistoryTab.tsx', 'r') as f:
    content = f.read()
content = content.replace("""<div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3" />
        <p className="text-sm">Cargando historial de planes...</p>
      </div>""", """<div className="space-y-3 mt-4">
        {[1,2].map(i => <div key={i} className="h-28 bg-slate-100/50 rounded-2xl animate-pulse w-full"></div>)}
      </div>""")
with open('src/components/patients/PlansHistoryTab.tsx', 'w') as f:
    f.write(content)


with open('src/components/patients/SoapTimelineAccordion.tsx', 'r') as f:
    content = f.read()
content = content.replace("""<div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3" />
        <p className="text-xs">Cargando evoluciones previas...</p>
      </div>""", """<div className="space-y-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100/50 rounded-xl animate-pulse w-full"></div>)}
      </div>""")
with open('src/components/patients/SoapTimelineAccordion.tsx', 'w') as f:
    f.write(content)

