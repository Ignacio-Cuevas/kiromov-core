const fs = require('fs');
let lines = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{abrirAssessmentModal && paciente && ('));
if (startIndex !== -1) {
  let endIndex = startIndex;
  while (!lines[endIndex].includes('/>')) {
    endIndex++;
  }
  endIndex += 2; // close ) and }
  // delete the lines
  lines.splice(startIndex, endIndex - startIndex);
}

// Now update onSuccess for InitialEvaluationModal
const onSuccessIndex = lines.findIndex(l => l.includes('onSuccess={async () => {'));
if (onSuccessIndex !== -1) {
  let endSuccessIndex = onSuccessIndex;
  while (!lines[endSuccessIndex].includes('}}')) {
    endSuccessIndex++;
  }
  
  const newOnSuccess = `          onSuccess={async (form: any) => {
            const supabaseClient = createClient();
            if (!supabaseClient) return;
            try {
              const payload = {
                paciente_id: paciente.id,
                segmento_evaluado: 'Columna / General',
                diagnostico_tmo: form.diagnostico_tmo_biomecanico,
                plan_tratamiento: form.objetivos_terapeuticos + '\\n\\n' + form.pronostico_sesiones,
                ...form
              };
              
              if (evaluacionInicialTMO?.id && modoEvaluacion === 'editar') {
                const { error } = await supabaseClient.from('evaluaciones_iniciales_tmo').update(payload).eq('id', evaluacionInicialTMO.id);
                if (error) throw error;
              } else {
                const { error } = await supabaseClient.from('evaluaciones_iniciales_tmo').insert([payload]);
                if (error) throw error;
              }
              
              toast.success('Evaluación Inicial guardada correctamente');
              setAbrirEvaluacionModal(false);
              await cargarDatos();
            } catch (error: any) {
              console.error(error);
              toast.error('Error al guardar: ' + error.message);
            }
          }}`;
          
  lines.splice(onSuccessIndex, endSuccessIndex - onSuccessIndex + 1, newOnSuccess);
}

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', lines.join('\n'));
