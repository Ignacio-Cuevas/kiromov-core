const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `const generarAnalisisPredictivo = (historialSOAP: any[]) => {`;
const newLogic = `const generarAnalisisPredictivo = (historialSOAP: any[], evaluacionInicial: any = null) => {`;
content = content.replace(oldLogic, newLogic);

const oldLogic2 = `  const s1 = notas[0];
  const sn = notas[notas.length - 1];

  const dolorInicial = Number(s1.nivel_dolor_ena) || 7;
  const dolorActual = Number(sn.nivel_dolor_ena) || 0;`;

const newLogic2 = `  const s1 = notas[0];
  const sn = notas[notas.length - 1];

  let dolorInicial = Number(s1.nivel_dolor_ena) || 7;
  if (evaluacionInicial) {
    const evaReal = Number(
        evaluacionInicial.anamnesis?.eva_dolor ??
        evaluacionInicial.anamnesis?.eva ??
        evaluacionInicial.anamnesis?.eva_inicial ??
        evaluacionInicial.anamnesis?.nivel_dolor ??
        evaluacionInicial.dolor_inicial_ena ??
        evaluacionInicial.eva ??
        dolorInicial
    );
    dolorInicial = evaReal;
  }
  
  const dolorActual = Number(sn.nivel_dolor_ena) || 0;`;

content = content.replace(oldLogic2, newLogic2);

const oldCall = `const analisis = generarAnalisisPredictivo(historialSOAP);`;
const newCall = `const analisis = generarAnalisisPredictivo(historialSOAP, evaluacionInicialTMO);`;
content = content.replace(oldCall, newCall);

fs.writeFileSync(file, content);
console.log('Fixed Predictivo');
