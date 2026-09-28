const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `<h3 className="text-lg font-bold text-slate-800">
                        {evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? 'Columna Lumbar' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cervical' ? 'Columna Cervical' : 
                         evaluacionInicialTMO.segmento_evaluado === 'hombro' ? 'Hombro' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cadera' ? 'Cadera y Pelvis' : 
                         evaluacionInicialTMO.segmento_evaluado === 'rodilla' ? 'Rodilla' : 
                         evaluacionInicialTMO.segmento_evaluado === 'tobillo_pie' ? 'Tobillo y Pie' : 'Evaluación General'}
                      </h3>
                      <p className="text-sm text-slate-500">Fecha: {evaluacionInicialTMO.fecha_evaluacion}</p>`;

const newHeader = `<h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? 'Columna Lumbar' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cervical' ? 'Columna Cervical' : 
                         evaluacionInicialTMO.segmento_evaluado === 'hombro' ? 'Hombro' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cadera' ? 'Cadera y Pelvis' : 
                         evaluacionInicialTMO.segmento_evaluado === 'rodilla' ? 'Rodilla' : 
                         evaluacionInicialTMO.segmento_evaluado === 'tobillo_pie' ? 'Tobillo y Pie' : 'Evaluación General'}
                      </h3>
                      <p className="text-sm font-medium text-slate-500">Evaluación Inicial — {evaluacionInicialTMO.fecha_evaluacion ? new Date(evaluacionInicialTMO.fecha_evaluacion + 'T12:00:00Z').toLocaleDateString('es-CL') : '-'}</p>`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(file, content);
console.log('Fixed ClinicalRecordView Date format');
