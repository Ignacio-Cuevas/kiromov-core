const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldBadge1 = `                      pctMejoria >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                    }\`}>
                      {pctMejoria >= 0 ? \`-\${pctMejoria}% dolor\` : \`+\${Math.abs(pctMejoria)}% dolor\`}`;

const newBadge1 = `                      pctMejoria > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : pctMejoria === 0 ? 'text-slate-600 bg-slate-100 border-slate-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                    }\`}>
                      {pctMejoria > 0 ? \`-\${pctMejoria}% reducción de dolor\` : pctMejoria === 0 ? '0% variación (sintomatología estable)' : \`+\${Math.abs(pctMejoria)}% aumento de dolor\`}`;

content = content.replace(oldBadge1, newBadge1);

const oldBadge2 = `                        <span className="font-semibold text-slate-700">
                          {pctMejoria >= 0 ? \`-\${pctMejoria}% dolor\` : \`+\${Math.abs(pctMejoria)}%\`}
                        </span>`;

const newBadge2 = `                        <span className="font-semibold text-slate-700">
                          {pctMejoria > 0 ? \`-\${pctMejoria}% dolor\` : pctMejoria === 0 ? 'Estable' : \`+\${Math.abs(pctMejoria)}%\`}
                        </span>`;

content = content.replace(oldBadge2, newBadge2);

fs.writeFileSync(file, content);
console.log('Fixed badges');
