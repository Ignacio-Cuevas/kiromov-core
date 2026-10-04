const fs = require('fs');

let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

// 1. Remove duplicate import
c = c.replace(/import \{ ClinicalNavbar \} from '@\/components\/agenda\/ClinicalNavbar';\n/, '');

// 2. Remove duracion_minutos
c = c.replace(/const duracion = cita\.duracion_minutos \|\| 45;/, 'const duracion = 45;');

fs.writeFileSync('src/app/agenda/page.tsx', c);

