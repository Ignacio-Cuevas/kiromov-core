const fs = require('fs');

let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// 1. Update getPastelCardTheme
const newTheme = `function getPastelCardTheme(cita: any) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  
  if (['confirmada'].includes(estado)) {
    return {
      card: 'bg-emerald-50/90 border border-emerald-300/80 text-emerald-950 border-l-4 border-l-emerald-600 shadow-xs hover:shadow-md',
      dot: 'bg-emerald-500'
    };
  } else if (['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)) {
    return {
      card: 'bg-slate-100/90 border border-slate-300 text-slate-700 border-l-4 border-l-slate-500 shadow-xs hover:shadow-md',
      dot: 'bg-slate-500'
    };
  } else if (['no_asistio', 'no asistió', 'cancelada'].includes(estado)) {
    return {
      card: 'bg-rose-50/90 border border-rose-200 text-rose-900 border-l-4 border-l-rose-500 shadow-xs hover:shadow-md line-through opacity-80',
      dot: 'bg-rose-500'
    };
  }
  
  // Pendiente por defecto
  return {
    card: 'bg-amber-50/90 border border-amber-300/80 text-amber-950 border-l-4 border-l-amber-500 shadow-xs hover:shadow-md',
    dot: 'bg-amber-500'
  };
}`;
c = c.replace(/function getPastelCardTheme\([\s\S]*?return \{\n\s*card: \`bg-white[\s\S]*?\}\s*;\n\}/, newTheme);


// 2. Empty slots background based on working hours
// We look for:
// <div key={sIdx} className="absolute left-0 right-0 border-b border-slate-100/50 hover:bg-slate-50 transition-colors" ... onClick={() => onSelectEmptySlot(diaStr, slotTime)}>
const slotRegex = /className="([^"]*?hover:bg-slate-50[^"]*?)"\s*style=\{\{\s*top: \`\$\{topPx\}px\`,\s*height: \`\$\{HOUR_HEIGHT \/ 2\}px\`\s*\}\}\s*onClick=\{\(\) => onSelectEmptySlot\(diaStr, slotTime\)\}/g;

c = c.replace(slotRegex, (match, p1) => {
    return `className={\`\${isSlotInWorkingHours(dia, slotTime, semanaConfig) ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-100/75 border-slate-200/60 hover:bg-slate-100'} absolute left-0 right-0 border-b transition-colors\`}
                        style={{ top: \`\${topPx}px\`, height: \`\${HOUR_HEIGHT / 2}px\` }}
                        onClick={() => onSelectEmptySlot(diaStr, slotTime)}`;
});

// 3. Render Bloqueos in week view
// Search for `{citasDia.map((cita) => {` and insert bloqueos rendering right before it.
const bloqueosRender = `{/* CAPA: BLOQUEOS DE AGENDA */}
                  {bloqueos.filter(b => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr).map(b => {
                    const topPos = getTopPosition(b.hora_inicio || '08:00');
                    const duracionMin = getMinutesFrom8am(b.hora_fin || '09:00') - getMinutesFrom8am(b.hora_inicio || '08:00');
                    const heightPos = Math.max(38, (duracionMin / 60) * HOUR_HEIGHT);
                    
                    if (b.dia_completo) {
                       return (
                         <div key={b.id} className="absolute z-10 left-1 right-1 top-1 bottom-1 bg-slate-200/80 border border-slate-300 text-slate-700 rounded-lg flex flex-col items-center justify-center p-2 backdrop-blur-[2px]">
                           <Lock className="w-5 h-5 mb-1 opacity-50" />
                           <span className="text-xs font-bold text-center leading-tight">{b.titulo}</span>
                         </div>
                       );
                    }
                    
                    return (
                      <div
                        key={b.id}
                        className="absolute z-10 rounded-lg border border-slate-300 bg-slate-200/80 text-slate-700 p-2 flex flex-col items-start overflow-hidden shadow-xs backdrop-blur-[1px]"
                        style={{ top: \`\${topPos}px\`, height: \`\${heightPos}px\`, left: '2px', right: '2px' }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock className="w-3 h-3 shrink-0 opacity-60" />
                          <span className="text-[11px] font-bold truncate leading-tight">{b.titulo}</span>
                        </div>
                      </div>
                    );
                  })}
                  
`;

c = c.replace(/\{citasDia\.map\(\(cita\) => \{/, bloqueosRender + '{citasDia.map((cita) => {');

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
