import re

with open('src/components/patients/SoapEvolutionForm.tsx', 'r') as f:
    content = f.read()

# Encontrar const handleSubmit = async (e: React.FormEvent) => { ... }
start = content.find('const handleSubmit = async (e: React.FormEvent) => {')
end = content.find('  return (', start)

replacement = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !subjetivo.trim() &&
      !objetivo.trim() &&
      !analisis.trim() &&
      !plan.trim() &&
      selectedFindings.length === 0 &&
      !mapaDolor
    ) {
      toast.error("Por favor completa al menos un campo clínico para guardar la nota.");
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const numDiscapacidad = parseFloat(discapacidadPct);

    try {
      const payload = {
        paciente_id: pacienteId,
        fecha: today,
        nivel_dolor_ena: Number(enaDolor) || 0,
        s_subjetivo: subjetivo.trim() || "Sin observaciones subjetivas reportadas.",
        o_objetivo: objetivo.trim() || (selectedFindings.length > 0 ? selectedFindings.join(", ") : "Evaluación física sin hallazgos agudos."),
        a_analisis: analisis.trim() || `Evolución clínica favorable. Pronóstico estimado: ${pronosticoCalculado.sesiones}.`,
        p_plan: plan.trim() || "Continuar con plan terapéutico establecido.",
        mapa_dolor: mapaDolor || null,
        profesional: "Klgo. Ignacio Cuevas Silva",
        hallazgos_frecuentes: selectedFindings,
        cuestionario_funcional: cuestionario || null,
        discapacidad_funcional_pct: !isNaN(numDiscapacidad) ? numDiscapacidad : null,
        pronostico_sesiones_estimadas: pronosticoCalculado.sesiones,
      };

      const { data, error } = await supabase
        .from('evoluciones_soap')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.message.includes('mapa_dolor')) {
          console.warn('Fallback a schema legacy (mapa_dolor_svg / subjetivo)');
          const legacyPayload = {
            paciente_id: pacienteId,
            fecha: today,
            ena_dolor: Number(enaDolor) || 0,
            subjetivo: payload.s_subjetivo,
            objetivo: payload.o_objetivo,
            analisis: payload.a_analisis,
            plan: payload.p_plan,
            mapa_dolor_svg: payload.mapa_dolor,
            profesional: "Klgo. Ignacio Cuevas Silva",
            hallazgos_frecuentes: selectedFindings,
            cuestionario_funcional: cuestionario || null,
            discapacidad_funcional_pct: !isNaN(numDiscapacidad) ? numDiscapacidad : null,
            pronostico_sesiones_estimadas: pronosticoCalculado.sesiones,
          };
          const res = await supabase.from('evoluciones_soap').insert([legacyPayload]).select().single();
          if (res.error) throw res.error;
          
          toast.success("Evolución clínica guardada exitosamente");
          if (onEvolutionSaved && res.data) onEvolutionSaved(res.data as any);
        } else {
          throw error;
        }
      } else {
        toast.success("Evolución clínica guardada exitosamente");
        if (onEvolutionSaved && data) onEvolutionSaved(data as any);
      }
    } catch (err: any) {
      console.error('Excepción al guardar SOAP:', err);
      toast.error(err.message || "Error al guardar la nota clínica");
    } finally {
      setIsSaving(false);
    }
  };

"""

new_content = content[:start] + replacement + content[end:]
with open('src/components/patients/SoapEvolutionForm.tsx', 'w') as f:
    f.write(new_content)
