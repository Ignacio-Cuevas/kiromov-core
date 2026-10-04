const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/InitialEvaluationModal.tsx', 'utf-8');

const updatedHandleGenerateAI = `
  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const payload = {
        ...form,
        pruebas_especiales_ortopedicas: getPruebasConcatenadas(),
        edad: paciente?.edad,
        sexo: paciente?.sexo,
      };
      
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        toast.error(data.error || 'Error al generar diagnóstico');
        return;
      }
      
      setForm((prev) => ({
        ...prev,
        cie10_codigo: data.cie10_codigo,
        cie10_glosa: data.cie10_glosa,
        cie11_codigo: data.cie11_codigo,
        cie11_glosa: data.cie11_glosa,
        diagnostico_cif: data.diagnostico_cif,
        diagnostico_apta: data.diagnostico_apta,
        diagnostico_tmo_biomecanico: data.diagnostico_tmo_biomecanico,
        objetivos_terapeuticos: data.objetivos_terapeuticos,
        pronostico_sesiones: data.pronostico_sesiones,
      }));
      setTab('diagnostico');
      toast.success('Análisis IA completado.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error de red al generar diagnóstico IA.');
    } finally {
      setLoadingAI(false);
    }
  };
`;

content = content.replace(/const handleGenerateAI = async \(\) => \{[\s\S]*?\} finally \{\s*setLoadingAI\(false\);\s*\}\s*\};/, updatedHandleGenerateAI.trim());

fs.writeFileSync('src/components/clinical/InitialEvaluationModal.tsx', content);
