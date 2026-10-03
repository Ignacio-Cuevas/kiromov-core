const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const btn = `                </button>
                <button
                  type="button"
                  onClick={() => setAbrirAssessmentModal(true)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>✨ Evaluación Asistida por IA</span>
                </button>`;

content = content.replace(/<span>\+ Nueva Evaluación TMO \(Reingreso\)<\/span>\s*<\/button>/, `<span>+ Nueva Evaluación TMO (Reingreso)</span>\n${btn}`);

// Also add it when there's NO evaluation
content = content.replace(/<span>\+ Registrar Primera Evaluación Inicial TMO<\/span>\s*<\/button>/, `<span>+ Registrar Primera Evaluación Inicial TMO</span>\n${btn}`);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
