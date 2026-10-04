const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/InitialEvaluationModal.tsx', 'utf-8');

// 1. Add to initial form state
content = content.replace(
  /diagnostico_cif: evaluacionExistente\?\.diagnostico_cif \?\? '',/,
  "diagnostico_cif: evaluacionExistente?.diagnostico_cif ?? '',\n    diagnostico_apta: evaluacionExistente?.diagnostico_apta ?? '',"
);

// 2. Add to AI data extraction
content = content.replace(
  /diagnostico_cif: data\.diagnostico_cif,/,
  "diagnostico_cif: data.diagnostico_cif,\n          diagnostico_apta: data.diagnostico_apta,"
);

// 3. Add to UI layout
const aptaLayout = `              {/* Diagnóstico Funcional CIF */}
              <div>
                <label className="text-xs font-bold text-slate-700">Diagnóstico Kinésico Funcional (CIF)</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                  rows={3}
                  value={form.diagnostico_cif}
                  onChange={(e) => handleChange('diagnostico_cif', e.target.value)}
                />
              </div>

              {/* Diagnóstico APTA */}
              <div>
                <label className="text-xs font-bold text-slate-700">Diagnóstico del Sistema del Movimiento (APTA)</label>
                <textarea
                  className="w-full mt-1 p-2.5 border rounded-lg text-sm font-sans"
                  rows={2}
                  value={form.diagnostico_apta}
                  onChange={(e) => handleChange('diagnostico_apta', e.target.value)}
                />
              </div>`;
content = content.replace(/\{\/\* Diagnóstico Funcional CIF \*\/\}\s*<div>\s*<label[\s\S]*?<\/div>/, aptaLayout);

fs.writeFileSync('src/components/clinical/InitialEvaluationModal.tsx', content);
