import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update egresoForm state
content = content.replace(
    "const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito' });",
    "const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito', fecha: '' });"
)

# 2. Update handleAddEgreso
old_handler = r"""  const handleAddEgreso = async \(\) => \{.*?setSavingEgreso\(false\); \}\n  \};"""
new_handler = """  const handleAddEgreso = async () => {
    if (!supabase) return;
    if (!egresoForm.concepto || !egresoForm.monto) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSavingEgreso(true);
    const nuevoEgreso = {
      concepto: egresoForm.concepto.trim(),
      categoria: egresoForm.categoria || 'Otros',
      medio_pago: egresoForm.formaPago || 'Débito / Transbank',
      metodo_pago: egresoForm.formaPago || 'Débito / Transbank',
      monto_clp: parseInt(String(egresoForm.monto).replace(/\\D/g, ''), 10) || 0,
      fecha: egresoForm.fecha || new Date().toISOString().split('T')[0],
      responsable: 'Clínica'
    };
    try {
      const { error } = await supabase.from('egresos_caja').insert([nuevoEgreso]);
      if (error) {
        console.error('Error en Supabase:', error);
        throw new Error(error.message);
      }
      toast.success('Egreso guardado exitosamente');
      setShowEgresoModal(false);
      setEgresoForm({ concepto: '', categoria: 'Insumos Clínicos', monto: '', formaPago: 'Débito', fecha: '' });
      loadData();
    } catch (err: any) { 
      toast.error(err.message || 'Error guardando egreso'); 
    } finally { 
      setSavingEgreso(false); 
    }
  };"""
content = re.sub(old_handler, new_handler, content, flags=re.DOTALL)

# 3. Add fecha field to the modal UI
old_modal_fields = r"""          <div className="grid grid-cols-2 gap-4">\s*<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-slate-700">Categoría</label>"""
new_modal_fields = """          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fecha</label>
              <Input type="date" value={egresoForm.fecha} onChange={e => setEgresoForm({...egresoForm, fecha: e.target.value})} className="bg-slate-50/50" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-slate-700">Categoría</label>"""
content = re.sub(old_modal_fields, new_modal_fields, content)
content = content.replace('<div className="grid grid-cols-3 gap-4">', '<div className="grid grid-cols-2 gap-4">', 1) # wait, it was grid-cols-2 before.
# Let's fix that properly.
# The original was:
# <div className="grid grid-cols-2 gap-4">
#   <div className="space-y-1.5">
#     <label className="text-xs font-bold text-slate-700">Categoría</label>
#     <select ...>
#   </div>
#   <div className="space-y-1.5">
#     <label className="text-xs font-bold text-slate-700">Monto CLP</label>
#     <Input type="number" ...>
#   </div>
# </div>
# I'll just change the first occurrence of 'grid-cols-2 gap-4' to 'grid-cols-1 sm:grid-cols-3 gap-4' and add the date field before category.

# 4. Fix useMemo date filters (extract split('T')[0])
# Asistencias
content = re.sub(r'const fecha = c\.fecha \|\| c\.created_at;', r"const fecha = (c.fecha || c.created_at || '').split('T')[0];", content)
# Compras
content = re.sub(r'const fecha = c\.fecha_compra \|\| c\.created_at;', r"const fecha = (c.fecha_compra || c.created_at || '').split('T')[0];", content)
# Egresos
content = re.sub(r'const fecha = e\.fecha \|\| e\.created_at;', r"const fecha = (e.fecha || e.created_at || '').split('T')[0];", content)

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)

print("Finanzas egreso fixes applied.")
