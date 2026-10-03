const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const newSection = `
                {/* 4. Codificación AI Internacional */}
                {(evaluacionInicialTMO.cie10_codigo || evaluacionInicialTMO.cie11_codigo || evaluacionInicialTMO.diagnostico_cif) && (
                  <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      4. Codificación Clínica y Diagnóstico IA
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3 rounded shadow-sm border border-emerald-100">
                        <span className="font-extrabold text-emerald-700 block mb-1">CIE-10 (Fonasa)</span>
                        <p className="font-mono text-slate-800">{evaluacionInicialTMO.cie10_codigo || '-'}</p>
                        <p className="text-slate-600 mt-1">{evaluacionInicialTMO.cie10_glosa || '-'}</p>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm border border-emerald-100">
                        <span className="font-extrabold text-emerald-700 block mb-1">CIE-11 (OMS)</span>
                        <p className="font-mono text-slate-800">{evaluacionInicialTMO.cie11_codigo || '-'}</p>
                        <p className="text-slate-600 mt-1">{evaluacionInicialTMO.cie11_glosa || '-'}</p>
                      </div>
                      <div className="md:col-span-2 bg-white p-3 rounded shadow-sm border border-emerald-100">
                        <span className="font-extrabold text-emerald-700 block mb-1">Diagnóstico Funcional CIF</span>
                        <p className="text-slate-700">{evaluacionInicialTMO.diagnostico_cif || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
`;

content = content.replace(/<\/div>\n\s*<\/div>\n\s*\) : \(/, `  ${newSection}\n                </div>\n              </div>\n            ) : (`);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
