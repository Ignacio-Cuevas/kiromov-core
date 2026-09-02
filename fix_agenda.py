import re

file_path = 'src/app/agenda/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

old_handle = r"const handleCreateCita = async \(\) => \{.*?finally \{ setSavingCita\(false\); \}\n  \};"

new_handle = """const handleCreateCita = async () => {
    if (!supabase) return;
    if (!newCita.pacienteId || !newCita.fecha || !newCita.hora) { toast.error('Completa los campos obligatorios'); return; }
    
    setSavingCita(true);
    try {
      const payload = {
         paciente_id: newCita.pacienteId,
         fecha: newCita.fecha, 
         hora: newCita.hora,
         profesional: newCita.profesional,
         motivo_consulta: newCita.motivo || 'Sesión de Tratamiento Kinésico',
         estado: 'pendiente'
      };

      const { data, error } = await supabase
         .from('citas_atenciones')
         .insert([payload])
         .select();

      if (error) {
         console.error('Error Supabase al agendar:', error);
         toast.error(`No se pudo agendar: ${error.message}`);
         return;
      }

      toast.success('¡Cita agendada exitosamente!');
      setShowNewCitaModal(false);
      loadAgenda();
    } catch (err: any) {
      console.error('Excepción al agendar:', err);
      toast.error(err.message || 'Error inesperado al agendar cita');
    } finally {
      setSavingCita(false); // Garantiza que el formulario nunca quede congelado
    }
  };"""

content = re.sub(old_handle, new_handle, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("Agenda page fixed.")
