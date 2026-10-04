const fs = require('fs');
let content = fs.readFileSync('src/app/api/ai/diagnose/route.ts', 'utf-8');

const aptaInstruction = `  "diagnostico_cif": "Diagnóstico kinésico según la CIF (OMS) abarcando: Deficiencias en Funciones Corporales (b), Estructuras (s), Limitación en Actividades (d) y Restricción en Participación laboral/recreativa (d).",
  "diagnostico_apta": "Diagnóstico del Sistema del Movimiento y Patrón de Práctica Preferida de la APTA (ej. Patrón 4F: Desórdenes espinales / Síndrome de alteración del movimiento de flexión-rotación lumbar).",`;

content = content.replace(/  "diagnostico_cif": "Diagnóstico kinésico según la CIF .*?(d)\.",/, aptaInstruction);

fs.writeFileSync('src/app/api/ai/diagnose/route.ts', content);
