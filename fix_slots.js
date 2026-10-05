const fs = require('fs');
let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

c = c.replace(/inWorkingHours\s*\?\s*'bg-transparent hover:bg-emerald-50\/40'\s*:\s*'bg-slate-50 hover:bg-slate-100\/50'/g, 
  "inWorkingHours ? 'bg-white hover:bg-emerald-50/40' : 'bg-slate-100/75 border-slate-200/60 hover:bg-slate-200/50'");

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
