import re

with open('src/components/clinical/ReimbursementCertificate.tsx', 'r') as f:
    content = f.read()

# Replace Image src for Logo
old_logo = r'\{logoUrl && \(\s*<img\s*src=\{logoUrl\}\s*alt="Kiromov Centro Clínico"\s*className="h-16 w-auto object-contain print:h-16"\s*/>\s*\)\}'
new_logo = """<img 
  src="/branding/logo.png" 
  alt="Kiromov Centro Clínico" 
  className="h-16 w-auto object-contain print:h-16"
  onError={(e) => {
    (e.target as HTMLImageElement).src = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxlabwiewewwkwemtvfj.supabase.co'}/storage/v1/object/public/branding/logo.png`;
  }}
/>"""
content = re.sub(old_logo, new_logo, content)

# Replace Image src for Timbre
old_timbre = r'\{timbreUrl \?\s*\(\s*<img\s*src=\{timbreUrl\}\s*alt="Timbre Profesional SIS N° 396889"\s*className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none"\s*/>\s*\)\s*:\s*\(\s*<span className="text-\[11px\] text-slate-300 italic">Firma y Timbre</span>\s*\)\}'
new_timbre = """<img 
  src="/branding/timbre.png" 
  alt="Timbre Profesional SIS N° 396889" 
  className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none"
  onError={(e) => {
    (e.target as HTMLImageElement).src = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxlabwiewewwkwemtvfj.supabase.co'}/storage/v1/object/public/branding/timbre.png`;
  }}
/>"""
content = re.sub(old_timbre, new_timbre, content)

# Remove the old Supabase getPublicUrl helper and calls
content = re.sub(r'const getStorageAssetUrl.*?\};\n\n  const logoUrl.*?\n  const timbreUrl.*?\n', '', content, flags=re.DOTALL)

# Replace the style block
old_style_block = r'<style dangerouslySetInnerHTML=\{\{__html: `.*?`\}\} />'
new_style_block = """<style jsx global>{`
  @media print {
    /* 1. Resetear html y body */
    html, body {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* 2. Neutralizar el overlay fijo del modal para que no empuje el contenido a la página 2 */
    .fixed, 
    div[role="dialog"],
    .backdrop-blur-sm {
      position: static !important;
      background: none !important;
      backdrop-filter: none !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }

    /* 3. Ocultar todos los botones y barras de la web */
    header,
    nav,
    .print\\\\:hidden,
    button {
      display: none !important;
    }

    /* 4. Configurar el certificado para que inicie en el margen superior de la Página 1 */
    @page {
      size: letter portrait;
      margin: 10mm 15mm 10mm 15mm;
    }

    #documento-certificado {
      display: block !important;
      position: static !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }

    /* Ajustes para inputs editables en impresion */
    input, textarea {
      border: none !important;
      background: transparent !important;
      resize: none !important;
    }
  }
`}</style>"""

content = re.sub(old_style_block, new_style_block, content, flags=re.DOTALL)

with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)

