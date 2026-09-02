import re

with open('src/components/clinical/ReimbursementCertificate.tsx', 'r') as f:
    content = f.read()

# Update Membrete
old_membrete = """            {/* Membrete Institucional */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">KIROMOV CENTRO CLÍNICO</h1>
                <p className="text-xs text-slate-600 font-sans mt-0.5">Terapia Manual Ortopédica & Rehabilitación Funcional</p>
                <p className="text-[11px] text-slate-500 font-sans">Bulnes 470, Of. 75 (Edificio Aranjuez) • Chillán, Región de Ñuble</p>
              </div>
              <div className="text-right text-[11px] font-sans text-slate-500">
                <p>contacto@kiromov.cl</p>
                <p>+56 9 8276 2103</p>
                <p className="font-semibold text-slate-800 mt-1">Fecha Emisión: {new Date().toLocaleDateString('es-CL')}</p>
              </div>
            </div>"""

new_membrete = """            {/* Membrete Institucional */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
              <div className="flex items-center gap-4">
                {/* LOGO */}
                <img src="/logo.png" alt="Kiromov Logo" className="w-16 h-16 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans leading-none mb-1">KIROMOV CENTRO CLÍNICO</h1>
                  <p className="text-xs text-slate-600 font-sans">Terapia Manual Ortopédica & Rehabilitación Funcional</p>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">Bulnes 470, Of. 75, Edificio Aranjuez, Chillán</p>
                </div>
              </div>
              <div className="text-right text-[11px] font-sans text-slate-500">
                <p>Teléfono: +56 9 8276 2103</p>
                <p>contacto@kiromov.cl</p>
                <p className="font-semibold text-slate-800 mt-1">Fecha Emisión: {new Date().toLocaleDateString('es-CL')}</p>
              </div>
            </div>"""

content = content.replace(old_membrete, new_membrete)

old_pie = """            {/* Pie Legal y Firma */}
            <div className="mt-16 pt-6 flex justify-between items-end">
              <div className="text-[10px] text-slate-400 font-sans max-w-[250px] leading-tight">
                <p>Documento emitido en conformidad a la Ley N° 20.584 y D.S. N° 41/2012 del MINSAL.</p>
                <p className="mt-1">Válido para trámites de reembolso en Isapres, Fonasa y Seguros de Salud Complementarios.</p>
              </div>

              <div className="text-center font-sans">
                <div className="w-48 border-b border-slate-900 mb-1.5 mx-auto" />
                <p className="font-bold text-xs text-slate-900">Klgo. Ignacio Cuevas Silva</p>
                <p className="text-[11px] text-slate-600">Magíster en Terapia Manual Ortopédica</p>
                <p className="text-[10px] text-slate-500 font-mono">Registro SIS N° 396889</p>
              </div>
            </div>"""

new_pie = """            {/* Pie Legal y Firma */}
            <div className="mt-16 pt-6 flex justify-between items-end">
              <div className="text-[10px] text-slate-400 font-sans max-w-[250px] leading-tight">
                <p>Documento emitido en conformidad a la Ley N° 20.584 y D.S. N° 41/2012 del MINSAL.</p>
                <p className="mt-1">Válido para trámites de reembolso en Isapres, Fonasa y Seguros de Salud Complementarios.</p>
              </div>

              <div className="text-center font-sans relative">
                {/* Posible timbre de fondo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <img src="/logo.png" alt="" className="w-24 h-24 object-contain grayscale" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div className="w-56 border-b border-slate-900 mb-1.5 mx-auto relative z-10" />
                <p className="font-bold text-sm text-slate-900 relative z-10">Klgo. Ignacio Cuevas Silva</p>
                <p className="text-[11px] text-slate-600 font-medium relative z-10">Magíster en Terapia Manual Ortopédica (U. Andrés Bello)</p>
                <p className="text-[10px] text-slate-500 font-mono relative z-10">Registro de Prestadores Individuales de Salud SIS N° 396889</p>
              </div>
            </div>"""

content = content.replace(old_pie, new_pie)

with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
