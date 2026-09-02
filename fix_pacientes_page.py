import re

file_path = 'src/app/pacientes/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add state
if 'const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);' not in content:
    content = re.sub(r'const \[pacientes, setPacientes\] = useState<.*?>\(\[\]\);',
                     r'const [pacientes, setPacientes] = useState<any[]>([]);\n  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);',
                     content)

# Add import
if 'SaleModal' not in content:
    content = re.sub(r'import \{ PatientDrawer \} from "@/components/patients/PatientDrawer";',
                     r'import { PatientDrawer } from "@/components/patients/PatientDrawer";\nimport { SaleModal } from "@/components/sales/SaleModal";',
                     content)

# Replace Link
old_link = r'<Link\s+href="/agenda"\s+className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"\s*>\s*\+\s*Registrar Venta\s*</Link>'
new_button = """<button 
              onClick={() => setIsSaleModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              + Registrar Venta
            </button>"""
content = re.sub(old_link, new_button, content)

# Inject SaleModal component
if '<SaleModal' not in content:
    # insert before the closing </main> or </div> depending on the structure
    sale_modal = """
      <SaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={() => cargarPacientes()} 
      />
    """
    content = re.sub(r'(</main>)', sale_modal + r'\1', content)

with open(file_path, 'w') as f:
    f.write(content)

print("Pacientes page fixed.")
