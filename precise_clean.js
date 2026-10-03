const fs = require('fs');
let lines = fs.readFileSync('src/actions/patients.ts', 'utf-8').split('\n');

// 1. getPatients fallback (around 114)
const fallbackStart = lines.findIndex(l => l.includes('// 4. Fallback a tabla patients'));
if (fallbackStart !== -1) {
  const catchIndex = lines.findIndex((l, i) => i > fallbackStart && l.includes('} catch (err: any) {'));
  lines.splice(fallbackStart, catchIndex - fallbackStart, '      return [];');
}

// 2. createPatient
const createPatientsStart = lines.findIndex(l => l.includes('// 1. Insertar en tabla patients'));
if (createPatientsStart !== -1) {
  const createPacientesStart = lines.findIndex((l, i) => i > createPatientsStart && l.includes('// 2. Insertar de forma estricta en tabla pacientes'));
  lines.splice(createPatientsStart, createPacientesStart - createPatientsStart, '      // 1. Insertar en tabla pacientes');
}

// Remove id references in createPatient
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id: newPatient?.id,')) {
    lines[i] = lines[i].replace('id: newPatient?.id,', '');
  }
  if (lines[i].includes('id: newPatient?.id ||')) {
    lines[i] = lines[i].replace('newPatient?.id', 'newPaciente?.id');
  }
  if (lines[i].includes('const { error: errPacientes } = await supabase')) {
    lines[i] = lines[i].replace('const { error: errPacientes } = await supabase', 'const { data: newPaciente, error: errPacientes } = await supabase');
  }
  if (lines[i].includes('.insert([payloadPacientes]);')) {
    lines[i] = lines[i].replace('.insert([payloadPacientes]);', '.insert([payloadPacientes]).select().single();');
  }
}

// 3. updatePatient
const updatePatientsStart = lines.findIndex(l => l.includes('// 1. Update patients'));
if (updatePatientsStart !== -1) {
  const updatePacientesStart = lines.findIndex((l, i) => i > updatePatientsStart && l.includes('// 2. Update pacientes'));
  lines.splice(updatePatientsStart, updatePacientesStart - updatePatientsStart, '      // 2. Update pacientes');
}

// Fix return data in updatePatient
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("await supabase.from('pacientes').update(payloadPacientes).eq('id', id);")) {
    lines[i] = lines[i].replace("await supabase.from('pacientes').update(payloadPacientes).eq('id', id);", "const { data: updated } = await supabase.from('pacientes').update(payloadPacientes).eq('id', id).select().single();");
  }
}

// 4. deletePatient
const deletePatientLine = lines.findIndex(l => l.includes("await supabase.from('patients').delete().eq('id', id);"));
if (deletePatientLine !== -1) {
  lines.splice(deletePatientLine, 1);
}

fs.writeFileSync('src/actions/patients.ts', lines.join('\n'));
