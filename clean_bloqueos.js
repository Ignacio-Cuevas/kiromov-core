const fs = require('fs');

let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// The new injected bloqueos:
const injectedRegex = /\{\/\* CAPA: BLOQUEOS DE AGENDA \*\/\}.*?\}\)\}/s;
c = c.replace(injectedRegex, '');

// The old bloqueos block:
const oldBloqueosRegex = /\{\/\* CAPA 2: Bloqueos de Horario \*\/\}\s*\{bloqueosDia\.map\(\(b\) => \{[\s\S]*?<\/div>\s*\);\s*\}\)\}/;

const solidBloqueos = `{/* CAPA 2: Bloqueos de Horario */}\n                  {bloqueosDia.map((b) => {
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
                          <span className="text-xs font-bold truncate leading-tight">{b.titulo}</span>
                        </div>
                      </div>
                    );
                  })}`;

c = c.replace(oldBloqueosRegex, solidBloqueos);

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
