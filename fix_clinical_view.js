const fs = require('fs');

let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const updatedModals = `      {/* Agendar Próxima Cita */}
      {abrirAgendarModal && paciente && (
        <AppointmentModal
          isOpen={abrirAgendarModal}
          preselectedPatient={{
            id: paciente.id,
            nombre_completo: paciente.nombre_completo,
            rut: paciente.rut
          }}
          onClose={() => setAbrirAgendarModal(false)}
          onSuccess={async () => {
            setAbrirAgendarModal(false);
            await cargarDatos();
          }}
        />
      )}

      {/* Evaluación Inicial TMO */}
      {abrirEvaluacionModal && paciente && (
        <InitialEvaluationModal
          isOpen={abrirEvaluacionModal}
          paciente={paciente}
          evaluacionExistente={evaluacionInicialTMO}
          modo={modoEvaluacion}
          onClose={() => setAbrirEvaluacionModal(false)}
          onSuccess={async (form: any) => {
            const supabaseClient = createClient();
            if (!supabaseClient) return;
            try {
              // 1. Filtrar solo columnas válidas de la tabla evaluaciones_iniciales_tmo
              const payload = {
                paciente_id: paciente.id,
                
                // Anamnesis y trabajo
                puesto_trabajo_ergonomia: form.puesto_trabajo_ergonomia || null,
                habitos_actividad_fisica: form.habitos_actividad_fisica || null,
                cirugias_traumatismos: form.cirugias_traumatismos || null,
                farmacos_actuales: form.farmacos_actuales || null,
                banderas_rojas_alerta: form.banderas_rojas_alerta || null,
                apto_hvla: form.apto_hvla ?? true,

                // Síntoma
                motivo_consulta: form.motivo_consulta || paciente.motivo_consulta || null,
                inicio_sintoma_cronologia: form.inicio_sintoma_cronologia || null,
                tiempo_evolucion: form.tiempo_evolucion || 'Subagudo 6-12 sem',
                comportamiento_24h: form.comportamiento_24h || null,
                factores_agravantes_aliviantes: form.factores_agravantes_aliviantes || null,
                irritabilidad_tisular: form.irritabilidad_tisular || 'Moderada',
                dolor_inicial_ena: Number(form.dolor_inicial_ena) || 0,

                // Examen Físico
                inspeccion_postura: form.inspeccion_postura || null,
                movilidad_activa_rom: form.movilidad_activa_rom || null,
                juego_articular_joint_play: form.juego_articular_joint_play || 'Normal',
                neurodinamia_basal: form.neurodinamia_basal || null,
                pruebas_especiales_ortopedicas: form.pruebas_especiales_ortopedicas || null,
                pruebas_funcionales_control_motor: form.pruebas_funcionales_control_motor || null,
                hallazgos_relevantes: form.hallazgos_relevantes || null,

                // Diagnósticos Internacionales
                cie10_codigo: form.cie10_codigo || null,
                cie10_glosa: form.cie10_glosa || null,
                cie11_codigo: form.cie11_codigo || null,
                cie11_glosa: form.cie11_glosa || null,
                diagnostico_cif: form.diagnostico_cif || null,
                diagnostico_apta: form.diagnostico_apta || null,
                diagnostico_tmo_biomecanico: form.diagnostico_tmo_biomecanico || null,
                objetivos_terapeuticos: form.objetivos_terapeuticos || null,
                pronostico_sesiones: form.pronostico_sesiones || null,
                
                // Soporte Legacy (necesario por dependencias de type de la db)
                segmento_evaluado: 'Columna / General',
                diagnostico_tmo: form.diagnostico_tmo_biomecanico || null,
                plan_tratamiento: (form.objetivos_terapeuticos || '') + '\\n\\n' + (form.pronostico_sesiones || ''),
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
          }}
        />
      )}`;

const startRegex = /\{\/\* Agendar Próxima Cita \*\/\}/;
const endRegex = /<InitialEvaluationModal[\s\S]*?\/>\s*\n\s*\)\}/;

const startIndex = content.search(startRegex);
const endIndex = content.search(endRegex) + content.match(endRegex)[0].length;

const newContent = content.substring(0, startIndex) + updatedModals + content.substring(endIndex);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', newContent);
