const fs = require('fs');
let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// The card regex inside rewrite_solid.js:
const oldCard = /<div\s*key=\{cita\.id\}\s*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onSelectCita\(cita\);\s*\}\}\s*style=\{\{\s*top: \`\$\{topPos\}px\`,\s*height: \`\$\{heightPos\}px\`,\s*left: '3px',\s*right: '3px',\s*\}\}\s*className=\{\`absolute z-20 rounded-xl p-2.5 transition-all cursor-pointer hover:scale-\[1\.01\] hover:z-30 overflow-hidden flex flex-col justify-between \$\{theme\.card\}\`\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}\)\}/;

const newCard = `<div
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
                        className={\`absolute z-20 rounded-lg p-1.5 px-2 transition-all cursor-pointer hover:brightness-110 hover:shadow-lg active:scale-[0.98] overflow-hidden flex flex-col \${theme.card}\`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={\`text-[10px] font-mono font-bold opacity-90 block mb-0.5 \${theme.textSecondary}\`}>{horaInicio} - {horaFin}</span>
                          <span className={\`text-xs font-bold leading-tight truncate block \${theme.textPrimary}\`}>
                            {pacienteNombre}
                          </span>
                          <span className={\`text-[10px] opacity-80 truncate block mt-0.5 \${theme.textSecondary}\`} title={motivoTexto}>
                            {motivoTexto}
                          </span>
                        </div>
                      </div>
                    );
                  })}`;

c = c.replace(oldCard, newCard);

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);
