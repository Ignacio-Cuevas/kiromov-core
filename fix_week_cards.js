const fs = require('fs');

let c = fs.readFileSync('src/components/agenda/ClinicalTimeGrid.tsx', 'utf-8');

// 1. Update theme function
const newThemeFunc = `function getPastelCardTheme(cita: any) {
  const estado = String(cita?.estado || 'pendiente').toLowerCase();
  
  let borderColor = 'border-l-slate-400';
  if (['confirmada'].includes(estado)) borderColor = 'border-l-emerald-500';
  else if (['pendiente'].includes(estado)) borderColor = 'border-l-amber-500';
  else if (['asistio', 'asistió', 'atendida', 'atendido'].includes(estado)) borderColor = 'border-l-slate-400';
  else if (['no_asistio', 'no asistió', 'cancelada'].includes(estado)) borderColor = 'border-l-rose-500';

  return {
    card: \`bg-white shadow-xs border-y border-r border-slate-200/80 border-l-4 \${borderColor} rounded-lg text-slate-900 hover:shadow-md\`,
    dot: borderColor.replace('border-l-', 'bg-')
  };
}`;

const themeRegex = /function getPastelCardTheme\([\s\S]*?return \{\n    card: 'bg-amber-50[\s\S]*?dot: 'bg-amber-500'\n  \};\n\}/;
c = c.replace(themeRegex, newThemeFunc);

// 2. Update rendering logic inside mapping
// We need to add the payment pill.
// Inside `citasDia.map((cita) => {`
const renderCardRegex = /<div\s+key=\{cita\.id\}[\s\S]*?<div className="min-w-0">[\s\S]*?<\/div>\s*<\/div>/;

const newRenderCard = `<div
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
                        className={\`absolute z-20 transition-all duration-150 cursor-pointer hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between p-2 \${theme.card}\`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-tight line-clamp-2" title={pacienteNombre}>
                            {pacienteNombre}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5 border-t border-slate-100 mt-1">
                          <span>{horaInicio}</span>
                          {(() => {
                            const pData = cita.paciente || cita.pacientes || {};
                            const debePago = pData.estado_pago === 'pendiente' && (pData.valor_total || 0) > 0;
                            return debePago ? (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-100" title={\`Debe $\${pData.valor_total}\`}>$</span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">✓</span>
                            );
                          })()}
                        </div>
                      </div>`;

c = c.replace(renderCardRegex, newRenderCard);

fs.writeFileSync('src/components/agenda/ClinicalTimeGrid.tsx', c);

