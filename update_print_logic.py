import re

files_to_hide = [
    'src/app/agenda/page.tsx',
    'src/app/pacientes/page.tsx',
    'src/app/finanzas/page.tsx',
    'src/app/planes/page.tsx'
]

# 1. Add print:hidden to the main wrappers of all pages
for file in files_to_hide:
    with open(file, 'r') as f:
        content = f.read()
    
    # Normally `<main className="... space-y-8">`
    # Let's replace classNames safely
    content = re.sub(r'<main className="(.*?)"', lambda m: f'<main className="{m.group(1)} print:hidden"' if 'print:hidden' not in m.group(1) else m.group(0), content)
    
    with open(file, 'w') as f:
        f.write(content)
    print(f"Updated {file}")


# 2. Update ReimbursementCertificate
with open('src/components/clinical/ReimbursementCertificate.tsx', 'r') as f:
    content = f.read()

# Add getAssetUrl function at the top of component
helper_code = """
  // Helper robusto para obtener URLs públicas de Supabase Storage
  const obtenerUrlAsset = (nombrePrimario: string, nombreSecundario: string) => {
    if (!supabase) return '';
    const url1 = supabase.storage.from('branding').getPublicUrl(nombrePrimario).data?.publicUrl;
    const url2 = supabase.storage.from('branding').getPublicUrl(nombreSecundario).data?.publicUrl;
    return url1 || url2 || '';
  };
"""
# Insert after `const [planNombreEditable, setPlanNombreEditable] = useState('');`
content = re.sub(r'(const \[planNombreEditable, setPlanNombreEditable\] = useState\(\'\'\);)', r'\1\n' + helper_code, content)

# Replace logoUrl and timbreUrl
content = re.sub(r'const logoUrl = getStorageAssetUrl\(\'logo\.png\'\);', "const logoUrl = obtenerUrlAsset('logo.png', 'public:logo.png');", content)
content = re.sub(r'const timbreUrl = getStorageAssetUrl\(\'timbre\.png\'\);', "const timbreUrl = obtenerUrlAsset('timbre.png', 'public:timbre.png');", content)

# Remove old getStorageAssetUrl
content = re.sub(r'// Helper para obtener URLs.*?\}\;', '', content, flags=re.DOTALL)

# Update images tags
# LOGO
old_logo = r'<img\s*src="/branding/logo\.png"\s*alt="Kiromov Centro Clínico"\s*className="h-16 w-auto object-contain print:h-16".*?/>'
new_logo = """<img 
  src={logoUrl} 
  alt="Kiromov Centro Clínico" 
  className="h-16 w-auto object-contain print:h-16"
  crossOrigin="anonymous"
/>"""
content = re.sub(old_logo, new_logo, content, flags=re.DOTALL)

# TIMBRE
old_timbre = r'<img\s*src="/branding/timbre\.png"\s*alt="Timbre Profesional SIS N° 396889"\s*className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none".*?/>'
new_timbre = """<img 
  src={timbreUrl} 
  alt="Timbre Profesional SIS N° 396889" 
  className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none mx-auto"
  crossOrigin="anonymous"
/>"""
content = re.sub(old_timbre, new_timbre, content, flags=re.DOTALL)

# Change id to documento-imprimible
content = content.replace('id="documento-certificado"', 'id="documento-imprimible"')

# Replace style block
old_style_block = r'<style jsx global>\{`.*?`\}\}</style>'
new_style_block = """<style jsx global>{`
  @media print {
    /* 1. Ocultar fondo de pantalla y layouts */
    body * {
      visibility: hidden !important;
    }

    /* 2. Mostrar únicamente el certificado en la página 1 */
    #documento-imprimible,
    #documento-imprimible * {
      visibility: visible !important;
    }

    #documento-imprimible {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 8mm 12mm !important;
      box-shadow: none !important;
      border: none !important;
      background: white !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }

    /* Ajustes para inputs editables en impresion */
    #documento-imprimible input, #documento-imprimible textarea {
      border: none !important;
      background: transparent !important;
      resize: none !important;
    }

    @page {
      size: letter portrait;
      margin: 0;
    }
  }
`}</style>"""
content = re.sub(old_style_block, new_style_block, content, flags=re.DOTALL)

with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
print("Updated ReimbursementCertificate.tsx")
