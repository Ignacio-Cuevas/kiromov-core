const fs = require('fs');

let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const replacement = `diagnostico_tmo_biomecanico: form.diagnostico_tmo_biomecanico || null,\n                hipotesis_diagnostica_tmo: form.diagnostico_tmo_biomecanico || null,`;

content = content.replace(/diagnostico_tmo_biomecanico: form.diagnostico_tmo_biomecanico \|\| null,/g, replacement);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
