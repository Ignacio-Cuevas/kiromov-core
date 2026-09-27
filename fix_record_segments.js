const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldIconCode = `{evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? '🦴' : 
                       evaluacionInicialTMO.segmento_evaluado === 'cervical' ? '🧠' : 
                       evaluacionInicialTMO.segmento_evaluado === 'hombro' ? '💪' : '➕'}`;

const newIconCode = `{evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? '🦴' : 
                       evaluacionInicialTMO.segmento_evaluado === 'cervical' ? '🧠' : 
                       evaluacionInicialTMO.segmento_evaluado === 'hombro' ? '💪' : 
                       evaluacionInicialTMO.segmento_evaluado === 'cadera' ? '🦵' : 
                       evaluacionInicialTMO.segmento_evaluado === 'rodilla' ? '🦵' : 
                       evaluacionInicialTMO.segmento_evaluado === 'tobillo_pie' ? '🦶' : '➕'}`;

content = content.replace(oldIconCode, newIconCode);

const oldLabelCode = `{evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? 'Columna Lumbar' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cervical' ? 'Columna Cervical' : 
                         evaluacionInicialTMO.segmento_evaluado === 'hombro' ? 'Hombro' : 'Evaluación General'}`;

const newLabelCode = `{evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? 'Columna Lumbar' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cervical' ? 'Columna Cervical' : 
                         evaluacionInicialTMO.segmento_evaluado === 'hombro' ? 'Hombro' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cadera' ? 'Cadera y Pelvis' : 
                         evaluacionInicialTMO.segmento_evaluado === 'rodilla' ? 'Rodilla' : 
                         evaluacionInicialTMO.segmento_evaluado === 'tobillo_pie' ? 'Tobillo y Pie' : 'Evaluación General'}`;

content = content.replace(oldLabelCode, newLabelCode);

fs.writeFileSync(filePath, content);
console.log('Fixed ClinicalRecordView segments!');
