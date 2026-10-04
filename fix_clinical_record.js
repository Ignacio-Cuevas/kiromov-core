const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

// 1. Remove InitialAssessmentModal import
content = content.replace(/import { InitialAssessmentModal } from "@\/components\/clinical\/InitialAssessmentModal";\n/, '');

// 2. Remove abrirAssessmentModal state
content = content.replace(/const \[abrirAssessmentModal, setAbrirAssessmentModal\] = useState\(false\);\n/, '');

// 3. Update the primary button text (around line 1264 and 1400)
content = content.replace(/<span>\+ Nueva Evaluación TMO \(Reingreso\)<\/span>/g, '<span>📋 Evaluación Inicial TMO</span>');
content = content.replace(/<span>\+ Registrar Primera Evaluación Inicial TMO<\/span>/g, '<span>📋 Evaluación Inicial TMO</span>');

// 4. Remove the secondary button
content = content.replace(/<button\s*type="button"\s*onClick=\{\(\) => setAbrirAssessmentModal\(true\)\}[\s\S]*?<\/button>/g, '');

// 5. Remove the extra InitialAssessmentModal render block
content = content.replace(/\{abrirAssessmentModal && paciente && \([\s\S]*?\}\)\n/, '');

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
