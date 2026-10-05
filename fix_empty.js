const fs = require('fs');
let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

c = c.replace(/inWorkingHours\s*\?\s*'bg-white hover:bg-emerald-50\/60'\s*:\s*'bg-slate-50\/70 hover:bg-amber-50\/40'/g, 
  "inWorkingHours ? 'bg-white hover:bg-emerald-50/60' : 'bg-orange-50/80 hover:bg-orange-100/60'");

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
