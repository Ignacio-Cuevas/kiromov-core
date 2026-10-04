const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

// 1. Fix the rendering condition
content = content.replace(
  /\{\(evaluacionInicialTMO\.cie10_codigo \|\| evaluacionInicialTMO\.cie11_codigo \|\| evaluacionInicialTMO\.diagnostico_cif\) && \(/g,
  '{evaluacionInicialTMO && (evaluacionInicialTMO?.cie10_codigo || evaluacionInicialTMO?.cie11_codigo || evaluacionInicialTMO?.diagnostico_cif) && ('
);

// 2. Fix property accesses inside the AI Coding block
content = content.replace(/evaluacionInicialTMO\.cie10_codigo/g, 'evaluacionInicialTMO?.cie10_codigo');
content = content.replace(/evaluacionInicialTMO\.cie10_glosa/g, 'evaluacionInicialTMO?.cie10_glosa');
content = content.replace(/evaluacionInicialTMO\.cie11_codigo/g, 'evaluacionInicialTMO?.cie11_codigo');
content = content.replace(/evaluacionInicialTMO\.cie11_glosa/g, 'evaluacionInicialTMO?.cie11_glosa');
content = content.replace(/evaluacionInicialTMO\.diagnostico_cif/g, 'evaluacionInicialTMO?.diagnostico_cif');
// Fix these generally in the whole file just to be safe
content = content.replace(/evaluacionInicialTMO\.fecha_evaluacion/g, 'evaluacionInicialTMO?.fecha_evaluacion');
content = content.replace(/evaluacionInicialTMO\.fecha/g, 'evaluacionInicialTMO?.fecha');
content = content.replace(/evaluacionInicialTMO\.kinesiologo/g, 'evaluacionInicialTMO?.kinesiologo');
content = content.replace(/evaluacionInicialTMO\.segmento_evaluado/g, 'evaluacionInicialTMO?.segmento_evaluado');

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
