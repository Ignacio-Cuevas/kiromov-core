const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const aptaDisplay = `                      <div className="md:col-span-2 bg-white p-3 rounded shadow-sm border border-emerald-100">
                        <span className="font-extrabold text-emerald-700 block mb-1">Diagnóstico Funcional CIF</span>
                        <p className="text-slate-700">{evaluacionInicialTMO?.diagnostico_cif || '-'}</p>
                      </div>
                      
                      {evaluacionInicialTMO?.diagnostico_apta && (
                        <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <span className="text-xs font-extrabold uppercase text-blue-900 block mb-1">Diagnóstico Kinésico APTA:</span>
                          <p className="text-sm text-blue-950">{evaluacionInicialTMO.diagnostico_apta}</p>
                        </div>
                      )}`;
content = content.replace(/<div className="md:col-span-2 bg-white p-3 rounded shadow-sm border border-emerald-100">\s*<span className="font-extrabold text-emerald-700 block mb-1">Diagnóstico Funcional CIF<\/span>\s*<p className="text-slate-700">\{evaluacionInicialTMO\?\.diagnostico_cif \|\| '-'}<\/p>\s*<\/div>/, aptaDisplay);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
