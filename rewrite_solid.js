const fs = require('fs');

let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// 1. Update the Theme Function
const solidThemeCode = `function getPastelCardTheme(cita: any) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  
  if (['confirmada'].includes(estado)) {
    return {
      card: 'bg-emerald-600 hover:bg-emerald-700 text-white border-l-4 border-l-emerald-800 shadow-md',
      textPrimary: 'text-white',
      textSecondary: 'text-emerald-100/90',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-emerald-900/60 text-emerald-100',
      pillPayOk: 'bg-white text-emerald-900',
      pillPayDebt: 'bg-rose-500 text-white'
    };
  } else if (['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)) {
    return {
      card: 'bg-slate-700 hover:bg-slate-800 text-slate-100 border-l-4 border-l-slate-900 shadow-sm',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-300',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-slate-900/60 text-slate-200',
      pillPayOk: 'bg-emerald-500 text-white',
      pillPayDebt: 'bg-rose-500 text-white'
    };
  } else if (['no_asistio', 'no asistió', 'cancelada'].includes(estado)) {
    return {
      card: 'bg-rose-600 hover:bg-rose-700 text-white border-l-4 border-l-rose-800 shadow-sm opacity-90',
      textPrimary: 'text-white',
      textSecondary: 'text-rose-200',
      pillBg: 'bg-white/20 text-white',
      pillSession: 'bg-rose-900/60 text-rose-100',
      pillPayOk: 'bg-white/80 text-rose-900',
      pillPayDebt: 'bg-rose-900 text-rose-100'
    };
  }
  
  // Pendiente por defecto
  return {
    card: 'bg-amber-500 hover:bg-amber-600 text-white border-l-4 border-l-amber-700 shadow-md',
    textPrimary: 'text-white',
    textSecondary: 'text-amber-100/90',
    pillBg: 'bg-white/20 text-white',
    pillSession: 'bg-amber-900/60 text-amber-100',
    pillPayOk: 'bg-white text-amber-900',
    pillPayDebt: 'bg-rose-500 text-white'
  };
}`;
c = c.replace(/function getPastelCardTheme\([\s\S]*?return \{\n\s*card: 'bg-amber-50[\s\S]*?\}\s*;\n\}/, solidThemeCode);


// 2. Update empty slots
c = c.replace(/inWorkingHours \? 'bg-white hover:bg-emerald-50\/40' : 'bg-slate-100\/75 border-slate-200\/60 hover:bg-slate-100'/g, 
  "inWorkingHours ? 'bg-white hover:bg-emerald-50/40' : 'bg-orange-50/80 border-orange-100 hover:bg-orange-100/50'");


// 3. Update Bloqueos
const newBloqueosRegex = /\{bloqueos\.filter[\s\S]*?return \(\s*<div\s*key=\{b\.id\}\s*className="absolute z-10 rounded-lg border border-slate-300 bg-slate-200\/80 text-slate-700 p-2 flex flex-col items-start overflow-hidden shadow-xs backdrop-blur-\[1px\]"[\s\S]*?<\/div>\s*\);\s*\n\s*\}\)\}/;

const newBloqueos = `{bloqueos.filter(b => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr).map(b => {
                    const topPos = getTopPosition(b.hora_inicio || '08:00');
                    const duracionMin = getMinutesFrom8am(b.hora_fin || '09:00') - getMinutesFrom8am(b.hora_inicio || '08:00');
                    const heightPos = Math.max(38, (duracionMin / 60) * HOUR_HEIGHT);
                    
                    if (b.dia_completo) {
                       return (
                         <div key={b.id} className="absolute z-10 left-1 right-1 top-1 bottom-1 bg-orange-200/80 border-l-4 border-l-orange-500 border-y border-r border-orange-300 text-orange-950 rounded-xl flex flex-col items-center justify-center p-2 backdrop-blur-[2px]">
                           <Lock className="w-5 h-5 mb-1 opacity-70" />
                           <span className="text-xs font-bold text-center leading-tight">{b.titulo}</span>
                         </div>
                       );
                    }
                    
                    return (
                      <div
                        key={b.id}
                        className="absolute z-10 bg-orange-200/80 border-l-4 border-l-orange-500 border-y border-r border-orange-300 text-orange-950 rounded-xl p-2.5 shadow-xs overflow-hidden flex flex-col items-start backdrop-blur-[1px]"
                        style={{ top: \`\${topPos}px\`, height: \`\${heightPos}px\`, left: '2px', right: '2px' }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock className="w-3 h-3 shrink-0 opacity-80" />
                          <span className="text-[11px] font-bold truncate leading-tight">{b.titulo}</span>
                        </div>
                      </div>
                    );
                  })}`;
c = c.replace(newBloqueosRegex, newBloqueos);


// 4. Update Header Bubble
c = c.replace(/w-6 h-6 rounded-full text-xs font-black/g, 'w-8 h-8 rounded-full text-sm font-bold shadow-sm');
c = c.replace(/isToday \? 'bg-emerald-600 text-white' : 'text-slate-900'/g, "isToday ? 'bg-emerald-600 text-white' : 'text-slate-900'");


// 5. Update Citas map (the cards)
const cardRegex = /<div\s*key=\{cita\.id\}\s*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onSelectCita\(cita\);\s*\}\}\s*style=\{\{\s*top: \`\$\{topPos\}px\`,\s*height: \`\$\{heightPos\}px\`,\s*left: '3px',\s*right: '3px',\s*\}\}\s*className=\{\`absolute z-20 transition-all duration-150 cursor-pointer hover:scale-\[1\.01\] hover:z-30 overflow-hidden flex flex-col justify-between p-2 \$\{theme\.card\}\`\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}\)\}/;

const solidCard = `<div
                        key={cita.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCita(cita);
                        }}
                        style={{
                          top: \`\${topPos}px\`,
                          height: \`\${heightPos}px\`,
                          left: '3px',
                          right: '3px',
                        }}
                        className={\`absolute z-20 rounded-xl p-2.5 transition-all cursor-pointer hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between \${theme.card}\`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={\`text-xs font-mono font-bold \${theme.textSecondary}\`}>{horaInicio}</span>
                          </div>
                          <span className={\`text-sm font-bold tracking-tight leading-tight block \${theme.textPrimary}\`}>
                            {pacienteNombre}
                          </span>
                          <span className={\`text-[10px] truncate block mt-0.5 \${theme.textSecondary}\`} title={motivoTexto}>
                            {motivoTexto}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {p.prevision && (
                            <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-md \${theme.pillBg}\`}>
                              {p.prevision}
                            </span>
                          )}
                          {(p.total_sesiones || 0) > 0 && (
                            <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-md \${theme.pillSession}\`}>
                              {p.sesiones_usadas || 0}/{p.total_sesiones} ses.
                            </span>
                          )}
                          
                          {(() => {
                            const debePago = p.estado_pago === 'pendiente' && (p.valor_total || 0) > 0;
                            return debePago ? (
                              <span className={\`font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-xs \${theme.pillPayDebt}\`} title={\`Debe $\${p.valor_total}\`}>
                                🔴 Debe $\{(p.valor_total || 0).toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className={\`font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 \${theme.pillPayOk}\`}>
                                ✓ Pagado
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}`;

c = c.replace(cardRegex, solidCard);


// 6. Update Legends at bottom
c = c.replace(/<span className="w-3 h-3 rounded bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500" \/>/g, '<span className="w-3 h-3 rounded bg-amber-500 shadow-sm" />');
c = c.replace(/<span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-500" \/>/g, '<span className="w-3 h-3 rounded bg-emerald-600 shadow-sm" />');
c = c.replace(/<span className="w-3 h-3 rounded bg-blue-50 border border-blue-300 border-l-4 border-l-blue-500" \/>/g, '<span className="w-3 h-3 rounded bg-slate-700 shadow-sm" />');
c = c.replace(/<span className="w-3 h-3 rounded bg-rose-50 border border-rose-300 border-l-4 border-l-rose-500" \/>/g, '<span className="w-3 h-3 rounded bg-rose-600 shadow-sm opacity-90" />');

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
