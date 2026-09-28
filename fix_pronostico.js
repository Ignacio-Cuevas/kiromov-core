const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldSig = `export const calcularPronosticoAltaClinica = (historialSOAP: any[]) => {`;
const newSig = `export const calcularPronosticoAltaClinica = (historialSOAP: any[], evaluacionInicial: any = null) => {`;
content = content.replace(oldSig, newSig);

const oldCall2 = `const analisis = calcularPronosticoAltaClinica(historialSOAP);`;
const newCall2 = `const analisis = calcularPronosticoAltaClinica(historialSOAP, evaluacionInicialTMO);`;
content = content.replace(oldCall2, newCall2);

fs.writeFileSync(file, content);
console.log('Fixed Pronostico');
