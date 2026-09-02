import re

with open('src/components/clinical/ReimbursementCertificate.tsx', 'r') as f:
    content = f.read()

# Update Header
header_start = content.find('{/* Membrete Institucional */}')
header_end = content.find('{/* Título */}')

new_header = """{/* Encabezado con Logo */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                {/* Logo Oficial Kiromov */}
                <img 
                  src="/logo.png" 
                  alt="Kiromov Centro Clínico" 
                  className="h-14 w-auto object-contain print:h-14"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo.png';
                  }}
                />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans leading-none">KIROMOV CENTRO CLÍNICO</h1>
                  <p className="text-xs text-slate-700 font-sans font-medium mt-1">Terapia Manual Ortopédica & Rehabilitación Funcional</p>
                  <p className="text-[11px] text-slate-500 font-sans">Bulnes 470, Of. 75 (Edificio Aranjuez) • Chillán, Región de Ñuble</p>
                </div>
              </div>

              <div className="text-right text-[11px] font-sans text-slate-600">
                <p className="font-semibold text-slate-800">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')}</p>
                <p>contacto@kiromov.cl</p>
                <p>+56 9 8276 2103</p>
              </div>
            </div>

            """
content = content[:header_start] + new_header + content[header_end:]

# Update Footer
footer_start = content.find('{/* Pie Legal y Firma */}')
footer_end = content.find('</div>\n        )}\n      </div>')

new_footer = """{/* Sección de Cierre y Firma Profesional */}
            <div className="mt-14 pt-6 border-t border-slate-200 flex justify-between items-end break-inside-avoid">
              
              {/* Membrete legal institucional (Izquierda) */}
              <div className="text-[10px] text-slate-500 font-sans max-w-sm space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <img src="/logo.png" alt="Kiromov" className="h-6 w-auto opacity-80" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }} />
                  <span className="font-bold text-slate-700 text-xs tracking-wider">KIROMOV CENTRO CLÍNICO</span>
                </div>
                <p>Documento médico-legal emitido conforme a la Ley N° 20.584 y D.S. N° 41/2012 del MINSAL.</p>
                <p>Válido para trámites de reembolso en Isapres (Colmena, Banmédica, Consalud, CruzBlanca, Vida Tres), Fonasa y Seguros Complementarios de Salud.</p>
                <p className="font-mono text-slate-400">Bulnes 470, Of. 75, Chillán • Reg. Prestador Institucional SIS</p>
              </div>

              {/* Timbre y Firma del Profesional (Derecha) */}
              <div className="text-center font-sans">
                {/* Espacio para firma manuscrita / digital */}
                <div className="h-16 flex items-end justify-center mb-1">
                  <span className="text-[11px] text-slate-300 italic">Firma Profesional</span>
                </div>
                
                <div className="w-56 border-b-2 border-slate-900 mb-1.5 mx-auto" />
                
                {/* Membrete del Kinesiólogo Tratante */}
                <p className="font-bold text-xs text-slate-900 uppercase">Klgo. Ignacio Cuevas Silva</p>
                <p className="text-[11px] font-semibold text-blue-700">Magíster en Terapia Manual Ortopédica</p>
                <p className="text-[10px] text-slate-600">Universidad Andrés Bello</p>
                <p className="text-[11px] font-mono font-bold text-slate-800 mt-0.5">Registro SIS N° 396889</p>
                <p className="text-[10px] text-slate-500">Director Clínico — Kiromov Centro Clínico</p>
              </div>
            </div>
          """
content = content[:footer_start] + new_footer + content[footer_end:]

# Update @media print
css_start = content.find('<style dangerouslySetInnerHTML={{__html: `\n        @media print {')
css_end = content.find('`}} />')

new_css = """<style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .fixed.inset-0.z-\\[100\\] {
            position: absolute !important;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
          .fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-\\[100\\] * {
            visibility: visible;
          }
        }
      """
content = content[:css_start] + new_css + content[css_end:]

with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
