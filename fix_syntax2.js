const fs = require('fs');
let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');
c = c.replace(/onDesbloquear=\{handleDesbloquearDirecto\}\n\s*\}\}/g, 'onDesbloquear={handleDesbloquearDirecto}');
fs.writeFileSync('src/app/agenda/page.tsx', c);
