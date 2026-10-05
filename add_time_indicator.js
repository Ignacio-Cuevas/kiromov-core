const fs = require('fs');

let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// Inside dias.map((dia, diaIdx) => {
// We add isToday logic for the line.
const newCapaBloqueos = `
                  {/* CAPA 2: Bloqueos de Horario */}`;

const currentLineLogic = `
                  {/* INDICADOR DE HORA ACTUAL */}
                  {(() => {
                    const now = new Date();
                    const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    if (nowStr === diaStr) {
                      const h = now.getHours();
                      const m = now.getMinutes();
                      if (h >= START_HOUR && h <= END_HOUR) {
                        const topPos = ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
                        return (
                          <div className="absolute left-0 right-0 z-40 pointer-events-none" style={{ top: \`\${topPos}px\` }}>
                            <div className="relative">
                              <div className="absolute left-0 w-2 h-2 rounded-full bg-emerald-500 -translate-y-1/2 -translate-x-1 shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                              <div className="w-full border-t-2 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.2)]"></div>
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {/* CAPA 2: Bloqueos de Horario */}`;

c = c.replace(newCapaBloqueos, currentLineLogic);

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);

