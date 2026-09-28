const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `<p className="text-sm font-medium text-slate-500">Evaluación Inicial — {evaluacionInicialTMO.fecha_evaluacion ? new Date(evaluacionInicialTMO.fecha_evaluacion + 'T12:00:00Z').toLocaleDateString('es-CL') : '-'}</p>`;

const newHeader = `<p className="text-sm font-medium text-slate-500">Evaluación Inicial — {evaluacionInicialTMO.fecha_evaluacion ? evaluacionInicialTMO.fecha_evaluacion.split('T')[0].split('-').reverse().join('/') : '-'}</p>`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(file, content);
console.log('Fixed ClinicalRecordView Date format safety');
