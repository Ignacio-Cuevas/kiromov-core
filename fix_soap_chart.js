const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `    // 1. Punto 0: Dolor de Ingreso de la Evaluación Inicial TMO
    if (evaluacionInicialTMO && evaluacionInicialTMO.dolor_inicial_ena !== undefined && evaluacionInicialTMO.dolor_inicial_ena !== null) {
      puntos.push({
        id: 'eval-inicial',
        etiqueta: 'Ingreso',
        fecha: evaluacionInicialTMO.fecha_evaluacion || evaluacionInicialTMO.fecha,
        ena: Number(evaluacionInicialTMO.dolor_inicial_ena),
        esIngreso: true
      });
    }`;

const newLogic = `    // 1. Punto 0: Dolor de Ingreso de la Evaluación Inicial TMO
    if (evaluacionInicialTMO) {
      const evaIngreso = Number(
        evaluacionInicialTMO.anamnesis?.eva_dolor ??
        evaluacionInicialTMO.anamnesis?.eva ??
        evaluacionInicialTMO.anamnesis?.eva_inicial ??
        evaluacionInicialTMO.anamnesis?.nivel_dolor ??
        evaluacionInicialTMO.dolor_inicial_ena ??
        evaluacionInicialTMO.eva ??
        0
      );

      puntos.push({
        id: 'eval-inicial',
        etiqueta: 'Ingreso',
        fecha: evaluacionInicialTMO.fecha_evaluacion || evaluacionInicialTMO.fecha,
        ena: evaIngreso,
        esIngreso: true
      });
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
console.log('Fixed Graph Logic 1');
