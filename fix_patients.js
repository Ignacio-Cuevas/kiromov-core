const fs = require('fs');
let content = fs.readFileSync('src/actions/patients.ts', 'utf-8');

// Remove fallback to patients in getPatients
content = content.replace(/\/\/ 4\. Fallback a tabla patients[\s\S]*?return \[\];/m, 'return [];');

// Remove insert to patients in createPatient
content = content.replace(/\/\/ 1\. Insertar en tabla patients[\s\S]*?\/\/ 2\. Insertar de forma estricta en tabla pacientes/m, '// 1. Insertar en tabla pacientes');
// Then the variables are `errPacientes` and `newPaciente`. It returns `data: newPatient`? No, let's see how createPatient is structured.
