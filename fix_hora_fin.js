const fs = require('fs');
let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

c = c.replace(/calcularHoraFin\(selectedCitaForPopover\.hora\?\.slice\(0, 5\) \|\| '00:00', selectedCitaForPopover\.duracion_minutos \|\| 45\)/, 
  "(() => { const [h,m] = (selectedCitaForPopover.hora || '00:00').split(':').map(Number); const d = new Date(); d.setHours(h); d.setMinutes(m + 45); return d.toTimeString().slice(0,5); })()");

fs.writeFileSync('src/app/agenda/page.tsx', c);
