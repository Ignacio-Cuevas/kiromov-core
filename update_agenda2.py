import re

file_path = 'src/app/agenda/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add states for the new dialog
states_to_add = """  const [showNoSessionsAlert, setShowNoSessionsAlert] = useState<any>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [settlingPlan, setSettlingPlan] = useState<any>(null);
"""
if 'showNoSessionsAlert' not in content:
    content = re.sub(r'const \[deletingCita, setDeletingCita\] = useState<any>\(null\);\n',
                     r'const [deletingCita, setDeletingCita] = useState<any>(null);\n' + states_to_add,
                     content)

# 2. Add imports
if 'SaleModal' not in content:
    content = re.sub(r'import \{ X, CalendarClock, User, FileText, CheckCircle2, UserPlus, CreditCard, ChevronLeft, ChevronRight, Stethoscope, Search \} from "lucide-react";',
                     r'import { X, CalendarClock, User, FileText, CheckCircle2, UserPlus, CreditCard, ChevronLeft, ChevronRight, Stethoscope, Search } from "lucide-react";\nimport { SaleModal } from "@/components/sales/SaleModal";\nimport { SettlePaymentModal } from "@/components/sales/SettlePaymentModal";',
                     content)


# 3. Update handleRegistrarAsistencia
old_registrar = r"const handleRegistrarAsistencia = async \(citaId: string, pacienteId: string\) => \{.*?const res = await markAppointmentAttended\(citaId, pacienteId\);.*?if \(res\.success\) \{.*?toast\.success\(res\.message, \{ id: toastId \}\);.*?loadAgenda\(\);.*?\} else toast\.error\(res\.error \|\| 'Error', \{ id: toastId \}\);.*?\} catch \(err\) \{ toast\.error\('Ocurrió un error inesperado', \{ id: toastId \}\); \}\n  \};"
new_registrar = """const handleRegistrarAsistencia = async (citaId: string, pacienteId: string) => {
    const toastId = toast.loading('Registrando asistencia...');
    try {
      const res = await markAppointmentAttended(citaId, pacienteId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        loadAgenda();
        if (!res.discountedPlan) {
          setShowNoSessionsAlert({ pacienteId });
        }
      } else toast.error(res.error || 'Error', { id: toastId });
    } catch (err) { toast.error('Ocurrió un error inesperado', { id: toastId }); }
  };"""

content = re.sub(old_registrar, new_registrar, content, flags=re.DOTALL)

# 4. Inject Dialog and modals at the end of return inside <main>
dialogs = """
      <Dialog open={!!showNoSessionsAlert} onOpenChange={(open) => !open && setShowNoSessionsAlert(null)}>
        <DialogHeader>
          <DialogTitle className="text-amber-600">Sesiones Agotadas / Sin Plan</DialogTitle>
          <DialogDescription>
            El paciente ha completado sus sesiones o no tiene un plan activo.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-4">
          <p className="text-sm font-medium text-slate-700 text-center">
            ¿Deseas Asignar un Nuevo Plan / Venta o tienes un Cobro Pendiente que registrar?
          </p>
        </DialogBody>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowNoSessionsAlert(null)}>Cerrar</Button>
          <Button onClick={() => { setIsSaleModalOpen(true); setShowNoSessionsAlert(null); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto">
            + Asignar Nuevo Plan / Venta
          </Button>
          {/* Oculto cobrar directamente aquí porque SettlePaymentModal necesita un plan en uso, pero al menos le damos la opción de venta. */}
        </DialogFooter>
      </Dialog>

      <SaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={() => loadAgenda()} 
      />
"""

content = re.sub(r'(</main>)', dialogs + r'\1', content)

with open(file_path, 'w') as f:
    f.write(content)

print("Agenda updated with Post-Atención flow.")
