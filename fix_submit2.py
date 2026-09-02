import re

with open('src/components/patients/SoapEvolutionForm.tsx', 'r') as f:
    content = f.read()

start = content.find('const handleSubmit = async (e: React.FormEvent) => {')
end = content.find('  return (', start)

replacement = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      toast.error("Error de conexión con la base de datos.");
      return;
    }

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

    try {
      const payload: any = {
        paciente_id: pacienteId,
        fecha: today,
        nivel_dolor_ena: parseInt(String(enaDolor), 10) || 0,
        s_subjetivo: subjetivo.trim() || "Sin observaciones subjetivas reportadas.",
        o_objetivo: objetivo.trim() || (selectedFindings.length > 0 ? selectedFindings.join(", ") : "Evaluación física sin hallazgos agudos."),
        a_analisis: analisis.trim() || `Evolución clínica favorable. Pronóstico estimado: ${pronosticoCalculado.sesiones}.`,
        p_plan: plan.trim() || "Continuar con plan terapéutico establecido.",
        pronostico_sesiones: String(pronosticoCalculado.sesiones || '').trim(),
        cuestionario_usado: cuestionario || null,
        discapacidad_funcional: String(discapacidadPct || '') || null,
        mapa_dolor: mapaDolor || null,
        profesional: "Klgo. Ignacio Cuevas Silva",
        hallazgos_frecuentes: selectedFindings
      };

      const { data, error } = await supabase
        .from('evoluciones_soap')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // Fallback robusto en caso de que las columnas legacy sigan siendo requeridas
        if (error.message.includes('column') || error.message.includes('type')) {
          console.warn('Fallback a schema alternativo de Supabase:', error.message);
          const numDiscapacidad = parseFloat(discapacidadPct);
          const legacyPayload: any = {
            paciente_id: pacienteId,
            fecha: today,
            ena_dolor: parseInt(String(enaDolor), 10) || 0,
            subjetivo: payload.s_subjetivo,
            objetivo: payload.o_objetivo,
            analisis: payload.a_analisis,
            plan: payload.p_plan,
            mapa_dolor_svg: payload.mapa_dolor,
            profesional: payload.profesional,
            hallazgos_frecuentes: payload.hallazgos_frecuentes,
            cuestionario_funcional: payload.cuestionario_usado,
            discapacidad_funcional_pct: !isNaN(numDiscapacidad) ? numDiscapacidad : null,
            pronostico_sesiones_estimadas: payload.pronostico_sesiones,
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
