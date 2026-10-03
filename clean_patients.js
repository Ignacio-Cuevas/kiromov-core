const fs = require('fs');
let content = fs.readFileSync('src/actions/patients.ts', 'utf-8');

// getPatients
content = content.replace(/\/\/ 4\. Fallback a tabla patients[\s\S]*?return \[\];/m, 'return [];');

// createPatient
content = content.replace(/\/\/ 1\. Insertar en tabla patients[\s\S]*?const payloadPacientes = \{/m, 'const payloadPacientes = {');
content = content.replace(/id: newPatient\?\.id,/g, '');
content = content.replace(/const { error: errPacientes } = await supabase/m, 'const { data: newPaciente, error: errPacientes } = await supabase');
content = content.replace(/\.insert\(\[payloadPacientes\]\);/m, '.insert([payloadPacientes]).select().single();');
content = content.replace(/id: newPatient\?\.id \|\| 'pac-' \+ Date\.now\(\),/m, 'id: newPaciente?.id || \'pac-\' + Date.now(),');

// updatePatient
content = content.replace(/\/\/ 1\. Update patients[\s\S]*?\/\/ 2\. Update pacientes/m, '// 2. Update pacientes');
content = content.replace(/const { data: updated, error: errP } = await supabase[\s\S]*?\.single\(\);/m, '');
content = content.replace(/await supabase\.from\('pacientes'\)\.update\(payloadPacientes\)\.eq\('id', id\);/m, 'const { data: updated } = await supabase.from(\'pacientes\').update(payloadPacientes).eq(\'id\', id).select().single();');

// deletePatient
content = content.replace(/await supabase\.from\('patients'\)\.delete\(\)\.eq\('id', id\);/m, '');

fs.writeFileSync('src/actions/patients.ts', content);
