const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const onSaveLogic = `onSave={async (form: any) => {
            const supabaseClient = createClient();
            try {
              const payload = {
                paciente_id: paciente.id,
                segmento_evaluado: 'Columna / General',
                diagnostico_tmo: form.diagnostico_tmo_biomecanico,
                plan_tratamiento: form.objetivos_terapeuticos + '\\n\\n' + form.pronostico_sesiones,
                ...form
              };
              
              if (evaluacionInicialTMO?.id) {
                const { error } = await supabaseClient.from('evaluaciones_iniciales_tmo').update(payload).eq('id', evaluacionInicialTMO.id);
                if (error) throw error;
              } else {
                const { error } = await supabaseClient.from('evaluaciones_iniciales_tmo').insert([payload]);
                if (error) throw error;
              }
              
              toast.success('Evaluación AI guardada correctamente');
              setAbrirAssessmentModal(false);
              await cargarDatos();
            } catch (error: any) {
              console.error(error);
              toast.error('Error al guardar: ' + error.message);
            }
          }}`;

content = content.replace(/onSave=\{async \(form: any\) => \{[\s\S]*?setAbrirAssessmentModal\(false\);\s*\}\}/, onSaveLogic);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
